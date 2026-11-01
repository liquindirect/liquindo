-- Let website Administrators assign a single LiquinWiki role from Admin Tools.
-- Website roles (profiles.role) remain separate from wiki permissions.

create or replace function public.admin_list_profiles(
  p_offset integer default 0,
  p_limit integer default 100,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_profiles jsonb;
  v_search text := nullif(btrim(p_search), '');
begin
  if (select auth.uid()) is null
     or not exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'admin'
     ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_offset is null or p_offset < 0 then raise exception 'Invalid account offset'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then raise exception 'Account page size must be between 1 and 100'; end if;
  if v_search is not null and char_length(v_search) > 120 then raise exception 'Search must be 120 characters or fewer'; end if;

  select count(*) into v_total
  from public.profiles p
  where v_search is null
     or p.display_name ilike '%' || v_search || '%'
     or coalesce(p.bio, '') ilike '%' || v_search || '%'
     or p.role ilike '%' || v_search || '%'
     or p.id::text ilike '%' || v_search || '%'
     or exists (
       select 1 from public.wiki_permissions wp
       where wp.user_id = p.id
         and (
           (wp.permission = 'liquinwiki_editor' and 'wiki editor' ilike '%' || v_search || '%')
           or (wp.permission = 'liquinwiki_trusted_editor' and 'trusted editor' ilike '%' || v_search || '%')
         )
     );

  select coalesce(jsonb_agg(to_jsonb(page_row)), '[]'::jsonb)
  into v_profiles
  from (
    select
      p.id,
      p.display_name,
      p.role,
      p.bio,
      coalesce((
        select wp.permission
        from public.wiki_permissions wp
        where wp.user_id = p.id
          and wp.permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor')
        order by case wp.permission
          when 'liquinwiki_trusted_editor' then 1
          else 2
        end
        limit 1
      ), 'none') as wiki_role
    from public.profiles p
    where v_search is null
       or p.display_name ilike '%' || v_search || '%'
       or coalesce(p.bio, '') ilike '%' || v_search || '%'
       or p.role ilike '%' || v_search || '%'
       or p.id::text ilike '%' || v_search || '%'
       or exists (
         select 1 from public.wiki_permissions wp
         where wp.user_id = p.id
           and (
             (wp.permission = 'liquinwiki_editor' and 'wiki editor' ilike '%' || v_search || '%')
             or (wp.permission = 'liquinwiki_trusted_editor' and 'trusted editor' ilike '%' || v_search || '%')
           )
       )
    order by p.display_name nulls last, p.id
    offset p_offset
    limit p_limit
  ) page_row;

  return jsonb_build_object('profiles', v_profiles, 'total', v_total);
end;
$$;

create or replace function public.set_liquinwiki_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'admin'
     ) then
    raise exception 'Only website Administrators can assign LiquinWiki roles' using errcode = '42501';
  end if;

  if p_user_id is null then raise exception 'Target account is required'; end if;
  if p_role is null or p_role not in ('none', 'liquinwiki_editor', 'liquinwiki_trusted_editor') then
    raise exception 'Invalid LiquinWiki role';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Profile not found';
  end if;

  delete from public.wiki_permissions
  where user_id = p_user_id
    and permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor');

  if p_role <> 'none' then
    insert into public.wiki_permissions(user_id, permission, granted_by, granted_at)
    values (p_user_id, p_role, (select auth.uid()), now());
  end if;
end;
$$;

revoke all on function public.admin_list_profiles(integer, integer, text) from public, anon;
grant execute on function public.admin_list_profiles(integer, integer, text) to authenticated;
revoke all on function public.set_liquinwiki_role(uuid, text) from public, anon;
grant execute on function public.set_liquinwiki_role(uuid, text) to authenticated;
