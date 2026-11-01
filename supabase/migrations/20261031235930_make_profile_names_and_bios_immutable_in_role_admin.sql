create or replace function public.admin_update_profile(target_user_id uuid,new_display_name text,new_bio text,new_role text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare current_role text; changed_row public.profiles%rowtype;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if target_user_id is null then raise exception 'Target account is required'; end if;
 if new_role is null or new_role not in ('member','admin') then raise exception 'Unsupported account role'; end if;
 perform pg_advisory_xact_lock(hashtextextended('liquindo-website-admin-role-guard',0));
 select p.role into current_role from public.profiles p where p.id=target_user_id for update;
 if current_role is null then raise exception 'Profile not found'; end if;
 if target_user_id=(select auth.uid()) and new_role<>current_role then raise exception 'You cannot change your own administrator role'; end if;
 if current_role='admin' and new_role='member' and (select count(*) from public.profiles p where p.role='admin')<=1 then raise exception 'Cannot demote the last administrator'; end if;
 update public.profiles set role=new_role where id=target_user_id returning * into changed_row;
 return jsonb_build_object('id',changed_row.id,'display_name',changed_row.display_name,'role',changed_row.role,'bio',changed_row.bio);
end; $$;
revoke all on function public.admin_update_profile(uuid,text,text,text) from public,anon;
grant execute on function public.admin_update_profile(uuid,text,text,text) to authenticated;