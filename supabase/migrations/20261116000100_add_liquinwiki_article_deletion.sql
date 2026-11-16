-- Permanently remove LiquinWiki articles, including embedded baseline articles.
-- A tombstone prevents an article embedded in wiki.html from reappearing after deletion.
begin;

create table if not exists public.wiki_deleted_articles (
  slug text primary key,
  deleted_by uuid not null references auth.users(id) on delete restrict,
  deleted_at timestamptz not null default now()
);

alter table public.wiki_deleted_articles enable row level security;
revoke all on public.wiki_deleted_articles from public, anon, authenticated;
grant select on public.wiki_deleted_articles to authenticated;

drop policy if exists "Members can read deleted LiquinWiki article slugs" on public.wiki_deleted_articles;
create policy "Members can read deleted LiquinWiki article slugs"
on public.wiki_deleted_articles for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('member', 'admin')
  )
);

create or replace function public.delete_liquinwiki_article(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page_id bigint;
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only Liquin administrators can delete LiquinWiki articles';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 80 then
    raise exception 'Invalid article URL slug';
  end if;

  select id into v_page_id
  from public.wiki_pages
  where slug = p_slug
  order by id
  limit 1
  for update;

  -- Remove the associated revision history, including legacy rows without page_id.
  delete from public.wiki_revisions
  where slug = p_slug or (v_page_id is not null and page_id = v_page_id);

  if v_page_id is not null then
    delete from public.wiki_pages where id = v_page_id and slug = p_slug;
  end if;

  insert into public.wiki_deleted_articles (slug, deleted_by, deleted_at)
  values (p_slug, auth.uid(), now())
  on conflict (slug) do update
    set deleted_by = excluded.deleted_by, deleted_at = excluded.deleted_at;
end;
$$;

revoke all on function public.delete_liquinwiki_article(text) from public, anon;
grant execute on function public.delete_liquinwiki_article(text) to authenticated;

commit;
