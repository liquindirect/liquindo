-- Enforce case-insensitive username uniqueness without changing existing profile rows.
create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(btrim(username)))
where username is not null and btrim(username) <> '';

-- Normalize future usernames in the database.
create or replace function public.normalize_profile_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is not null then
    new.username := lower(btrim(new.username));
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_profile_username on public.profiles;
create trigger normalize_profile_username
before insert or update of username on public.profiles
for each row execute function public.normalize_profile_username();