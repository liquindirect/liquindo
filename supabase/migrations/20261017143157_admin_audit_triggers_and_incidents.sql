-- Audit log and row-change audit triggers.
create table if not exists public.admin_audit_log (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check (char_length(action) between 1 and 120),
 target_type text not null check (char_length(target_type) between 1 and 80),
 target_id text,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
drop policy if exists "Admins read admin audit log" on public.admin_audit_log;
create policy "Admins read admin audit log" on public.admin_audit_log for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "Admins insert admin audit log" on public.admin_audit_log;
create policy "Admins insert admin audit log" on public.admin_audit_log for insert to authenticated
with check (actor_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
grant select, insert on public.admin_audit_log to authenticated;

create or replace function public.log_admin_table_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_key text; detail_json jsonb; verb text := lower(tg_op);
begin
 if tg_table_name = 'profiles' then
  target_key := coalesce((case when tg_op='DELETE' then old.id else new.id end)::text,'unknown');
  detail_json := jsonb_build_object('operation',verb);
 elsif tg_table_name = 'site_settings' then
  target_key := coalesce((case when tg_op='DELETE' then old.setting_key else new.setting_key end),'unknown');
  detail_json := jsonb_build_object('operation',verb);
 elsif tg_table_name = 'wiki_pages' then
  target_key := coalesce((case when tg_op='DELETE' then old.slug else new.slug end),'unknown');
  detail_json := jsonb_build_object('operation',verb);
 elsif tg_table_name = 'wiki_revisions' then
  target_key := coalesce((case when tg_op='DELETE' then old.id else new.id end)::text,'unknown');
  detail_json := jsonb_build_object('operation',verb);
 elsif tg_table_name = 'wiki_permissions' then
  target_key := coalesce((case when tg_op='DELETE' then old.user_id else new.user_id end)::text,'unknown');
  detail_json := jsonb_build_object('operation',verb);
 else target_key := 'unknown'; detail_json := jsonb_build_object('operation',verb);
 end if;
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,details)
 values(auth.uid(),tg_table_name||'.'||verb,tg_table_name,target_key,coalesce(detail_json,'{}'::jsonb));
 return case when tg_op='DELETE' then old else new end;
end; $$;

drop trigger if exists audit_profiles_changes on public.profiles;
create trigger audit_profiles_changes after update or insert or delete on public.profiles for each row execute function public.log_admin_table_change();
drop trigger if exists audit_site_settings_changes on public.site_settings;
create trigger audit_site_settings_changes after update or insert or delete on public.site_settings for each row execute function public.log_admin_table_change();
drop trigger if exists audit_wiki_pages_changes on public.wiki_pages;
create trigger audit_wiki_pages_changes after update or insert or delete on public.wiki_pages for each row execute function public.log_admin_table_change();
drop trigger if exists audit_wiki_revisions_changes on public.wiki_revisions;
create trigger audit_wiki_revisions_changes after update or insert or delete on public.wiki_revisions for each row execute function public.log_admin_table_change();
drop trigger if exists audit_wiki_permissions_changes on public.wiki_permissions;
create trigger audit_wiki_permissions_changes after update or insert or delete on public.wiki_permissions for each row execute function public.log_admin_table_change();
