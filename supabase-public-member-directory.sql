-- Allow anyone to browse member names, roles, and bios.
-- This policy only controls row access; keep private data out of public.profiles.
grant select on table public.profiles to anon, authenticated;

drop policy if exists "Public can view member directory" on public.profiles;
create policy "Public can view member directory"
on public.profiles
for select
to anon, authenticated
using (true);
