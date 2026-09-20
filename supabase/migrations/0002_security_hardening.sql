-- Harden helper functions and the reconciliation view flagged by the
-- Supabase security linter after 0001_init.sql was applied.

create or replace function auth_role() returns user_role
language sql stable security invoker set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_department() returns uuid
language sql stable security invoker set search_path = public as $$
  select department_id from profiles where id = auth.uid()
$$;

create or replace function is_hr() returns boolean
language sql stable security invoker set search_path = public as $$
  select auth_role() in ('hr_admin', 'hr_officer')
$$;

revoke execute on function write_audit_log(text, uuid, audit_action, jsonb, jsonb, text) from public, anon, authenticated;
revoke execute on function audit_daily_headcount() from public, anon, authenticated;
revoke execute on function guard_approved_attendance() from public, anon, authenticated;

drop view if exists daily_reconciliation;
create view daily_reconciliation with (security_invoker = true) as
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
