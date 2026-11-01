// One Supabase client per page/module graph. Every page module imports this
// singleton instead of creating independent auth refresh and storage listeners.
// Prefer the primary ESM CDN, with a pinned jsDelivr fallback if it is unavailable.
let createClient;
try {
  ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2.118.0"));
} catch (primaryError) {
  try {
    ({ createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm"));
  } catch (fallbackError) {
    throw new Error("The Supabase client could not load from either CDN.", { cause: fallbackError || primaryError });
  }
}

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";

// Make the browser persistence contract explicit. Supabase otherwise defaults to
// localStorage, but specifying it prevents accidental session-only configuration
// during future client refactors. Keep the same storage key so existing sessions
// remain readable after this deployment.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: "sb-uivjovkvpskvvazznlyr-auth-token"
  }
});
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
