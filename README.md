# Sky HR — Attendance, Headcount, Canteen & Payroll

Standalone application. Separate Supabase project, separate GitHub repository,
separate authentication and data storage from any other system. Design
details (schema, workflow, screens, roles) are in `docs/DESIGN.md`.

Stack: Next.js 14 (App Router, TypeScript) + Supabase (Postgres/Auth) + Tailwind CSS.

## 1. Create the Supabase project 

1. Create a new, empty Supabase project (a separate project — do not reuse an
   existing one).
2. In the SQL editor, run `supabase/migrations/0001_init.sql` once. This
   creates every table, the roles enum, RLS policies, audit triggers, and
   seeds a starter set of departments/shifts (edit the seed at the bottom of
   the file to match your organization before running, or edit the
   `departments`/`shifts` tables afterward).
3. Copy the Project URL, anon public key, and service_role key from
   Project Settings → API.

## 2. Configure environment variables

```
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` (the last one is server-only — used for inviting
users — never exposed to the browser).

## 3. Create the first HR Admin user

The app has no public sign-up — accounts are created by an HR Admin from the
Users & Roles screen, which needs one HR Admin to already exist. Bootstrap it
once, from the Supabase SQL editor / Auth panel:

1. Auth → Users → Add user (set an email + password, or use "invite").
2. In the SQL editor:
   ```sql
   insert into profiles (id, full_name, role, active)
   values ('<the auth user's UUID from step 1>', 'Your Name', 'hr_admin', true);
   ```
3. Log in with that account — you can now invite everyone else from
   **Users & Roles** with the right role per person.

## 4. Install and run

```
npm install
npm run dev
```

## 5. Deploy

Push this repository to your new GitHub repo, then import it into Vercel (or
any Next.js host) and set the same three environment variables there.

```
npm run build
```

## Regenerating types (optional but recommended)

`lib/database.types.ts` is a placeholder. Once the project exists:

```
npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
```

## Workflow this app enforces

```
Biometric Excel/CSV upload
  -> automatic matching, duplicate/unknown detection, daily headcount
     -> HR enters only the physical-verification difference + reason
        -> Approve -> attendance locked (approved_attendance)
           -> Canteen tickets auto-generated (QR) from the approved list
              -> Canteen scans/searches Employee ID, marks meal served
                 -> Daily reconciliation computed automatically
                    -> Month end: payroll attendance computed automatically, export CSV
```

Nothing in this chain is re-typed by hand — every later step reads the
previous step's approved record.
