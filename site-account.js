import { supabase } from "./supabase-client.js";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";

const accountLink = document.querySelector("#site-account-link");
const logoutButton = document.querySelector("#site-account-logout");

function translate(key, fallback) {
  return window.languageManager?.get?.(key) || fallback;
}

let currentSession = null;

function updateNavigation(session) {
  currentSession = session || null;
  const signedIn = Boolean(session?.user);
  const email = session?.user?.email || "";
  if (accountLink) {
    accountLink.textContent = signedIn
      ? translate("home.accountNavSignedIn", "Account · signed in")
      : translate("auth.access", "Account access");
    const title = signedIn
      ? `${translate("home.accountSignedInTitle", "Signed in as")} ${email || translate("auth.current", "your account")}`
      : translate("home.accountLoginTitle", "Account access");
    accountLink.title = title;
    accountLink.setAttribute("aria-label", signedIn
      ? `${translate("home.accountNavSignedIn", "Account · signed in")}, ${title}`
      : translate("auth.access", "Account access"));
    accountLink.dataset.accountState = signedIn ? "signed-in" : "signed-out";
  }
  if (logoutButton) {
    logoutButton.hidden = !signedIn;
    logoutButton.disabled = false;
    logoutButton.textContent = translate("auth.logout", "Log out");
    logoutButton.setAttribute("aria-label", translate("auth.logout", "Log out"));
  }
}

if (accountLink || logoutButton) {
  // Supabase emits INITIAL_SESSION when this listener is registered; avoid
  // a second getSession() read during page startup.
  supabase.auth.onAuthStateChange((_event, session) => updateNavigation(session));

  document.addEventListener("liquindo-language-changed", () => {
    updateNavigation(currentSession);
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
      logoutButton.textContent = translate("home.accountLogoutRetry", "Log out (retry)");
    }
  });
}
