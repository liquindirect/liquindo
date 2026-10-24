-- Retain snapshots of site settings before updates and deletes.
create table if not exists public.site_settings_history (
 id bigint generated always as identity primary key,
 setting_key text not null,
 action text not null check (action in ('update','delete')),
 snapshot jsonb not null,
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);
alter table public.site_settings_history enable row level security;
drop policy if exists "Admins read site settings history" on public.site_settings_history;
create policy "Admins read site settings history" on public.site_settings_history for select to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
grant select on public.site_settings_history to authenticated;
create or replace function public.capture_site_settings_history()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and old.setting_value is not distinct from new.setting_value then return new; end if;
 insert into public.site_settings_history(setting_key,action,snapshot,changed_by)
 values(old.setting_key,lower(tg_op),to_jsonb(old),auth.uid());
 return case when tg_op='DELETE' then old else new end;
end; $$;
drop trigger if exists capture_site_settings_history on public.site_settings;
create trigger capture_site_settings_history after update or delete on public.site_settings
for each row execute function public.capture_site_settings_history();
