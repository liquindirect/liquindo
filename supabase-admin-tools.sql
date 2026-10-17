-- Liquindo Admin Tools additions.
-- Applied to the connected Supabase project as migrations:
-- admin_tools_control_center and admin_audit_triggers_and_incidents.
-- Safe to re-run: tables and policies are created/replaced without dropping data.

create table if not exists public.site_settings (
  setting_key text primary key check (setting_key ~ '^[a-z][a-z0-9_]{0,79}$'),
  setting_value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_settings enable row level security;
drop policy if exists "Public can read public site settings" on public.site_settings;
create policy "Public can read public site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

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

create or replace function public.admin_update_profile(target_user_id uuid, new_display_name text, new_bio text, new_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_role text; changed_row public.profiles%rowtype;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if target_user_id is null then raise exception 'Target account is required'; end if;
  if new_display_name is null or char_length(btrim(new_display_name)) not between 1 and 80 then raise exception 'Display name must be between 1 and 80 characters'; end if;
  if new_bio is null or char_length(new_bio) > 500 then raise exception 'Bio must be 500 characters or fewer'; end if;
  if new_role not in ('member','admin') then raise exception 'Unsupported account role'; end if;
  select role into current_role from public.profiles where id = target_user_id;
  if current_role is null then raise exception 'Profile not found'; end if;
  if target_user_id = auth.uid() and new_role <> current_role then raise exception 'You cannot change your own administrator role'; end if;
  update public.profiles set display_name = btrim(new_display_name), bio = new_bio, role = new_role where id = target_user_id returning * into changed_row;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'profile.updated','profile',target_user_id::text,jsonb_build_object('role_before',current_role,'role_after',new_role,'display_name',changed_row.display_name));
  return jsonb_build_object('id',changed_row.id,'display_name',changed_row.display_name,'role',changed_row.role,'bio',changed_row.bio);
end;
$$;
revoke all on function public.admin_update_profile(uuid,text,text,text) from public, anon;
grant execute on function public.admin_update_profile(uuid,text,text,text) to authenticated;

insert into public.site_settings(setting_key,setting_value) values
 ('announcement', jsonb_build_object('enabled',false,'text','')),
 ('maintenance_notice', jsonb_build_object('enabled',false,'text','')),
 ('homepage_featured', jsonb_build_object('title','','description','','url','')),
 ('directory_settings', jsonb_build_object('show_bio',true)),
 ('language_settings', jsonb_build_object('default','en','enabled',jsonb_build_array('en','pt','es','fr','de','it','hr','el','pl','ru','zh'))),
 ('footer_settings', jsonb_build_object('text','Contact: liquindohq@yahoo.com','links',jsonb_build_array()))
on conflict (setting_key) do nothing;

create table if not exists public.admin_incidents (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  status text not null default 'open' check (status in ('open','investigating','resolved')),
  severity text not null default 'normal' check (severity in ('low','normal','high','critical')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_incidents enable row level security;
drop policy if exists "Admins manage incidents" on public.admin_incidents;
create policy "Admins manage incidents" on public.admin_incidents for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
grant select, insert, update, delete on public.admin_incidents to authenticated;
grant usage, select on sequence public.admin_incidents_id_seq to authenticated;

create or replace function public.log_admin_table_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_key text; detail_json jsonb; verb text := lower(tg_op);
begin
  if tg_table_name = 'profiles' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, 'unknown');
    if tg_op = 'UPDATE' then
      detail_json := jsonb_build_object('role_before',old.role,'role_after',new.role,
        'display_name_changed',old.display_name is distinct from new.display_name,'bio_changed',old.bio is distinct from new.bio);
    else detail_json := jsonb_build_object('operation',verb); end if;
  elsif tg_table_name = 'flagmaker_shapes' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.shape_id else new.shape_id end),'unknown');
    detail_json := jsonb_build_object('operation',verb,'label',case when tg_op = 'DELETE' then old.label else new.label end,
      'builtin',case when tg_op = 'DELETE' then old.is_builtin else new.is_builtin end);
  elsif tg_table_name = 'site_settings' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.setting_key else new.setting_key end),'unknown');
    detail_json := jsonb_build_object('operation',verb);
  elsif tg_table_name = 'wiki_pages' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.slug else new.slug end),'unknown');
    detail_json := jsonb_build_object('operation',verb,'title',case when tg_op = 'DELETE' then old.title else new.title end);
  elsif tg_table_name = 'wiki_revisions' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text,'unknown');
    detail_json := jsonb_build_object('operation',verb,'slug',case when tg_op = 'DELETE' then old.slug else new.slug end,
      'status',case when tg_op = 'DELETE' then old.status else new.status end);
  elsif tg_table_name = 'wiki_permissions' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.user_id else new.user_id end)::text,'unknown');
    detail_json := jsonb_build_object('operation',verb,'permission',case when tg_op = 'DELETE' then old.permission else new.permission end);
  else target_key := 'unknown'; detail_json := jsonb_build_object('operation',verb);
  end if;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,details)
  values(auth.uid(),tg_table_name||'.'||verb,tg_table_name,target_key,coalesce(detail_json,'{}'::jsonb));
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists audit_profiles_changes on public.profiles;
create trigger audit_profiles_changes after update or insert or delete on public.profiles for each row execute function public.log_admin_table_change();
drop trigger if exists audit_flagmaker_shapes_changes on public.flagmaker_shapes;
create trigger audit_flagmaker_shapes_changes after update or insert or delete on public.flagmaker_shapes for each row execute function public.log_admin_table_change();
drop trigger if exists audit_site_settings_changes on public.site_settings;
create trigger audit_site_settings_changes after update or insert or delete on public.site_settings for each row execute function public.log_admin_table_change();
drop trigger if exists audit_wiki_pages_changes on public.wiki_pages;
create trigger audit_wiki_pages_changes after update or insert or delete on public.wiki_pages for each row execute function public.log_admin_table_change();
drop trigger if exists audit_wiki_revisions_changes on public.wiki_revisions;
create trigger audit_wiki_revisions_changes after update or insert or delete on public.wiki_revisions for each row execute function public.log_admin_table_change();
drop trigger if exists audit_wiki_permissions_changes on public.wiki_permissions;
create trigger audit_wiki_permissions_changes after update or insert or delete on public.wiki_permissions for each row execute function public.log_admin_table_change();
