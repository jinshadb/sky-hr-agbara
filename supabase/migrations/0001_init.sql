-- Sky HR Attendance, Canteen & Payroll — initial schema
-- Standalone database. Not related to any other application's schema.

create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
create type user_role as enum (
  'hr_admin', 'hr_officer', 'canteen_user', 'department_head', 'payroll_user', 'management'
);
create type employee_status as enum ('active', 'inactive');
create type attendance_status as enum ('present', 'absent', 'half_day');
create type approved_status as enum ('present', 'absent', 'leave', 'half_day');
create type headcount_status as enum ('pending', 'approved');
create type correction_type as enum ('add_present', 'mark_absent', 'mark_leave');
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snacks');
create type ticket_status as enum ('active', 'closed', 'cancelled');
create type serve_method as enum ('qr', 'manual_search');
create type leave_type as enum ('paid', 'unpaid');
create type leave_status as enum ('pending', 'approved', 'rejected');
create type payroll_period_status as enum ('open', 'generated', 'exported', 'locked');
create type upload_status as enum ('processing', 'completed', 'failed');
create type audit_action as enum ('insert', 'update', 'delete', 'approve', 'reopen');

-- ============================================================================
-- REFERENCE DATA
-- ============================================================================
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- EMPLOYEE MASTER
-- ============================================================================
create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null unique,
  biometric_id text unique,
  name text not null,
  department_id uuid references departments(id),
  section text,
  designation text,
  shift_id uuid references shifts(id),
  payroll_id text,
  status employee_status not null default 'active',
  canteen_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_employees_department on employees(department_id);
create index idx_employees_status on employees(status);
create index idx_employees_biometric_id on employees(biometric_id);

