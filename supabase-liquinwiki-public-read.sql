-- LiquinWiki is intended to have a public reading directory and public published articles.
-- Editing, revisions, and administration remain protected by their existing policies.
drop policy if exists "Liquindo members can read wiki pages" on public.wiki_pages;
create policy "Anyone can read published LiquinWiki pages"
  on public.wiki_pages for select to anon, authenticated using (true);

grant select on table public.wiki_pages to anon, authenticated;

-- The deletion table contains only article slugs; public readers need these tombstones
-- so deleted pages are not accidentally reintroduced by the public directory loader.
drop policy if exists "Members can read deleted LiquinWiki article slugs" on public.wiki_deleted_articles;
create policy "Anyone can read deleted LiquinWiki article slugs"
  on public.wiki_deleted_articles for select to anon, authenticated using (true);

grant select on table public.wiki_deleted_articles to anon, authenticated;
