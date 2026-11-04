-- Restrict LiquinWiki reading to signed-in Liquindo members and admins.
-- Existing article content and revision history are preserved.
create or replace function public.is_liquindo_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('member', 'admin')
  );
$$;

revoke all on function public.is_liquindo_member() from public, anon;
grant execute on function public.is_liquindo_member() to authenticated;

drop policy if exists "Anyone can read wiki pages" on public.wiki_pages;
drop policy if exists "Wiki pages are publicly readable" on public.wiki_pages;
drop policy if exists "Liquindo members can read wiki pages" on public.wiki_pages;
create policy "Liquindo members can read wiki pages"
  on public.wiki_pages
  for select
  to authenticated
  using (public.is_liquindo_member());

revoke all on table public.wiki_pages from anon;
revoke all on table public.wiki_pages from authenticated;
grant select on table public.wiki_pages to authenticated;
