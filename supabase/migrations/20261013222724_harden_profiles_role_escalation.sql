-- Ensure profile updates cannot grant elevated roles.
alter table public.profiles alter column role set default 'member';
revoke update (role, id, created_at, updated_at) on table public.profiles from public, anon, authenticated;
grant update (display_name, bio) on table public.profiles to authenticated;

create or replace function public.prevent_profile_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Only administrators can change account roles' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation before update of role on public.profiles
for each row execute function public.prevent_profile_role_escalation();
revoke all on function public.prevent_profile_role_escalation() from public, anon, authenticated;
