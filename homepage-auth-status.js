import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const accountLink = document.querySelector("#account-nav-link");

function updateAccountStatus(session) {
  if (!accountLink) return;
  const signedIn = Boolean(session?.user);
  accountLink.textContent = signedIn ? "Account (signed in)" : "Log in";
  accountLink.setAttribute("aria-label", signedIn ? "Account status: signed in" : "Log in to your Liquindo account");
  accountLink.title = signedIn ? "You are signed in. Open your account to manage your session." : "Sign in to your Liquindo account";
}

supabase.auth.onAuthStateChange((_event, session) => updateAccountStatus(session));

const { data: { session }, error } = await supabase.auth.getSession();
if (!error) updateAccountStatus(session);
