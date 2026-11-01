-- Public member directory: expose only the assigned role label.
-- This migration is also recorded in the linked Supabase project's migration history.
alter table public.wiki_permissions enable row level security;

revoke select on table public.wiki_permissions from anon, authenticated;
grant select (user_id, permission) on table public.wiki_permissions to anon, authenticated;

drop policy if exists "Public can read directory role assignments" on public.wiki_permissions;
create policy "Public can read directory role assignments"
on public.wiki_permissions
for select
to anon, authenticated
using (permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor'));

create or replace function public.get_public_member_directory()
returns table (
  id uuid,
  display_name text,
  role text,
  bio text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    case
      when p.role = 'admin' then 'Administrator'
      else coalesce((
        select case wp.permission
          when 'liquinwiki_trusted_editor' then 'LiquinWiki Trusted Editor'
          when 'liquinwiki_editor' then 'LiquinWiki Editor'
        end
        from public.wiki_permissions wp
        where wp.user_id = p.id
          and wp.permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor')
        order by case wp.permission
          when 'liquinwiki_trusted_editor' then 1
          else 2
        end
        limit 1
      ), 'Member')
    end as role,
    p.bio
  from public.profiles p
  order by p.display_name asc nulls last, p.id;
$$;

revoke all on function public.get_public_member_directory() from public;
grant execute on function public.get_public_member_directory() to anon, authenticated;
