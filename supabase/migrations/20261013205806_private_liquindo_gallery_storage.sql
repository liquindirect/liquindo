-- Private storage bucket for Liquindo gallery assets.
insert into storage.buckets (id, name, public)
values ('liquindo-gallery', 'liquindo-gallery', false)
on conflict (id) do update set public = false;

drop policy if exists "Admins manage Liquindo gallery objects" on storage.objects;
create policy "Admins manage Liquindo gallery objects"
on storage.objects for all to authenticated
using (bucket_id = 'liquindo-gallery' and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
))
with check (bucket_id = 'liquindo-gallery' and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

drop policy if exists "Authenticated users read Liquindo gallery objects" on storage.objects;
create policy "Authenticated users read Liquindo gallery objects"
on storage.objects for select to authenticated
using (bucket_id = 'liquindo-gallery');
