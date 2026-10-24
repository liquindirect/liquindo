-- Explicitly lock down visitor access logs: these records contain IP addresses.
alter table public.visitor_access_logs enable row level security;
revoke all on table public.visitor_access_logs from public, anon, authenticated;
grant select, insert, delete on table public.visitor_access_logs to service_role;
