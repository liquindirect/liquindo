-- Remove expired visitor logs on a daily schedule.
-- Supabase projects normally provide pg_cron; keep migration portable if it is unavailable.
create or replace function public.cleanup_expired_visitor_access_logs()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.visitor_access_logs
  where visited_at < now() - interval '7 days';
$$;
revoke all on function public.cleanup_expired_visitor_access_logs() from public, anon, authenticated;
grant execute on function public.cleanup_expired_visitor_access_logs() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'cleanup-visitor-access-logs';
    perform cron.schedule(
      'cleanup-visitor-access-logs',
      '17 3 * * *',
      'select public.cleanup_expired_visitor_access_logs();'
    );
  end if;
exception when undefined_table or undefined_function or insufficient_privilege then
  raise notice 'pg_cron scheduling unavailable; cleanup function is installed but not scheduled';
end
$$;
