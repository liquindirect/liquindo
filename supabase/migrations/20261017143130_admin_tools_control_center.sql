-- Admin tools tables and site settings.
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

insert into public.site_settings(setting_key,setting_value) values
 ('announcement', jsonb_build_object('enabled',false,'text','')),
 ('maintenance_notice', jsonb_build_object('enabled',false,'text','')),
 ('homepage_featured', jsonb_build_object('title','','description','','url','')),
 ('directory_settings', jsonb_build_object('show_bio',true)),
 ('language_settings', jsonb_build_object('default','en','enabled',jsonb_build_array('en','pt','es','fr','de','it','hr','el','pl','ru','zh'))),
 ('footer_settings', jsonb_build_object('text','Contact: liquindohq@yahoo.com','links',jsonb_build_array()))
on conflict (setting_key) do nothing;
