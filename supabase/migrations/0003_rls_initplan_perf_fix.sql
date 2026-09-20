-- Wrap auth.uid() calls in (select ...) so Postgres evaluates them once per
-- query instead of once per row (Supabase-recommended RLS performance pattern).
drop policy "ref read" on departments;
create policy "ref read" on departments for select using ((select auth.uid()) is not null);

drop policy "shift read" on shifts;
create policy "shift read" on shifts for select using ((select auth.uid()) is not null);

drop policy "profile self read" on profiles;
create policy "profile self read" on profiles for select using (id = (select auth.uid()) or auth_role() = 'hr_admin');

drop policy "meals canteen insert" on meal_records;
create policy "meals canteen insert" on meal_records for insert with check (
  auth_role() = 'canteen_user' and served_by = (select auth.uid())
);
