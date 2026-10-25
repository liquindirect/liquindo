alter table public.wiki_pages
  add column if not exists article_status text not null default 'incomplete';

alter table public.wiki_pages
  drop constraint if exists wiki_pages_article_status_check;

alter table public.wiki_pages
  add constraint wiki_pages_article_status_check
  check (article_status in ('complete', 'needs_work', 'incomplete'));

create or replace function public.set_liquinwiki_article_status(p_slug text, p_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only LiquinWiki administrators can assign article status.';
  end if;
  if p_status not in ('complete', 'needs_work', 'incomplete') then
    raise exception 'Invalid article status.';
  end if;
  update public.wiki_pages
    set article_status = p_status, updated_at = now(), updated_by = auth.uid()
    where slug = p_slug;
  if not found then raise exception 'Article not found.'; end if;
end;
$$;

revoke execute on function public.set_liquinwiki_article_status(text, text) from public, anon;
grant execute on function public.set_liquinwiki_article_status(text, text) to authenticated;
