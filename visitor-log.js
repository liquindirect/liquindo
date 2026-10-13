import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { "Content-Type": "application/json", "apikey": SUPABASE_PUBLISHABLE_KEY };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    await fetch(`${SUPABASE_URL}/functions/v1/visitor-log`, {
      method: "POST",
      headers,
      body: "{}",
      keepalive: true,
      credentials: "omit"
    });
  } catch {
    // Visitor logging is best-effort and must never disrupt the site.
  }
})();
