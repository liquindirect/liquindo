-- Liquindo role and LiquinWiki permission-system repair.
-- Apply once in Supabase SQL Editor after deploying the matching website commit.
-- Preserves profiles, member/admin roles, articles, revisions and existing permission rows.

begin;

-- Support multiple independent wiki permissions per account. Existing rows are retained.
alter table public.wiki_permissions
  drop constraint if exists wiki_permissions_pkey;
alter table public.wiki_permissions
  add constraint wiki_permissions_pkey primary key (user_id, permission);

alter table public.wiki_permissions
  drop constraint if exists wiki_permissions_permission_check;
alter table public.wiki_permissions
  add constraint wiki_permissions_permission_check
  check (permission in (
    'liquinwiki_editor',
    'liquinwiki_creator',
    'liquinwiki_trusted_editor',
    'liquinwiki_admin'
  ));

-- A Creator can create new articles only. Editor grants existing-article editing.
-- Trusted Editor and Wiki Administrator retain their respective elevated capabilities.
create or replace function public.can_edit_existing_liquinwiki()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission in ('liquinwiki_editor', 'liquinwiki_trusted_editor')
    );
$$;

create or replace function public.can_create_liquinwiki_articles()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission in ('liquinwiki_creator', 'liquinwiki_trusted_editor')
    );
$$;

create or replace function public.can_publish_liquinwiki_directly()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_manage_liquinwiki()
    or exists (
      select 1 from public.wiki_permissions wp
      where wp.user_id = auth.uid()
        and wp.permission = 'liquinwiki_trusted_editor'
    );
$$;

create or replace function public.can_edit_liquinwiki()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.can_edit_existing_liquinwiki()
      or public.can_create_liquinwiki_articles();
$$;

revoke all on function public.can_edit_existing_liquinwiki() from public, anon;
revoke all on function public.can_create_liquinwiki_articles() from public, anon;
revoke all on function public.can_publish_liquinwiki_directly() from public, anon;
revoke all on function public.can_edit_liquinwiki() from public, anon;
grant execute on function public.can_edit_existing_liquinwiki() to authenticated;
grant execute on function public.can_create_liquinwiki_articles() to authenticated;
grant execute on function public.can_publish_liquinwiki_directly() to authenticated;
grant execute on function public.can_edit_liquinwiki() to authenticated;

-- Enforce the distinct capabilities in the database, not just in the browser.
drop policy if exists "Wiki editors can submit pending revisions" on public.wiki_revisions;
create policy "Wiki editors can submit pending revisions" on public.wiki_revisions
for insert to authenticated
with check (
  edited_by = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and case
    when is_new_article then public.can_create_liquinwiki_articles()
    else public.can_edit_existing_liquinwiki()
  end
);

-- Permission assignment is additive; revoke:role removes one permission; none clears all.
create or replace function public.set_liquinwiki_permission(p_email text, p_permission text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_permission text;
begin
  if not public.can_manage_liquinwiki() then
    raise exception 'Only LiquinWiki administrators can manage editor permissions';
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
  if v_permission not in (
    'liquinwiki_editor','liquinwiki_creator',
    'liquinwiki_trusted_editor','liquinwiki_admin'
  ) then
    raise exception 'Invalid wiki permission';
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

-- Keep direct publishing restricted to administrators and trusted editors.
create or replace function public.publish_liquinwiki_trusted_editor_revision(
  p_slug text, p_title text, p_content text
)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_page_id bigint;
  v_revision_id bigint;
  v_now timestamptz := now();
begin
  if not public.can_publish_liquinwiki_directly() then
    raise exception 'Only administrators and trusted editors can publish directly';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 80 then
    raise exception 'Invalid article URL slug';
  end if;
  if p_title is null or length(trim(p_title)) = 0 or length(p_title) > 120 then
    raise exception 'Article title must contain 1-120 characters';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'Article content cannot be empty';
  end if;
  if length(p_content) > 200000 then
    raise exception 'Article content is too long to publish';
  end if;

  select id into v_page_id from public.wiki_pages
  where slug = p_slug order by id limit 1 for update;

  if v_page_id is null then
    insert into public.wiki_pages
      (slug, title, content, created_by, updated_by, created_at, updated_at)
    values (p_slug, p_title, p_content, auth.uid(), auth.uid(), v_now, v_now)
    returning id into v_page_id;
  else
    update public.wiki_pages
    set title = p_title, content = p_content, updated_by = auth.uid(), updated_at = v_now
    where id = v_page_id and slug = p_slug;
    if not found then raise exception 'The matching wiki page could not be updated'; end if;
  end if;

  insert into public.wiki_revisions
    (page_id, slug, title, content, edited_by, edited_at, status, reviewed_by, reviewed_at, review_note)
  values
    (v_page_id, p_slug, p_title, p_content, auth.uid(), v_now, 'approved', auth.uid(), v_now,
     'Published directly by a trusted editor or administrator; approval not required.')
  returning id into v_revision_id;
  return v_revision_id;
end;
$$;
revoke all on function public.publish_liquinwiki_trusted_editor_revision(text, text, text) from public, anon;
grant execute on function public.publish_liquinwiki_trusted_editor_revision(text, text, text) to authenticated;

-- Make the existing audit log readable by LiquinWiki administrators too.
drop policy if exists "Admins read admin audit log" on public.admin_audit_log;
create policy "Admins read admin audit log" on public.admin_audit_log
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or public.can_manage_liquinwiki()
);

-- Record the exact permission change, not just the row operation.
drop trigger if exists audit_wiki_permissions_changes on public.wiki_permissions;
create or replace function public.audit_liquinwiki_permission_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op <> 'INSERT' then
    v_old := jsonb_build_object(
      'permission', old.permission,
      'granted_by', old.granted_by,
      'granted_at', old.granted_at
    );
    v_user_id := old.user_id;
  end if;
  if tg_op <> 'DELETE' then
    v_new := jsonb_build_object(
      'permission', new.permission,
      'granted_by', new.granted_by,
      'granted_at', new.granted_at
    );
    v_user_id := new.user_id;
  end if;
  insert into public.admin_audit_log(actor_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'wiki_permissions.' || lower(tg_op),
    'wiki_permissions',
    v_user_id::text,
    jsonb_build_object('old', v_old, 'new', v_new)
  );
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
create trigger audit_wiki_permissions_changes
after insert or update or delete on public.wiki_permissions
for each row execute function public.audit_liquinwiki_permission_change();

-- Enable permission-change notifications for active sessions when Realtime is available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wiki_permissions'
    ) then
      alter publication supabase_realtime add table public.wiki_permissions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
    ) then
      alter publication supabase_realtime add table public.profiles;
    end if;
  end if;
end;
$$;

commit;
