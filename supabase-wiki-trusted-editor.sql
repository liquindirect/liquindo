-- LiquinWiki trusted editor role
-- Run in Supabase SQL Editor after deploying the website changes.
-- Preserves existing articles, revisions, and member/admin profile roles.

alter table public.wiki_permissions
  drop constraint if exists wiki_permissions_permission_check;
alter table public.wiki_permissions
  add constraint wiki_permissions_permission_check
  check (permission in (
    'liquinwiki_editor',
    'liquinwiki_creator',
    'liquinwiki_trusted_editor',
    'liquinwiki_admin'
  ));

create or replace function public.can_edit_liquinwiki()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission in (
          'liquinwiki_editor','liquinwiki_creator',
          'liquinwiki_trusted_editor','liquinwiki_admin'
        )
    );
$$;
revoke all on function public.can_edit_liquinwiki() from public;
grant execute on function public.can_edit_liquinwiki() to authenticated;

create or replace function public.set_liquinwiki_permission(p_email text, p_permission text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid;
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only LiquinWiki administrators can manage editor permissions';
  end if;
  if p_permission not in (
    'liquinwiki_editor','liquinwiki_creator',
    'liquinwiki_trusted_editor','liquinwiki_admin','none'
  ) then
    raise exception 'Invalid wiki permission';
  end if;
  select u.id into v_user_id from auth.users u
  where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then
    raise exception 'No account found for that email address';
  end if;
  if p_permission = 'none' then
    delete from public.wiki_permissions where user_id = v_user_id;
  else
    insert into public.wiki_permissions (user_id, permission, granted_by, granted_at)
    values (v_user_id, p_permission, auth.uid(), now())
    on conflict (user_id) do update
      set permission = excluded.permission,
          granted_by = excluded.granted_by,
          granted_at = excluded.granted_at;
  end if;
end;
$$;
revoke all on function public.set_liquinwiki_permission(text, text) from public;
grant execute on function public.set_liquinwiki_permission(text, text) to authenticated;

create or replace function public.publish_liquinwiki_trusted_editor_revision(
  p_slug text,
  p_title text,
  p_content text
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_page_id bigint;
  v_revision_id bigint;
  v_now timestamptz := now();
begin
  if not (
    public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission = 'liquinwiki_trusted_editor'
    )
  ) then
    raise exception 'Only administrators and trusted editors can publish directly';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 80 then
    raise exception 'Invalid article URL slug';
  end if;
  if p_title is null or length(trim(p_title)) = 0 or length(p_title) > 120 then
    raise exception 'Article title must contain 1-120 characters';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'Article content cannot be empty';
  end if;
  if length(p_content) > 200000 then
    raise exception 'Article content is too long to publish';
  end if;

  select id into v_page_id from public.wiki_pages
  where slug = p_slug order by id limit 1 for update;

  if v_page_id is null then
    insert into public.wiki_pages
      (slug, title, content, created_by, updated_by, created_at, updated_at)
    values (p_slug, p_title, p_content, auth.uid(), auth.uid(), v_now, v_now)
    returning id into v_page_id;
  else
    update public.wiki_pages
    set title = p_title, content = p_content,
        updated_by = auth.uid(), updated_at = v_now
    where id = v_page_id and slug = p_slug;
    if not found then
      raise exception 'The matching wiki page could not be updated';
    end if;
  end if;

  insert into public.wiki_revisions
    (page_id, slug, title, content, edited_by, edited_at, status,
     reviewed_by, reviewed_at, review_note)
  values
    (v_page_id, p_slug, p_title, p_content, auth.uid(), v_now,
     'approved', auth.uid(), v_now,
     'Published directly by a LiquinWiki trusted editor or administrator; approval not required.')
  returning id into v_revision_id;

  return v_revision_id;
end;
$$;
revoke all on function public.publish_liquinwiki_trusted_editor_revision(text, text, text) from public;
grant execute on function public.publish_liquinwiki_trusted_editor_revision(text, text, text) to authenticated;
