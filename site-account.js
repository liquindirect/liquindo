import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const accountLink = document.querySelector("#site-account-link");
const logoutButton = document.querySelector("#site-account-logout");

function updateNavigation(session) {
  const signedIn = Boolean(session?.user);
  if (accountLink) {
    accountLink.textContent = signedIn ? "Account · signed in" : "Account";
    accountLink.title = signedIn
      ? `Signed in as ${session.user.email || "your account"}`
      : "Account access";
    accountLink.setAttribute("aria-label", signedIn
      ? `Account, signed in as ${session.user.email || "your account"}`
      : "Account access");
    accountLink.dataset.accountState = signedIn ? "signed-in" : "signed-out";
  }
  if (logoutButton) {
    logoutButton.hidden = !signedIn;
    logoutButton.disabled = false;
    logoutButton.textContent = "Log out";
    logoutButton.setAttribute("aria-label", "Log out of Liquindo");
  }
}

if (accountLink || logoutButton) {
  supabase.auth.onAuthStateChange((_event, session) => updateNavigation(session));
  supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      updateNavigation(data.session);
    })
    .catch(() => {
      if (accountLink) {
        accountLink.textContent = "Account";
        accountLink.removeAttribute("title");
        accountLink.dataset.accountState = "unknown";
      }
      if (logoutButton) logoutButton.hidden = true;
    });

  logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      updateNavigation(null);
      accountLink?.focus();
    } catch {
      logoutButton.disabled = false;
      logoutButton.textContent = "Log out (retry)";
    }
  });
}
