-- LiquinWiki: allow administrators to publish directly while recording revision history.
-- Dynamic valid article slugs are accepted; administrator authorization remains enforced.
-- Existing pages, profiles, roles, permissions, and revisions are preserved.

create or replace function public.publish_liquinwiki_admin_revision(
  p_slug text,
  p_title text,
  p_content text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page_id bigint;
  v_revision_id bigint;
  v_now timestamptz := now();
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only LiquinWiki administrators can publish directly';
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

  select id into v_page_id
  from public.wiki_pages
  where slug = p_slug
  order by id
  limit 1
  for update;

  if v_page_id is null then
    insert into public.wiki_pages
      (slug, title, content, created_by, updated_by, created_at, updated_at)
    values
      (p_slug, p_title, p_content, auth.uid(), auth.uid(), v_now, v_now)
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
    (page_id, slug, title, content, edited_by, edited_at, status, reviewed_by, reviewed_at, review_note)
  values
    (v_page_id, p_slug, p_title, p_content, auth.uid(), v_now,
     'approved', auth.uid(), v_now, 'Published directly by a LiquinWiki administrator; approval not required.')
  returning id into v_revision_id;

  return v_revision_id;
end;
$$;

revoke all on function public.publish_liquinwiki_admin_revision(text, text, text) from public;
grant execute on function public.publish_liquinwiki_admin_revision(text, text, text) to authenticated;