-- ============================================================================
-- AUTH / PROFILES
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  department_id uuid references departments(id),
  employee_id uuid references employees(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- helper used throughout RLS policies
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_department() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = auth.uid()
$$;

create or replace function is_hr() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() in ('hr_admin', 'hr_officer')
$$;

-- ============================================================================
-- BIOMETRIC INTAKE
-- ============================================================================
create table biometric_uploads (
  id uuid primary key default gen_random_uuid(),
  upload_date date not null default current_date,
  file_name text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now(),
  total_rows int not null default 0,
  matched_rows int not null default 0,
  unmatched_rows int not null default 0,
  duplicate_rows int not null default 0,
  status upload_status not null default 'processing'
);

create table biometric_records (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references biometric_uploads(id) on delete cascade,
  biometric_id_raw text not null,
  name_raw text,
  employee_id uuid references employees(id),
  work_date date not null,
  first_in time,
  last_out time,
  hours_worked numeric(5,2),
  is_duplicate boolean not null default false,
  is_unknown boolean not null default false,
  exception_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_biometric_records_upload on biometric_records(upload_id);
create index idx_biometric_records_employee_date on biometric_records(employee_id, work_date);

create table daily_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  work_date date not null,
  department_id uuid references departments(id),
  shift_id uuid references shifts(id),
  biometric_status attendance_status not null,
  hours_worked numeric(5,2),
  source_upload_id uuid references biometric_uploads(id),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index idx_daily_attendance_date on daily_attendance(work_date);
create index idx_daily_attendance_dept on daily_attendance(department_id, work_date);

-- ============================================================================
-- HEADCOUNT VERIFICATION & APPROVAL
-- ============================================================================
create table daily_headcount (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  department_id uuid not null references departments(id),
  shift_id uuid not null references shifts(id),
  biometric_headcount int not null default 0,
  verified_headcount int,
  difference int generated always as (coalesce(verified_headcount, 0) - biometric_headcount) stored,
  reason text,
  status headcount_status not null default 'pending',
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (work_date, department_id, shift_id)
);
create index idx_daily_headcount_date on daily_headcount(work_date);

create table headcount_corrections (
  id uuid primary key default gen_random_uuid(),
  headcount_id uuid not null references daily_headcount(id) on delete cascade,
  employee_id uuid not null references employees(id),
  correction_type correction_type not null,
  reason text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table approved_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  work_date date not null,
  department_id uuid references departments(id),
  shift_id uuid references shifts(id),
  status approved_status not null,
  hours_worked numeric(5,2),
  ot_hours numeric(5,2) not null default 0,
  locked boolean not null default true,
  headcount_id uuid references daily_headcount(id),
  approved_by uuid references profiles(id),
  approved_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index idx_approved_attendance_date on approved_attendance(work_date);
create index idx_approved_attendance_dept on approved_attendance(department_id, work_date);

-- ============================================================================
-- DIGITAL CANTEEN
-- ============================================================================
create table canteen_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  work_date date not null,
  department_id uuid references departments(id), -- null = all departments
  shift_id uuid references shifts(id),
  meal_type meal_type not null,
  authorized_headcount int not null default 0,
  approved_by uuid references profiles(id),
  approved_at timestamptz not null default now(),
  qr_code_data text not null,
  status ticket_status not null default 'active',
  created_at timestamptz not null default now()
);
create index idx_canteen_tickets_date on canteen_tickets(work_date);

create table ticket_eligible_employees (
  ticket_id uuid not null references canteen_tickets(id) on delete cascade,
  employee_id uuid not null references employees(id),
  primary key (ticket_id, employee_id)
);

create table meal_records (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references canteen_tickets(id) on delete cascade,
  employee_id uuid not null references employees(id),
  served_at timestamptz not null default now(),
  served_by uuid references profiles(id),
  method serve_method not null,
  unique (ticket_id, employee_id)
);
create index idx_meal_records_ticket on meal_records(ticket_id);

-- reconciliation: computed view, no duplicate storage
create view daily_reconciliation as
select
  t.id as ticket_id,
  t.ticket_number,
  t.work_date,
  t.department_id,
  d.name as department_name,
  t.shift_id,
  t.meal_type,
  t.authorized_headcount as authorized,
  count(m.id) as served,
  t.authorized_headcount - count(m.id) as balance,
  count(m.id) - t.authorized_headcount as variance,
  case when t.authorized_headcount > 0
    then round(100.0 * count(m.id) / t.authorized_headcount, 1)
    else 0 end as utilization_pct,
  t.status
from canteen_tickets t
left join meal_records m on m.ticket_id = t.id
left join departments d on d.id = t.department_id
group by t.id, d.name;

-- ============================================================================
-- LEAVE & PAYROLL
-- ============================================================================
create table leave_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  date_from date not null,
  date_to date not null,
  leave_type leave_type not null,
  status leave_status not null default 'pending',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

create table payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null,
  status payroll_period_status not null default 'open',
  generated_by uuid references profiles(id),
  generated_at timestamptz,
  unique (period_month, period_year)
);

create table payroll_attendance_summary (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  employee_id uuid not null references employees(id),
  present_days numeric(5,1) not null default 0,
  absent_days numeric(5,1) not null default 0,
  leave_paid_days numeric(5,1) not null default 0,
  leave_unpaid_days numeric(5,1) not null default 0,
  half_days numeric(5,1) not null default 0,
  paid_days numeric(5,1) not null default 0,
  unpaid_days numeric(5,1) not null default 0,
  ot_hours numeric(6,2) not null default 0,
  deduction_days numeric(5,1) not null default 0,
  unique (payroll_period_id, employee_id)
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  user_id uuid references profiles(id),
  action audit_action not null,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index idx_audit_log_table on audit_log(table_name, record_id);

create or replace function write_audit_log(
  p_table text, p_record_id uuid, p_action audit_action,
  p_old jsonb, p_new jsonb, p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (table_name, record_id, user_id, action, old_value, new_value, reason)
  values (p_table, p_record_id, auth.uid(), p_action, p_old, p_new, p_reason);
end;
$$;

-- audit trigger for headcount approval
create or replace function audit_daily_headcount() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'approved') then
    perform write_audit_log('daily_headcount', new.id, 'approve', to_jsonb(old), to_jsonb(new), new.reason);
  elsif (tg_op = 'UPDATE') then
    perform write_audit_log('daily_headcount', new.id, 'update', to_jsonb(old), to_jsonb(new), new.reason);
  end if;
  return new;
end;
$$;
create trigger trg_audit_daily_headcount
  after update on daily_headcount
  for each row execute function audit_daily_headcount();

-- prevent editing locked approved_attendance except via reopen()
create or replace function guard_approved_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.locked and auth_role() <> 'hr_admin' then
    raise exception 'approved_attendance is locked; only HR Admin may reopen it';
  end if;
  perform write_audit_log('approved_attendance', new.id, 'update', to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;
create trigger trg_guard_approved_attendance
  before update on approved_attendance
  for each row execute function guard_approved_attendance();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table departments enable row level security;
alter table shifts enable row level security;
alter table employees enable row level security;
alter table profiles enable row level security;
alter table biometric_uploads enable row level security;
alter table biometric_records enable row level security;
alter table daily_attendance enable row level security;
alter table daily_headcount enable row level security;
alter table headcount_corrections enable row level security;
alter table approved_attendance enable row level security;
alter table canteen_tickets enable row level security;
alter table ticket_eligible_employees enable row level security;
alter table meal_records enable row level security;
alter table leave_entries enable row level security;
alter table payroll_periods enable row level security;
alter table payroll_attendance_summary enable row level security;
alter table audit_log enable row level security;

-- Reference data: readable by all authenticated users, writable by hr_admin
create policy "ref read" on departments for select using (auth.uid() is not null);
create policy "ref write" on departments for all using (auth_role() = 'hr_admin') with check (auth_role() = 'hr_admin');
create policy "shift read" on shifts for select using (auth.uid() is not null);
create policy "shift write" on shifts for all using (auth_role() = 'hr_admin') with check (auth_role() = 'hr_admin');

-- profiles: everyone can read their own; hr_admin reads/writes all
create policy "profile self read" on profiles for select using (id = auth.uid() or auth_role() = 'hr_admin');
create policy "profile admin write" on profiles for insert with check (auth_role() = 'hr_admin');
create policy "profile admin update" on profiles for update using (auth_role() = 'hr_admin');

-- employees: HR full access; everyone else read-only (dept head scoped to own dept)
create policy "employees hr all" on employees for all
  using (is_hr()) with check (is_hr());
create policy "employees read scoped" on employees for select using (
  auth_role() in ('management', 'payroll_user', 'canteen_user')
  or (auth_role() = 'department_head' and department_id = auth_department())
);

-- biometric upload/records: HR only
create policy "biometric hr all" on biometric_uploads for all using (is_hr()) with check (is_hr());
create policy "biometric records hr all" on biometric_records for all using (is_hr()) with check (is_hr());

-- daily_attendance: HR full; dept head / management read scoped
create policy "daily_attendance hr all" on daily_attendance for all using (is_hr()) with check (is_hr());
create policy "daily_attendance read scoped" on daily_attendance for select using (
  auth_role() = 'management'
  or (auth_role() = 'department_head' and department_id = auth_department())
);

-- daily_headcount: HR verifies/approves; dept head reads + adds reason context on own dept
create policy "headcount hr all" on daily_headcount for all using (is_hr()) with check (is_hr());
create policy "headcount dept read" on daily_headcount for select using (
  auth_role() = 'department_head' and department_id = auth_department()
  or auth_role() = 'management'
);
create policy "headcount corrections hr all" on headcount_corrections for all using (is_hr()) with check (is_hr());

-- approved_attendance: HR writes (via server action honoring the lock trigger); scoped reads
create policy "approved_attendance hr all" on approved_attendance for all using (is_hr()) with check (is_hr());
create policy "approved_attendance read scoped" on approved_attendance for select using (
  auth_role() in ('management', 'payroll_user')
  or (auth_role() = 'department_head' and department_id = auth_department())
);

-- canteen tickets: HR manages; canteen_user reads active tickets and eligible list
create policy "tickets hr all" on canteen_tickets for all using (is_hr()) with check (is_hr());
create policy "tickets canteen read" on canteen_tickets for select using (
  auth_role() in ('canteen_user', 'management')
);
create policy "eligible hr all" on ticket_eligible_employees for all using (is_hr()) with check (is_hr());
create policy "eligible canteen read" on ticket_eligible_employees for select using (
  auth_role() in ('canteen_user', 'management')
);

-- meal_records: canteen_user can insert (serve) and read; HR full; no update/delete for canteen_user (audit integrity)
create policy "meals hr all" on meal_records for all using (is_hr()) with check (is_hr());
create policy "meals canteen read" on meal_records for select using (
  auth_role() in ('canteen_user', 'management')
);
create policy "meals canteen insert" on meal_records for insert with check (
  auth_role() = 'canteen_user' and served_by = auth.uid()
);

-- leave entries: HR + department_head manage own dept; employees' own not exposed to self-service in v1
create policy "leave hr all" on leave_entries for all using (is_hr()) with check (is_hr());
create policy "leave dept manage" on leave_entries for all using (
  auth_role() = 'department_head'
  and employee_id in (select id from employees where department_id = auth_department())
) with check (
  auth_role() = 'department_head'
  and employee_id in (select id from employees where department_id = auth_department())
);

-- payroll: payroll_user + hr_admin
create policy "payroll periods rw" on payroll_periods for all using (
  auth_role() in ('hr_admin', 'payroll_user')
) with check (auth_role() in ('hr_admin', 'payroll_user'));
create policy "payroll summary rw" on payroll_attendance_summary for all using (
  auth_role() in ('hr_admin', 'payroll_user')
) with check (auth_role() in ('hr_admin', 'payroll_user'));

-- audit log: hr_admin only
create policy "audit admin read" on audit_log for select using (auth_role() = 'hr_admin');

-- ============================================================================
-- SEED: default reference data (edit to match your organization)
-- ============================================================================
insert into departments (name) values ('Production'), ('Quality'), ('Maintenance'), ('Warehouse'), ('Admin')
  on conflict do nothing;
insert into shifts (name, start_time, end_time) values
  ('Day', '08:00', '17:00'), ('Night', '20:00', '05:00')
  on conflict do nothing;
