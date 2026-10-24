-- Remove legacy anonymous read policies from LiquinWiki content tables.
drop policy if exists "Public can read wiki pages" on public.wiki_pages;
drop policy if exists "Anyone can read wiki pages" on public.wiki_pages;
drop policy if exists "Public can read wiki revisions" on public.wiki_revisions;
drop policy if exists "Anyone can read wiki revisions" on public.wiki_revisions;
