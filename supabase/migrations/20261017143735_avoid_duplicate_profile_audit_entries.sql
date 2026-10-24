-- Avoid duplicate audit records for profile updates that do not change meaningful fields.
create or replace function public.log_admin_table_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_key text; detail_json jsonb; verb text := lower(tg_op);
begin
 if tg_table_name='profiles' and tg_op='UPDATE'
   and old.display_name is not distinct from new.display_name
   and old.bio is not distinct from new.bio
   and old.role is not distinct from new.role then return new; end if;
 if tg_table_name='profiles' then
  target_key := coalesce((case when tg_op='DELETE' then old.id else new.id end)::text,'unknown');
 elsif tg_table_name='site_settings' then
  target_key := coalesce((case when tg_op='DELETE' then old.setting_key else new.setting_key end),'unknown');
 elsif tg_table_name='wiki_pages' then
  target_key := coalesce((case when tg_op='DELETE' then old.slug else new.slug end),'unknown');
 elsif tg_table_name='wiki_revisions' then
  target_key := coalesce((case when tg_op='DELETE' then old.id else new.id end)::text,'unknown');
 elsif tg_table_name='wiki_permissions' then
  target_key := coalesce((case when tg_op='DELETE' then old.user_id else new.user_id end)::text,'unknown');
 else target_key := 'unknown'; end if;
 detail_json := jsonb_build_object('operation',verb);
 insert into public.admin_audit_log(actor_id,action,target_type,target_id,details)
 values(auth.uid(),tg_table_name||'.'||verb,tg_table_name,target_key,detail_json);
 return case when tg_op='DELETE' then old else new end;
end; $$;
