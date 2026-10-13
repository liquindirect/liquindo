import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

try {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) {
    window.location.replace("login.html?next=gallery.html");
  } else {
    document.body.classList.add("gallery-access-ready");
  }
} catch (error) {
  // Fail closed: do not expose the gallery if authentication cannot be verified.
  window.location.replace("login.html?next=gallery.html");
}
