-- LiquinWiki: allow administrators to publish newly created articles.
-- Fixes the old hard-coded five-slug whitelist while preserving review and page-ID safeguards.
-- Safe to run in Supabase SQL Editor; it does not alter existing articles or revisions.
create or replace function public.review_liquinwiki_revision(p_revision_id bigint, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = ''
as $
declare
  v_revision public.wiki_revisions%rowtype;
  v_page_id bigint;
begin
  if not public.can_manage_liquinwiki() then raise exception 'Only LiquinWiki administrators can review revisions'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;

  select * into v_revision from public.wiki_revisions where id = p_revision_id for update;
  if not found then raise exception 'Revision not found'; end if;
  if v_revision.status <> 'pending' then raise exception 'This revision has already been reviewed'; end if;

  if p_decision = 'approved' then
    -- Permit any valid new article slug, not only the original five hard-coded pages.
    -- The slug is still constrained to lowercase URL-safe words separated by single hyphens.
    if v_revision.slug is null or v_revision.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*

    if v_revision.page_id is not null then
      -- A revision must never be able to publish to a different page than its slug.
      select id into v_page_id
      from public.wiki_pages
      where id = v_revision.page_id and slug = v_revision.slug
      for update;
      if v_page_id is null then
        raise exception 'Revision page ID does not match its article slug';
      end if;
    else
      -- Legacy/new revisions without page_id are matched by their slug.
      select id into v_page_id
      from public.wiki_pages
      where slug = v_revision.slug
      order by id
      limit 1
      for update;
    end if;

    if v_page_id is null then
      insert into public.wiki_pages
        (slug, title, content, created_by, updated_by, created_at, updated_at)
      values
        (v_revision.slug, v_revision.title, v_revision.content, v_revision.edited_by, auth.uid(), now(), now())
      returning id into v_page_id;
    else
      update public.wiki_pages
      set title = v_revision.title,
          content = v_revision.content,
          updated_by = auth.uid(),
          updated_at = now()
      where id = v_page_id and slug = v_revision.slug;
      if not found then raise exception 'The matching wiki page could not be updated'; end if;
    end if;

    update public.wiki_revisions set page_id = v_page_id where id = p_revision_id;
  end if;

  update public.wiki_revisions
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = left(coalesce(p_note,''),2000)
  where id = p_revision_id;
end;
$;
revoke all on function public.review_liquinwiki_revision(bigint,text,text) from public;
grant execute on function public.review_liquinwiki_revision(bigint,text,text) to authenticated;

 or length(v_revision.slug) > 80 then
      raise exception 'This revision has an invalid article slug';
    end if;

    if v_revision.page_id is not null then
      -- A revision must never be able to publish to a different page than its slug.
      select id into v_page_id
      from public.wiki_pages
      where id = v_revision.page_id and slug = v_revision.slug
      for update;
      if v_page_id is null then
        raise exception 'Revision page ID does not match its article slug';
      end if;
    else
      -- Legacy/new revisions without page_id are matched by their slug.
      select id into v_page_id
      from public.wiki_pages
      where slug = v_revision.slug
      order by id
      limit 1
      for update;
    end if;

    if v_page_id is null then
      insert into public.wiki_pages
        (slug, title, content, created_by, updated_by, created_at, updated_at)
      values
        (v_revision.slug, v_revision.title, v_revision.content, v_revision.edited_by, auth.uid(), now(), now())
      returning id into v_page_id;
    else
      update public.wiki_pages
      set title = v_revision.title,
          content = v_revision.content,
          updated_by = auth.uid(),
          updated_at = now()
      where id = v_page_id and slug = v_revision.slug;
      if not found then raise exception 'The matching wiki page could not be updated'; end if;
    end if;

    update public.wiki_revisions set page_id = v_page_id where id = p_revision_id;
  end if;

  update public.wiki_revisions
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = left(coalesce(p_note,''),2000)
  where id = p_revision_id;
end;
$;
revoke all on function public.review_liquinwiki_revision(bigint,text,text) from public;
grant execute on function public.review_liquinwiki_revision(bigint,text,text) to authenticated;


