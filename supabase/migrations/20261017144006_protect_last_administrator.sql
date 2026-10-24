-- Prevent demoting or deleting the last administrator.
create or replace function public.protect_last_administrator()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' and old.role='admin'
    and (select count(*) from public.profiles where role='admin') <= 1 then
  raise exception 'Cannot delete the last administrator' using errcode='42501';
 end if;
 if tg_op='UPDATE' and old.role='admin' and new.role <> 'admin'
    and (select count(*) from public.profiles where role='admin') <= 1 then
  raise exception 'Cannot demote the last administrator' using errcode='42501';
 end if;
 return case when tg_op='DELETE' then old else new end;
end; $$;
drop trigger if exists protect_last_administrator on public.profiles;
create trigger protect_last_administrator before update of role or delete on public.profiles
for each row execute function public.protect_last_administrator();
revoke all on function public.protect_last_administrator() from public, anon, authenticated;
