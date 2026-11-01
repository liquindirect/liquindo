create or replace function public.admin_list_profiles(p_offset integer default 0,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_total bigint; v_profiles jsonb;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if p_offset is null or p_offset<0 then raise exception 'Invalid account offset'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Account page size must be between 1 and 100'; end if;
 select count(*) into v_total from public.profiles;
 select coalesce(jsonb_agg(to_jsonb(page_row)),'[]'::jsonb) into v_profiles from (
  select p.id,p.display_name,p.role,p.bio from public.profiles p order by p.display_name nulls last,p.id offset p_offset limit p_limit
 ) page_row;
 return jsonb_build_object('profiles',v_profiles,'total',v_total);
end; $$;
revoke all on function public.admin_list_profiles(integer,integer) from public,anon;
grant execute on function public.admin_list_profiles(integer,integer) to authenticated;