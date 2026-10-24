-- Reconstruct visitor access logging from the live Supabase schema.
-- This migration is safe on databases where the table already exists.
create table if not exists public.visitor_access_logs (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  ip_address inet not null,
  user_id uuid references auth.users(id) on delete set null
);
alter table public.visitor_access_logs enable row level security;
revoke all on public.visitor_access_logs from public, anon, authenticated;
grant select, insert, delete on public.visitor_access_logs to service_role;
