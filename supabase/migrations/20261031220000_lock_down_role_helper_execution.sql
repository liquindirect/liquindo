-- Close direct RPC access to trigger-only helpers and internal permission checks.
-- These functions are invoked by triggers or by SECURITY DEFINER publishing functions only.
begin;
revoke execute on function public.audit_liquinwiki_permission_change() from public, anon, authenticated;
revoke execute on function public.can_publish_liquinwiki_directly() from public, anon, authenticated;
revoke execute on function public.log_admin_table_change() from public, anon, authenticated;
revoke execute on function public.prevent_admin_profile_bio_edits() from public, anon, authenticated;
revoke execute on function public.capture_site_settings_history() from public, anon, authenticated;
commit;
