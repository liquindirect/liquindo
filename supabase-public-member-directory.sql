-- Public directory access is limited to fields displayed by the site.
-- Revoke table-wide and any explicit per-column SELECT grants, then grant only required fields.
revoke select on table public.profiles from anon, authenticated;

do $$
declare
  column_name text;
begin
  for column_name in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'profiles'
  loop
    execute format('revoke select (%I) on table public.profiles from anon, authenticated', column_name);
  end loop;
end;
$$;

grant select (id, display_name, role, bio) on table public.profiles to anon, authenticated;

drop policy if exists "Public can view member directory" on public.profiles;
create policy "Public can view member directory"
on public.profiles
for select
to anon, authenticated
using (true);
