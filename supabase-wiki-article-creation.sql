-- LiquinWiki: permission-gated new article creation.
-- Run this script in Supabase SQL Editor after the website code is deployed.
-- Existing pages, revisions, member/admin roles, and editor permissions are preserved.

alter table public.wiki_permissions drop constraint if exists wiki_permissions_permission_check;
alter table public.wiki_permissions add constraint wiki_permissions_permission_check
  check (permission in ('liquinwiki_editor', 'liquinwiki_creator', 'liquinwiki_admin'));

alter table public.wiki_revisions add column if not exists is_new_article boolean not null default false;

create or replace function public.can_edit_liquinwiki()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission in ('liquinwiki_editor','liquinwiki_creator','liquinwiki_admin')
    );
$$;
revoke all on function public.can_edit_liquinwiki() from public;
grant execute on function public.can_edit_liquinwiki() to authenticated;

create or replace function public.can_create_liquinwiki_articles()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid() and wp.permission = 'liquinwiki_creator'
    );
$$;
revoke all on function public.can_create_liquinwiki_articles() from public;
grant execute on function public.can_create_liquinwiki_articles() to authenticated;

drop policy if exists "Wiki editors can submit pending revisions" on public.wiki_revisions;
create policy "Wiki editors can submit pending revisions" on public.wiki_revisions
for insert to authenticated
with check (
  edited_by = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and public.can_edit_liquinwiki()
  and (not is_new_article or public.can_create_liquinwiki_articles())
);

create or replace function public.set_liquinwiki_permission(p_email text, p_permission text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid;
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only LiquinWiki administrators can manage editor permissions';
  end if;
  if p_permission not in ('liquinwiki_editor','liquinwiki_creator','liquinwiki_admin','none') then
    raise exception 'Invalid wiki permission';
  end if;
  select u.id into v_user_id from auth.users u
  where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'No account found for that email address'; end if;
  if p_permission = 'none' then
    delete from public.wiki_permissions where user_id = v_user_id;
  else
    insert into public.wiki_permissions (user_id,permission,granted_by,granted_at)
    values (v_user_id,p_permission,auth.uid(),now())
    on conflict (user_id) do update
      set permission=excluded.permission, granted_by=excluded.granted_by, granted_at=excluded.granted_at;
  end if;
end;
$$;
revoke all on function public.set_liquinwiki_permission(text,text) from public;
grant execute on function public.set_liquinwiki_permission(text,text) to authenticated;

create or replace function public.review_liquinwiki_revision(p_revision_id bigint, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
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
    if v_revision.slug is null or v_revision.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or length(v_revision.slug) > 80 then
      raise exception 'Invalid article URL slug';
    end if;
    if v_revision.title is null or length(trim(v_revision.title)) = 0 or length(v_revision.title) > 120 then
      raise exception 'Invalid article title';
    end if;
    if v_revision.is_new_article then
      if v_revision.page_id is not null then raise exception 'New article revisions must not target an existing page'; end if;
      if exists (select 1 from public.wiki_pages where slug = v_revision.slug) then
        raise exception 'An article with this URL slug already exists';
      end if;
      insert into public.wiki_pages (slug,title,content,created_by,updated_by,created_at,updated_at)
      values (v_revision.slug,v_revision.title,v_revision.content,v_revision.edited_by,auth.uid(),now(),now())
      returning id into v_page_id;
    else
      if v_revision.page_id is not null then
        select id into v_page_id from public.wiki_pages
        where id = v_revision.page_id and slug = v_revision.slug for update;
        if v_page_id is null then raise exception 'Revision page ID does not match its article slug'; end if;
      else
        select id into v_page_id from public.wiki_pages
        where slug = v_revision.slug order by id limit 1 for update;
      end if;
      if v_page_id is null then
        insert into public.wiki_pages (slug,title,content,created_by,updated_by,created_at,updated_at)
        values (v_revision.slug,v_revision.title,v_revision.content,v_revision.edited_by,auth.uid(),now(),now())
        returning id into v_page_id;
      else
        update public.wiki_pages set title=v_revision.title, content=v_revision.content,
          updated_by=auth.uid(), updated_at=now()
        where id=v_page_id and slug=v_revision.slug;
        if not found then raise exception 'The matching wiki page could not be updated'; end if;
      end if;
    end if;
    update public.wiki_revisions set page_id=v_page_id where id=p_revision_id;
  end if;

  update public.wiki_revisions set status=p_decision, reviewed_by=auth.uid(),
    reviewed_at=now(), review_note=left(coalesce(p_note,''),2000)
  where id=p_revision_id;
end;
$$;
revoke all on function public.review_liquinwiki_revision(bigint,text,text) from public;
grant execute on function public.review_liquinwiki_revision(bigint,text,text) to authenticated;
