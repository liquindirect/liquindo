-- Restrict profile role changes and privileged function execution.
alter table public.profiles alter column role set default 'member';
revoke update on table public.profiles from public, anon, authenticated;
grant update (display_name, bio) on table public.profiles to authenticated;

revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_editor_or_admin() from public, anon, authenticated;
revoke execute on function public.can_edit_liquinwiki() from public, anon, authenticated;
revoke execute on function public.can_manage_liquinwiki() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_editor_or_admin() to authenticated;
grant execute on function public.can_edit_liquinwiki() to authenticated;
grant execute on function public.can_manage_liquinwiki() to authenticated;
