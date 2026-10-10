-- LiquinWiki editor and revision system
-- Run this entire script in Supabase Dashboard > SQL Editor.

create table if not exists public.wiki_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  permission text not null check (permission in ('liquinwiki_editor', 'liquinwiki_admin')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);

create table if not exists public.wiki_articles (
  slug text primary key check (slug in ('liquindo', 'liquin-plan', 'lnf', 'integralist-front', 'npf')),
  title text not null,
  content_html text not null check (char_length(content_html) <= 200000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.wiki_revisions (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null check (article_slug in ('liquindo', 'liquin-plan', 'lnf', 'integralist-front', 'npf')),
  title text not null,
  content_html text not null check (char_length(content_html) <= 200000),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text
);

alter table public.wiki_permissions enable row level security;
alter table public.wiki_articles enable row level security;
alter table public.wiki_revisions enable row level security;

create or replace function public.can_manage_liquinwiki()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid() and wp.permission = 'liquinwiki_admin'
    );
$$;

create or replace function public.can_edit_liquinwiki()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission in ('liquinwiki_editor', 'liquinwiki_admin')
    );
$$;

revoke all on function public.can_manage_liquinwiki() from public;
revoke all on function public.can_edit_liquinwiki() from public;
grant execute on function public.can_manage_liquinwiki() to authenticated;
grant execute on function public.can_edit_liquinwiki() to authenticated;

drop policy if exists "Anyone can read published wiki articles" on public.wiki_articles;
create policy "Anyone can read published wiki articles"
on public.wiki_articles for select to anon, authenticated
using (true);

drop policy if exists "Users can read own wiki permission" on public.wiki_permissions;
create policy "Users can read own wiki permission"
on public.wiki_permissions for select to authenticated
using (user_id = auth.uid() or public.can_manage_liquinwiki());

drop policy if exists "Wiki admins manage wiki permissions" on public.wiki_permissions;
create policy "Wiki admins manage wiki permissions"
on public.wiki_permissions for all to authenticated
using (public.can_manage_liquinwiki())
with check (public.can_manage_liquinwiki());

drop policy if exists "Editors and admins can read permitted revisions" on public.wiki_revisions;
create policy "Editors and admins can read permitted revisions"
on public.wiki_revisions for select to authenticated
using (submitted_by = auth.uid() or public.can_manage_liquinwiki());

drop policy if exists "Wiki editors can submit own pending revisions" on public.wiki_revisions;
create policy "Wiki editors can submit own pending revisions"
on public.wiki_revisions for insert to authenticated
with check (
  submitted_by = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and public.can_edit_liquinwiki()
);

revoke all on public.wiki_permissions from anon, authenticated;
grant select, insert, update, delete on public.wiki_permissions to authenticated;

revoke all on public.wiki_articles from anon, authenticated;
grant select on public.wiki_articles to anon, authenticated;

revoke all on public.wiki_revisions from anon, authenticated;
grant select, insert on public.wiki_revisions to authenticated;

create or replace function public.review_liquinwiki_revision(
  p_revision_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision public.wiki_revisions%rowtype;
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only LiquinWiki administrators can review revisions';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into v_revision
  from public.wiki_revisions
  where id = p_revision_id
  for update;

  if not found then
    raise exception 'Revision not found';
  end if;

  if v_revision.status <> 'pending' then
    raise exception 'This revision has already been reviewed';
  end if;

  if p_decision = 'approved' then
    insert into public.wiki_articles (slug, title, content_html, updated_by, updated_at)
    values (v_revision.article_slug, v_revision.title, v_revision.content_html, auth.uid(), now())
    on conflict (slug) do update
      set title = excluded.title,
          content_html = excluded.content_html,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at;
  end if;

  update public.wiki_revisions
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = left(coalesce(p_note, ''), 2000)
  where id = p_revision_id;
end;
$$;

revoke all on function public.review_liquinwiki_revision(uuid, text, text) from public;
grant execute on function public.review_liquinwiki_revision(uuid, text, text) to authenticated;

-- Keep the existing profiles.role values unchanged. Existing profile admins
-- automatically receive wiki administration rights through the functions above.
