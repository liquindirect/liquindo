-- Avoid evaluating profile-only OLD/NEW fields from other audit-triggered tables.
begin;
create or replace function public.log_admin_table_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  target_key text;
  detail_json jsonb;
  verb text := lower(tg_op);
begin
  if tg_table_name = 'profiles' then
    if tg_op = 'UPDATE'
       and old.display_name is not distinct from new.display_name
       and old.bio is not distinct from new.bio
       and old.role is not distinct from new.role then
      return new;
    end if;
    target_key := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, 'unknown');
    if tg_op = 'UPDATE' then
      detail_json := jsonb_build_object(
        'operation', verb,
        'role_before', old.role,
        'role_after', new.role,
        'display_name_changed', old.display_name is distinct from new.display_name,
        'bio_changed', old.bio is distinct from new.bio
      );
    elsif tg_op = 'INSERT' then
      detail_json := jsonb_build_object('operation', verb, 'role_after', new.role);
    else
      detail_json := jsonb_build_object('operation', verb, 'role_before', old.role);
    end if;
  elsif tg_table_name = 'site_settings' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.setting_key else new.setting_key end), 'unknown');
    detail_json := jsonb_build_object('operation', verb);
  elsif tg_table_name = 'wiki_pages' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.slug else new.slug end), 'unknown');
    detail_json := jsonb_build_object('operation', verb);
  elsif tg_table_name = 'wiki_revisions' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, 'unknown');
    detail_json := jsonb_build_object('operation', verb);
  elsif tg_table_name = 'wiki_permissions' then
    target_key := coalesce((case when tg_op = 'DELETE' then old.user_id else new.user_id end)::text, 'unknown');
    detail_json := jsonb_build_object('operation', verb);
  else
    target_key := 'unknown';
    detail_json := jsonb_build_object('operation', verb);
  end if;

  insert into public.admin_audit_log(actor_id, action, target_type, target_id, details)
  values (auth.uid(), tg_table_name || '.' || verb, tg_table_name, target_key, coalesce(detail_json, '{}'::jsonb));
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke execute on function public.log_admin_table_change() from public, anon, authenticated;
commit;
