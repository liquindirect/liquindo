drop function if exists public.admin_list_profiles(integer,integer);
create or replace function public.admin_list_profiles(p_offset integer default 0,p_limit integer default 100,p_search text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_total bigint; v_profiles jsonb; v_search text:=nullif(btrim(p_search),'');
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin') then raise exception 'Administrator access required' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 then raise exception 'Invalid account offset'; end if;
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'Account page size must be between 1 and 100'; end if;
 if v_search is not null and char_length(v_search)>120 then raise exception 'Search must be 120 characters or fewer'; end if;
 select count(*) into v_total from public.profiles p where v_search is null or p.display_name ilike '%'||v_search||'%' or coalesce(p.bio,'') ilike '%'||v_search||'%' or p.role ilike '%'||v_search||'%' or p.id::text ilike '%'||v_search||'%';
 select coalesce(jsonb_agg(to_jsonb(page_row)),'[]'::jsonb) into v_profiles from (
  select p.id,p.display_name,p.role,p.bio from public.profiles p where v_search is null or p.display_name ilike '%'||v_search||'%' or coalesce(p.bio,'') ilike '%'||v_search||'%' or p.role ilike '%'||v_search||'%' or p.id::text ilike '%'||v_search||'%' order by p.display_name nulls last,p.id offset p_offset limit p_limit
 ) page_row;
 return jsonb_build_object('profiles',v_profiles,'total',v_total);
end; $$;
revoke all on function public.admin_list_profiles(integer,integer,text) from public,anon;
grant execute on function public.admin_list_profiles(integer,integer,text) to authenticated;