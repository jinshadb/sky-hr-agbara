# Sky HR Attendance, Canteen & Payroll System — Design Document

Standalone application. Separate GitHub repository, separate Supabase project, separate authentication and data store from the existing Sky Reports app. No shared database, no shared code.

Stack: Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Storage) + Tailwind CSS. Deployable to Vercel. Mobile-friendly throughout (canteen scanning screen is designed camera-first for phones/tablets).

## 1. Core principle: single flow, zero re-entry

```
Biometric Excel/CSV
   -> Upload (HR)
      -> Auto headcount + auto daily attendance (system)
         -> Physical verification: HR enters only the DIFFERENCE + reason
            -> APPROVE (HR) -> attendance record LOCKED
               -> Canteen ticket auto-generated from approved headcount
                  -> Canteen scans/searches Employee ID, marks meal served
                     -> Daily reconciliation auto-calculated
                        -> Month end: payroll attendance auto-calculated
                           -> Excel/CSV export for existing payroll process
```

Every downstream table stores a foreign key back to the approved attendance record — nothing is retyped.

## 2. Database structure (Postgres / Supabase)

### 2.1 Reference / master data

**departments**
`id, name, active`

**shifts**
`id, name, start_time, end_time, active`

**employees** (the single master, Employee ID is the system-wide key)
```
id (uuid, pk)
employee_id (text, unique, NOT NULL)      -- the identifier used everywhere downstream
biometric_id (text, unique)                -- id as it appears in the biometric machine export
name
department_id -> departments
section (text)
designation (text)
shift_id -> shifts
payroll_id (text)                          -- id used by the existing payroll process
status (active | inactive)
canteen_eligible (boolean, default true)
created_at, updated_at
```

### 2.2 Auth & roles

Supabase Auth handles login. A `profiles` table extends `auth.users`:
```
profiles
  id (uuid, pk = auth.users.id)
  full_name
  role  enum: hr_admin | hr_officer | canteen_user | department_head | payroll_user | management
  department_id -> departments   (scopes department_head to their department; null for others)
  employee_id -> employees       (optional link, e.g. a department head who is also an employee)
  active boolean
```
Row Level Security policies key off `profiles.role` (and `profiles.department_id` for department heads) — see §5.

### 2.3 Biometric attendance intake

**biometric_uploads**
`id, upload_date, file_name, uploaded_by -> profiles, uploaded_at, total_rows, matched_rows, unmatched_rows, duplicate_rows, status (processing|completed|failed)`

**biometric_records** (raw rows from the file, one per punch/day per employee after parsing)
```
id, upload_id -> biometric_uploads
biometric_id_raw, name_raw               -- exactly as in the file, for traceability
employee_id -> employees (nullable)       -- null = unmatched/unknown employee
work_date
first_in, last_out
hours_worked
is_duplicate boolean
is_unknown boolean
exception_flags (jsonb)                   -- e.g. {"missing_punch": true}
```

**daily_attendance** (system-computed, one row per employee per date — this is the "automatic headcount")
```
id, employee_id -> employees, work_date
department_id, shift_id                   -- snapshot at the time, for stable historical reporting
biometric_status  enum: present | absent | half_day
hours_worked
source_upload_id -> biometric_uploads
```

### 2.4 Headcount verification & approval

**daily_headcount** (one row per department + shift + date — the screen shown to HR)
```
id, work_date, department_id -> departments, shift_id -> shifts
biometric_headcount int                   -- auto count from daily_attendance
verified_headcount int                    -- HR enters after physical check
difference int  (generated: verified_headcount - biometric_headcount)
reason text
status enum: pending | approved
verified_by -> profiles, verified_at
approved_by -> profiles, approved_at
```

**headcount_corrections** (optional per-employee detail behind a difference, for audit clarity)
```
id, headcount_id -> daily_headcount, employee_id -> employees
correction_type enum: add_present | mark_absent | mark_leave
reason
created_by -> profiles, created_at
```

**approved_attendance** (the official, LOCKED daily attendance record — single source of truth for everything downstream)
```
id, employee_id -> employees, work_date
department_id, shift_id
status enum: present | absent | leave | half_day
hours_worked, ot_hours
locked boolean default true
approved_by -> profiles, approved_at
headcount_id -> daily_headcount
```

### 2.5 Digital canteen

**canteen_tickets**
```
id, ticket_number (text, unique, e.g. CT-20260908-PRD-D-L)
work_date, department_id (nullable = all departments), shift_id, meal_type enum: breakfast|lunch|dinner|snacks
authorized_headcount int                  -- from approved_attendance count
approved_by -> profiles, approved_at
qr_code_data text                         -- encoded ticket_number, verifiable
status enum: active | closed | cancelled
```

