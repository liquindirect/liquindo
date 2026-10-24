-- Historical Flag Maker shape library schema. Removed by 20261024130700.
create table if not exists public.flagmaker_shapes (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null default 'general',
  shape_data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.flagmaker_shapes enable row level security;
drop policy if exists "Admins manage flagmaker shapes" on public.flagmaker_shapes;
create policy "Admins manage flagmaker shapes" on public.flagmaker_shapes for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
grant select on public.flagmaker_shapes to anon, authenticated;
grant insert, update, delete on public.flagmaker_shapes to authenticated;
