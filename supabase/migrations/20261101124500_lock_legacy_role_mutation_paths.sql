-- Retire old role-management RPCs and direct table writes.
-- The unified admin_update_account_roles RPC is now the sole assignment path.
revoke all on function public.admin_update_profile(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.set_liquinwiki_permission(text, text)
  from public, anon, authenticated;
revoke all on function public.set_liquinwiki_role(uuid, text)
  from public, anon, authenticated;

-- Clients still need SELECT for their own wiki permission checks and realtime updates,
-- but all changes must pass through the atomic, admin-checked role assignment RPC.
revoke insert, update, delete on table public.wiki_permissions from authenticated;
