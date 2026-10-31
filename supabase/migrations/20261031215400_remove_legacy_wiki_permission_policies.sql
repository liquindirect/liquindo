-- Remove legacy permissive policies that could bypass the new role-specific checks.
-- Split wiki permission CRUD policies so the SELECT policy remains narrowly scoped.
begin;

drop policy if exists "Editors can create revisions" on public.wiki_revisions;
drop policy if exists "Revisions are readable by editors" on public.wiki_revisions;

drop policy if exists "Wiki admins manage wiki permissions" on public.wiki_permissions;
create policy "Wiki admins insert wiki permissions" on public.wiki_permissions
for insert to authenticated
with check ((select public.can_manage_liquinwiki()));
create policy "Wiki admins update wiki permissions" on public.wiki_permissions
for update to authenticated
using ((select public.can_manage_liquinwiki()))
with check ((select public.can_manage_liquinwiki()));
create policy "Wiki admins delete wiki permissions" on public.wiki_permissions
for delete to authenticated
using ((select public.can_manage_liquinwiki()));

drop policy if exists "Users can read own wiki permission" on public.wiki_permissions;
create policy "Users can read own wiki permission" on public.wiki_permissions
for select to authenticated
using (user_id = (select auth.uid()) or (select public.can_manage_liquinwiki()));

drop policy if exists "Editors and admins can read revisions" on public.wiki_revisions;
create policy "Editors and admins can read revisions" on public.wiki_revisions
for select to authenticated
using (edited_by = (select auth.uid()) or (select public.can_manage_liquinwiki()));

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

create index if not exists wiki_permissions_granted_by_idx
  on public.wiki_permissions(granted_by);
create index if not exists wiki_revisions_edited_by_idx
  on public.wiki_revisions(edited_by);
create index if not exists wiki_revisions_page_id_idx
  on public.wiki_revisions(page_id);
create index if not exists wiki_revisions_reviewed_by_idx
  on public.wiki_revisions(reviewed_by);
create index if not exists admin_audit_log_target_type_created_at_idx
  on public.admin_audit_log(target_type, created_at desc);

commit;
