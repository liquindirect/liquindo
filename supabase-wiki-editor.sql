-- LiquinWiki editor and approval workflow, adapted to the existing wiki_pages/wiki_revisions tables.
-- Safe to run after the earlier incompatible script failed. Existing pages and revisions are preserved.

create table if not exists public.wiki_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  permission text not null check (permission in ('liquinwiki_editor', 'liquinwiki_admin')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);

-- Preserve old revisions as existing history; only newly submitted rows are pending.
alter table public.wiki_revisions
  add column if not exists status text not null default 'approved',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

alter table public.wiki_revisions drop constraint if exists wiki_revisions_status_check;
alter table public.wiki_revisions add constraint wiki_revisions_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.wiki_permissions enable row level security;
alter table public.wiki_pages enable row level security;
alter table public.wiki_revisions enable row level security;

create or replace function public.can_manage_liquinwiki()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (select 1 from public.wiki_permissions wp where wp.user_id = auth.uid() and wp.permission = 'liquinwiki_admin');
$$;

create or replace function public.can_edit_liquinwiki()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (select 1 from public.wiki_permissions wp where wp.user_id = auth.uid() and wp.permission in ('liquinwiki_editor','liquinwiki_admin'));
$$;

revoke all on function public.can_manage_liquinwiki() from public;
revoke all on function public.can_edit_liquinwiki() from public;
grant execute on function public.can_manage_liquinwiki() to authenticated;
grant execute on function public.can_edit_liquinwiki() to authenticated;

drop policy if exists "Anyone can read wiki pages" on public.wiki_pages;
create policy "Anyone can read wiki pages" on public.wiki_pages for select to anon, authenticated using (true);
drop policy if exists "Users can read own wiki permission" on public.wiki_permissions;
create policy "Users can read own wiki permission" on public.wiki_permissions for select to authenticated
using (user_id = auth.uid() or public.can_manage_liquinwiki());
drop policy if exists "Wiki admins manage wiki permissions" on public.wiki_permissions;
create policy "Wiki admins manage wiki permissions" on public.wiki_permissions for all to authenticated
using (public.can_manage_liquinwiki()) with check (public.can_manage_liquinwiki());
drop policy if exists "Editors and admins can read revisions" on public.wiki_revisions;
create policy "Editors and admins can read revisions" on public.wiki_revisions for select to authenticated
using (edited_by = auth.uid() or public.can_manage_liquinwiki());
drop policy if exists "Wiki editors can submit pending revisions" on public.wiki_revisions;
create policy "Wiki editors can submit pending revisions" on public.wiki_revisions for insert to authenticated
with check (edited_by = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null and public.can_edit_liquinwiki());

revoke all on public.wiki_permissions from anon, authenticated;
grant select, insert, update, delete on public.wiki_permissions to authenticated;
revoke all on public.wiki_pages from anon, authenticated;
grant select on public.wiki_pages to anon, authenticated;
revoke all on public.wiki_revisions from anon, authenticated;
grant select, insert on public.wiki_revisions to authenticated;

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
    -- Keep approval limited to the article slugs currently supported by the site.
    if v_revision.slug not in ('liquindo','liquin-plan','lnf','integralist-front','npf') then
      raise exception 'This revision uses an unsupported article slug';
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

create or replace function public.set_liquinwiki_permission(p_email text, p_permission text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid;
begin
  if not public.can_manage_liquinwiki() then raise exception 'Only LiquinWiki administrators can manage editor permissions'; end if;
  if p_permission not in ('liquinwiki_editor','liquinwiki_admin','none') then raise exception 'Invalid wiki permission'; end if;
  select u.id into v_user_id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'No account found for that email address'; end if;
  if p_permission = 'none' then
    delete from public.wiki_permissions where user_id = v_user_id;
  else
    insert into public.wiki_permissions (user_id,permission,granted_by,granted_at)
    values (v_user_id,p_permission,auth.uid(),now())
    on conflict (user_id) do update set permission=excluded.permission, granted_by=excluded.granted_by, granted_at=excluded.granted_at;
  end if;
end;
$$;
revoke all on function public.set_liquinwiki_permission(text,text) from public;
grant execute on function public.set_liquinwiki_permission(text,text) to authenticated;
