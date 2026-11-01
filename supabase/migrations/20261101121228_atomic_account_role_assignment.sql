create or replace function public.admin_update_account_roles(
  p_user_id uuid,
  p_website_role text,
  p_wiki_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role text;
  v_display_name text;
begin
  if (select auth.uid()) is null
     or not exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'admin'
     ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_user_id is null then raise exception 'Target account is required'; end if;
  if p_website_role is null or p_website_role not in ('member', 'admin') then raise exception 'Invalid website role'; end if;
  if p_wiki_role is null or p_wiki_role not in ('none', 'liquinwiki_editor', 'liquinwiki_trusted_editor') then raise exception 'Invalid LiquinWiki role'; end if;

  perform pg_advisory_xact_lock(hashtextextended('liquindo-website-admin-role-guard', 0));
  select p.role, p.display_name into v_current_role, v_display_name
  from public.profiles p where p.id = p_user_id for update;
  if v_current_role is null then raise exception 'Profile not found'; end if;
  if p_user_id = (select auth.uid()) and p_website_role <> v_current_role then raise exception 'You cannot change your own administrator role'; end if;
  if v_current_role = 'admin' and p_website_role = 'member'
     and (select count(*) from public.profiles p where p.role = 'admin') <= 1 then
    raise exception 'Cannot demote the last administrator';
  end if;

  update public.profiles set role = p_website_role where id = p_user_id;
  delete from public.wiki_permissions
  where user_id = p_user_id and permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor');
  if p_wiki_role <> 'none' then
    insert into public.wiki_permissions(user_id, permission, granted_by, granted_at)
    values (p_user_id, p_wiki_role, (select auth.uid()), now());
  end if;

  return jsonb_build_object('id', p_user_id, 'display_name', v_display_name, 'role', p_website_role, 'wiki_role', p_wiki_role);
end;
$$;

revoke all on function public.admin_update_account_roles(uuid, text, text) from public, anon;
grant execute on function public.admin_update_account_roles(uuid, text, text) to authenticated;