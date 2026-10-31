-- Prevent administrators from editing another member's public name or bio.
-- Members can still edit their own display_name and bio; role/admin tooling is unaffected.
create or replace function public.prevent_admin_profile_bio_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
begin
  if auth.uid() is not null and auth.uid() is distinct from old.id then
    select p.role into actor_role
    from public.profiles p
    where p.id = auth.uid();

    if actor_role = 'admin'
       and (
         new.display_name is distinct from old.display_name
         or new.bio is distinct from old.bio
       ) then
      raise exception 'Administrators cannot edit another member''s display name or bio';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_admin_profile_bio_edits on public.profiles;
create trigger prevent_admin_profile_bio_edits
before update of display_name, bio on public.profiles
for each row
execute function public.prevent_admin_profile_bio_edits();
