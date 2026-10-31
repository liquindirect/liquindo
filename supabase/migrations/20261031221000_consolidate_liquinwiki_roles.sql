-- Consolidate LiquinWiki roles:
-- Wiki Editor can edit existing articles and submit new articles for approval.
-- Trusted Editor absorbs Wiki Administrator powers and can publish/manage the wiki.
begin;

alter table public.wiki_permissions
  drop constraint if exists wiki_permissions_permission_check;

-- Preserve existing access while consolidating retired assignments.
insert into public.wiki_permissions (user_id, permission, granted_by, granted_at)
select user_id,
       case
         when permission in ('liquinwiki_creator', 'liquinwiki_editor') then 'liquinwiki_editor'
         when permission in ('liquinwiki_admin', 'liquinwiki_trusted_editor') then 'liquinwiki_trusted_editor'
       end,
       granted_by,
       granted_at
from public.wiki_permissions
where permission in (
  'liquinwiki_creator', 'liquinwiki_editor',
  'liquinwiki_admin', 'liquinwiki_trusted_editor'
)
on conflict (user_id, permission) do nothing;

delete from public.wiki_permissions
where permission in ('liquinwiki_creator', 'liquinwiki_admin');

alter table public.wiki_permissions
  add constraint wiki_permissions_permission_check
  check (permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor'));

create or replace function public.can_manage_liquinwiki()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) or exists (
    select 1 from public.wiki_permissions wp
    where wp.user_id = auth.uid()
      and wp.permission = 'liquinwiki_trusted_editor'
  );
$$;

create or replace function public.can_edit_existing_liquinwiki()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission = 'liquinwiki_editor'
    );
$$;

create or replace function public.can_create_liquinwiki_articles()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission = 'liquinwiki_editor'
    );
$$;

create or replace function public.can_publish_liquinwiki_directly()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki();
$$;

create or replace function public.can_edit_liquinwiki()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.can_edit_existing_liquinwiki()
      or public.can_create_liquinwiki_articles();
$$;

revoke all on function public.can_manage_liquinwiki() from public, anon;
revoke all on function public.can_edit_existing_liquinwiki() from public, anon;
revoke all on function public.can_create_liquinwiki_articles() from public, anon;
revoke all on function public.can_publish_liquinwiki_directly() from public, anon;
revoke all on function public.can_edit_liquinwiki() from public, anon;
grant execute on function public.can_manage_liquinwiki() to authenticated;
grant execute on function public.can_edit_existing_liquinwiki() to authenticated;
grant execute on function public.can_create_liquinwiki_articles() to authenticated;
grant execute on function public.can_publish_liquinwiki_directly() to authenticated;
grant execute on function public.can_edit_liquinwiki() to authenticated;

drop policy if exists "Wiki editors can submit pending revisions" on public.wiki_revisions;
create policy "Wiki editors can submit pending revisions" on public.wiki_revisions
for insert to authenticated
with check (
  edited_by = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and case
    when is_new_article then (select public.can_create_liquinwiki_articles())
    else (select public.can_edit_existing_liquinwiki())
  end
);

create or replace function public.set_liquinwiki_permission(p_email text, p_permission text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_permission text;
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only Trusted Editors and website Administrators can manage LiquinWiki permissions';
  end if;
  if p_email is null or trim(p_email) = '' then
    raise exception 'Enter an account email address';
  end if;

  if p_permission = 'none' then
    select u.id into v_user_id from auth.users u
    where lower(u.email) = lower(trim(p_email)) limit 1;
    if v_user_id is null then raise exception 'No account found for that email address'; end if;
    delete from public.wiki_permissions where user_id = v_user_id;
    return;
  end if;

  v_permission := case
    when left(p_permission, 7) = 'revoke:' then substring(p_permission from 8)
    else p_permission
  end;
  if v_permission not in ('liquinwiki_editor', 'liquinwiki_trusted_editor') then
    raise exception 'Invalid LiquinWiki permission';
  end if;

  select u.id into v_user_id from auth.users u
  where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'No account found for that email address'; end if;

  if left(p_permission, 7) = 'revoke:' then
    delete from public.wiki_permissions
    where user_id = v_user_id and permission = v_permission;
  else
    insert into public.wiki_permissions (user_id, permission, granted_by, granted_at)
    values (v_user_id, v_permission, auth.uid(), now())
    on conflict (user_id, permission) do update
      set granted_by = excluded.granted_by, granted_at = excluded.granted_at;
  end if;
end;
$$;
revoke all on function public.set_liquinwiki_permission(text, text) from public, anon;
grant execute on function public.set_liquinwiki_permission(text, text) to authenticated;

commit;
