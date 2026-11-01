create or replace function public.can_edit_existing_liquinwiki()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.can_manage_liquinwiki() or exists(select 1 from public.wiki_permissions wp where wp.user_id=(select auth.uid()) and wp.permission in ('liquinwiki_editor','liquinwiki_trusted_editor')); $$;
create or replace function public.can_create_liquinwiki_articles()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.can_manage_liquinwiki() or exists(select 1 from public.wiki_permissions wp where wp.user_id=(select auth.uid()) and wp.permission in ('liquinwiki_editor','liquinwiki_trusted_editor')); $$;
create or replace function public.can_publish_liquinwiki_directly()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.can_manage_liquinwiki() or exists(select 1 from public.wiki_permissions wp where wp.user_id=(select auth.uid()) and wp.permission='liquinwiki_trusted_editor'); $$;
revoke all on function public.can_edit_existing_liquinwiki() from public,anon;
grant execute on function public.can_edit_existing_liquinwiki() to authenticated;
revoke all on function public.can_create_liquinwiki_articles() from public,anon;
grant execute on function public.can_create_liquinwiki_articles() to authenticated;
revoke all on function public.can_publish_liquinwiki_directly() from public,anon;
grant execute on function public.can_publish_liquinwiki_directly() to authenticated;