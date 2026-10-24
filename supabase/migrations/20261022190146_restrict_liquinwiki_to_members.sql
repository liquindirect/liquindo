-- Restrict LiquinWiki access to signed-in members while retaining public homepage access.
drop policy if exists "Public can read wiki pages" on public.wiki_pages;
drop policy if exists "Anyone can read wiki pages" on public.wiki_pages;
drop policy if exists "Members can read wiki pages" on public.wiki_pages;
create policy "Members can read wiki pages" on public.wiki_pages for select to authenticated using (true);

drop policy if exists "Public can read wiki revisions" on public.wiki_revisions;
drop policy if exists "Anyone can read wiki revisions" on public.wiki_revisions;
drop policy if exists "Members can read wiki revisions" on public.wiki_revisions;
create policy "Members can read wiki revisions" on public.wiki_revisions for select to authenticated using (true);
