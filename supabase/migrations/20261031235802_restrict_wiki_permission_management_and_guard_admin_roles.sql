create or replace function public.can_manage_liquinwiki()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'); $$;

create or replace function public.set_liquinwiki_permission(p_email text,p_permission text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid; v_permission text;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then
  raise exception 'Only website Administrators can assign or revoke LiquinWiki permissions' using errcode='42501';
 end if;
 if p_email is null or btrim(p_email)='' then raise exception 'Enter an account email address'; end if;
 if p_permission='none' then
  select u.id into v_user_id from auth.users u where lower(u.email)=lower(btrim(p_email)) limit 1;
  if v_user_id is null then raise exception 'No account found for that email address'; end if;
  delete from public.wiki_permissions where user_id=v_user_id; return;
 end if;
 v_permission:=case when left(p_permission,7)='revoke:' then substring(p_permission from 8) else p_permission end;
 if v_permission not in ('liquinwiki_editor','liquinwiki_trusted_editor') then raise exception 'Invalid LiquinWiki permission'; end if;
 select u.id into v_user_id from auth.users u where lower(u.email)=lower(btrim(p_email)) limit 1;
 if v_user_id is null then raise exception 'No account found for that email address'; end if;
 if left(p_permission,7)='revoke:' then
  delete from public.wiki_permissions where user_id=v_user_id and permission=v_permission;
 else
  insert into public.wiki_permissions(user_id,permission,granted_by,granted_at) values(v_user_id,v_permission,(select auth.uid()),now())
  on conflict(user_id,permission) do update set granted_by=excluded.granted_by,granted_at=excluded.granted_at;
 end if;
end; $$;

create or replace function public.admin_update_profile(target_user_id uuid,new_display_name text,new_bio text,new_role text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare current_role text; changed_row public.profiles%rowtype;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if target_user_id is null then raise exception 'Target account is required'; end if;
 if new_display_name is null or char_length(btrim(new_display_name)) not between 1 and 80 then raise exception 'Display name must be between 1 and 80 characters'; end if;
 if new_bio is null or char_length(new_bio)>500 then raise exception 'Bio must be 500 characters or fewer'; end if;
 if new_role is null or new_role not in ('member','admin') then raise exception 'Unsupported account role'; end if;
 perform pg_advisory_xact_lock(hashtextextended('liquindo-website-admin-role-guard',0));
 select p.role into current_role from public.profiles p where p.id=target_user_id for update;
 if current_role is null then raise exception 'Profile not found'; end if;
 if target_user_id=(select auth.uid()) and new_role<>current_role then raise exception 'You cannot change your own administrator role'; end if;
 if current_role='admin' and new_role='member' and (select count(*) from public.profiles p where p.role='admin')<=1 then raise exception 'Cannot demote the last administrator'; end if;
 update public.profiles set display_name=btrim(new_display_name),bio=new_bio,role=new_role where id=target_user_id returning * into changed_row;
 return jsonb_build_object('id',changed_row.id,'display_name',changed_row.display_name,'role',changed_row.role,'bio',changed_row.bio);
end; $$;

revoke all on function public.set_liquinwiki_permission(text,text) from public,anon;
grant execute on function public.set_liquinwiki_permission(text,text) to authenticated;
revoke all on function public.admin_update_profile(uuid,text,text,text) from public,anon;
grant execute on function public.admin_update_profile(uuid,text,text,text) to authenticated;
revoke all on function public.can_manage_liquinwiki() from public,anon;
grant execute on function public.can_manage_liquinwiki() to authenticated;
