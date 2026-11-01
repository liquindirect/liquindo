-- Dedicated public article-image bucket. Uploads remain restricted to assigned wiki editors.
-- Public read is intentional so published article images work without a signed-in session.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'liquinwiki-images',
  'liquinwiki-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
);

create policy "LiquinWiki editors upload article images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'liquinwiki-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
    or exists (
      select 1
      from public.wiki_permissions wp
      where wp.user_id = (select auth.uid())
        and wp.permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor')
    )
  )
);

commit;