**ticket_eligible_employees** (auto-populated: approved + canteen_eligible employees for that ticket's scope)
`ticket_id -> canteen_tickets, employee_id -> employees`  (composite pk)

**meal_records**
```
id, ticket_id -> canteen_tickets, employee_id -> employees
served_at, served_by -> profiles
method enum: qr | manual_search
UNIQUE (ticket_id, employee_id)            -- hard stop on double-claiming a meal
```

### 2.6 Reconciliation

No extra table needed — `daily_reconciliation` is a SQL view:
`authorized = ticket.authorized_headcount`, `served = count(meal_records)`, `balance = authorized - served`, `variance = served - authorized`, `utilization % = served/authorized*100`, grouped by ticket.

### 2.7 Payroll

**leave_entries**
`id, employee_id -> employees, date_from, date_to, leave_type (paid|unpaid), approved_by, status`

**payroll_periods**
`id, period_month, period_year, status (open|generated|exported|locked), generated_by, generated_at`

**payroll_attendance_summary**
```
id, payroll_period_id -> payroll_periods, employee_id -> employees
present_days, absent_days, leave_paid_days, leave_unpaid_days, half_days
paid_days, unpaid_days, ot_hours, deduction_days
```
Generated entirely from `approved_attendance` + `leave_entries` — HR never re-types attendance for payroll.

### 2.8 Audit & security

**audit_log**
`id, table_name, record_id, user_id -> profiles, action (insert|update|delete|approve), old_value jsonb, new_value jsonb, reason, created_at`

Triggers on `daily_headcount` (on approve), `approved_attendance`, `employees`, and `canteen_tickets` write to `audit_log` automatically. Once `approved_attendance.locked = true`, row-level security blocks UPDATE/DELETE for every role except `hr_admin`, and even then only via a "reopen with reason" function that logs the override.

## 3. Screens (by module)

1. **Login** — Supabase Auth (email + password), role-based redirect.
2. **Employee Master** — searchable/filterable table, add/edit, CSV import with validation preview, active/inactive toggle.
3. **Biometric Upload** — drag-drop Excel/CSV, parse preview (matched / unmatched / duplicate counts), confirm & commit.
4. **Headcount Verification** — table of department x shift rows: Biometric | Verified (editable) | Difference | Reason. Optional "view employees" drill-down to flag specific corrections. Submit -> Approve (separate action, role-gated).
5. **Approved Attendance** (read view) — locked daily register, filterable by date/department, export.
6. **Canteen Tickets** — auto-generated list per date/shift/meal; ticket detail shows QR, authorized headcount, eligible employee list, status.
7. **Canteen Scan (mobile-first)** — big camera viewfinder for QR, fallback manual Employee ID search box, live authorized/served/balance counters, "already served" warning, close-ticket button.
8. **Daily Reconciliation** — table + chart per ticket: authorized, served, balance, variance, utilization %.
9. **Payroll Attendance** — generate period, review summary grid per employee, export Excel/CSV.
10. **Dashboards** — HR (today's headcount, present/absent/leave, department/shift manpower, exceptions), Canteen (authorized/served/balance/variance, consumption by employee), Management (trends, absenteeism, OT, canteen consumption) — each scoped by RLS to what that role may see.
11. **Users & Roles** (HR Admin only) — invite users, assign role, assign department (for department heads).
12. **Audit Log** (HR Admin only) — filterable history of changes/approvals.

## 4. User roles

| Role | Access |
|---|---|
| HR Admin | Everything, including user management and audit log |
| HR Officer | Employee master, biometric upload, headcount verification, approval, dashboards |
| Canteen User | Canteen module only (today's ticket, scan, serve, close) |
| Department Head | Read + correction-input for their own department's attendance; dashboard scoped to their department |
| Payroll User | Approved attendance (read-only) + payroll generation/export |
| Management | Dashboards only, read-only, all departments |

## 5. Security model

- Supabase Auth for login; `profiles.role` drives a Postgres RLS policy per table (e.g. canteen_user can `SELECT`/`INSERT` only on `canteen_tickets` (read), `meal_records` (insert), nothing else; department_head's policies filter `WHERE department_id = profile.department_id`).
- `approved_attendance` and `daily_headcount` (once approved) are immutable to everyone except a logged, reasoned reopen by `hr_admin`.
- Every approval, correction, and reopen writes to `audit_log` via trigger (user, timestamp, old value, new value, reason) — nothing relies on the app layer to log honestly.
- Duplicate meal claims are blocked at the database level (`UNIQUE (ticket_id, employee_id)` on `meal_records`), not just in the UI.

## 6. Implementation plan

| Phase | Deliverable |
|---|---|
| 0 | Provision: new Supabase project, new GitHub repo, environment variables |
| 1 | Postgres schema + RLS policies + seed roles/departments/shifts (this doc -> SQL migration) |
| 2 | Employee Master module (CRUD + CSV import) |
| 3 | Biometric upload & parsing engine (matching, duplicate/unknown detection, daily_attendance computation) |
| 4 | Headcount verification & approval workflow (locks attendance) |
| 5 | Digital canteen ticket auto-generation + QR |
| 6 | Canteen scan app (camera QR + manual search), meal marking, ticket close, duplicate-claim prevention |
| 7 | Daily reconciliation report |
| 8 | Monthly payroll attendance calculation + Excel/CSV export |
| 9 | Dashboards (HR / Canteen / Management) |
| 10 | Audit logging, locking, role-based access hardening |
| 11 | Deployment (Vercel) + handover instructions |

Phases 1–9 are being built now as a working codebase. Phase 0 and final deployment need two things from you (see message): a new Supabase project's connection details, and a new GitHub repository to push to.
