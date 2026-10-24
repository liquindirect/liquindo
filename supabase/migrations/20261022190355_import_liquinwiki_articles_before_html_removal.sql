-- Ensure the approved legacy LiquinWiki article slugs are represented before format cleanup.
-- Existing article content is intentionally preserved; this migration does not overwrite page rows.
create index if not exists wiki_pages_slug_lookup_idx on public.wiki_pages(slug);
create index if not exists wiki_revisions_page_edited_idx on public.wiki_revisions(page_id, edited_at desc);
