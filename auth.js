import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const USERNAME_AUTH_URL = SUPABASE_URL + "/functions/v1/username-auth";

const form = document.querySelector("#auth-form");
const identifierInput = document.querySelector("#email");
const recoveryEmailInput = document.querySelector("#recovery-email");
const recoveryEmailField = document.querySelector("#recovery-email-field");
const identifierLabel = document.querySelector("#login-identifier-label");
const passwordInput = document.querySelector("#password");
const confirmPasswordInput = document.querySelector("#confirm-password");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const submitButton = document.querySelector("#submit-button");
const message = document.querySelector("#auth-message");
const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");
const formPanel = document.querySelector("#auth-form-panel");
const accountPanel = document.querySelector("#auth-account-panel");
const accountEmail = document.querySelector("#account-email");
const accountMessage = document.querySelector("#account-message");
const logoutButton = document.querySelector("#logout-button");
const forgotPasswordButton = document.querySelector("#forgot-password-button");
const turnstileElement = document.querySelector("#turnstile-widget");
const TURNSTILE_SITE_KEY = "0x4AAAAAAFWAloaUC3WLdJTI";
let turnstileWidgetId = null;
let captchaToken = "";
let mode = "login";

const AUTH_MESSAGE_KEYS = new Map([
  ["Sending password recovery email…", "auth.msg.recoverySending"],
  ["If an account exists for that email, a password recovery link has been sent. Check your inbox and spam folder.", "auth.msg.recoverySent"],
  ["Too many recovery requests were made. Please wait a few minutes before trying again.", "auth.msg.rateLimit"],
  ["We could not reach the account service. Check your connection and try again.", "auth.msg.network"],
  ["We could not send a recovery email right now. Please try again shortly.", "auth.msg.recoveryError"],
  ["Creating your account…", "auth.msg.creating"],
  ["Signing in…", "auth.msg.signingIn"],
  ["The passwords do not match. Please check both fields.", "auth.msg.passwordMismatch"],
  ["Account created and signed in.", "auth.msg.createdSignedIn"],
  ["Account created. Check your email for a confirmation link before logging in.", "auth.msg.createdConfirm"],
  ["Signed in successfully.", "auth.msg.signedIn"],
  ["Something went wrong. Please try again.", "auth.msg.genericError"],
  ["You have been logged out.", "auth.msg.loggedOut"],
  ["Enter the email address associated with your account to reset your password.", "auth.msg.emailRequired"],
  ["Email or password is incorrect.", "auth.msg.invalidCredentials"],
  ["Please confirm your email using the link we sent before signing in.", "auth.msg.emailNotConfirmed"],
  ["An account may already exist for this email. Try logging in or using Forgot password.", "auth.msg.accountExists"],
  ["That password was rejected. Please choose a stronger password and try again.", "auth.msg.weakPassword"],
  ["Enter a valid email address.", "auth.msg.invalidEmail"]
]);

function setMessage(text, error = false) {
  const key = AUTH_MESSAGE_KEYS.get(text);
  message.dataset.i18nMessageKey = key || (error && text ? "auth.msg.authError" : "");
  message.textContent = key && window.languageManager ? window.languageManager.get(key) : text;
  message.style.color = error ? "#b42318" : "var(--teal)";
  message.setAttribute("role", error ? "alert" : "status");
}
function authErrorMessage(error) {
  const detail = (error?.message || error?.error || "").toLowerCase();
  const code = (error?.code || "").toLowerCase();
  if (/captcha|turnstile|security verification/.test(detail) || code === "captcha_failed") return "CAPTCHA verification failed or expired. Please complete the security check and try again.";
  if (/network|fetch|failed to fetch|load failed/i.test(detail)) return "We could not reach the account service. Check your connection and try again.";
  if (/invalid login credentials|invalid_credentials|username or password is incorrect/.test(detail) || code === "invalid_credentials") return "Email or password is incorrect.";
  if (/email not confirmed|email_not_confirmed/.test(detail) || code === "email_not_confirmed") return "Please confirm your email using the link we sent before signing in.";
  if (/user already registered|already exists|user_already_exists|username is already taken/.test(detail) || code === "user_already_exists") return "An account may already exist for this email. Try logging in or using Forgot password.";
  if (/password.*(short|weak|common)|should be at least|weak_password/.test(detail) || code === "weak_password") return "That password was rejected. Please choose a stronger password and try again.";
  if (/invalid email|email_address_invalid/.test(detail) || code === "email_address_invalid") return "Enter a valid email address.";
  if (/not configured yet/.test(detail)) return error.message || error.error;
  return error?.message || error?.error || "Something went wrong. Please try again.";
}
function recoveryErrorMessage(error) {
  if (error?.code === "over_email_send_rate_limit" || /rate limit|too many requests/i.test(error?.message || "")) return "Too many recovery requests were made. Please wait a few minutes before trying again.";
  if (/network|fetch/i.test(error?.message || "")) return "We could not reach the account service. Check your connection and try again.";
  return "We could not send a recovery email right now. Please try again shortly.";
}
async function initialiseTurnstile() {
  if (!turnstileElement) return;
  if (!window.turnstile) {
    const script = document.querySelector("#turnstile-script");
    if (script) await new Promise((resolve, reject) => {
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
    });
  }
  if (!window.turnstile) throw new Error("CAPTCHA could not load. Please refresh and try again.");
  turnstileWidgetId = window.turnstile.render(turnstileElement, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: token => { captchaToken = token; },
    "expired-callback": () => { captchaToken = ""; },
    "error-callback": () => { captchaToken = ""; setMessage("CAPTCHA could not load. Please refresh and try again.", true); }
  });
}
function getCaptchaToken() {
  const token = (turnstileWidgetId !== null && window.turnstile?.getResponse(turnstileWidgetId)) || captchaToken;
  if (!token) throw new Error("Please complete the CAPTCHA check before continuing.");
  return token;
}
function resetCaptcha() {
  captchaToken = "";
  if (turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId);
}
async function usernameAuth(payload) {
  const response = await fetch(USERNAME_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Account request failed.");
  return result;
}
void initialiseTurnstile().catch(() => setMessage("CAPTCHA could not load. Please refresh and try again.", true));

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  loginTab.setAttribute("aria-pressed", String(!signup));
  signupTab.setAttribute("aria-pressed", String(signup));
  submitButton.textContent = window.languageManager?.get(signup ? "auth.create" : "auth.login") || (signup ? "Create account" : "Log in");
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
  confirmPasswordField.classList.toggle("auth-hidden", !signup);
  confirmPasswordInput.required = signup;
  recoveryEmailField.classList.toggle("auth-hidden", !signup);
  recoveryEmailInput.required = false;
  identifierInput.autocomplete = signup ? "username" : "username";
  identifierInput.type = "text";
  identifierInput.required = true;
  identifierLabel.firstChild.textContent = signup ? "Username" : "Username or email address";
  identifierInput.placeholder = signup ? "Choose a username" : "Username or email address";
  recoveryEmailInput.placeholder = "you@example.com";
  if (!signup) {
    confirmPasswordInput.value = "";
    recoveryEmailInput.value = "";
  }
  forgotPasswordButton.classList.toggle("auth-hidden", signup);
  document.querySelector("#auth-heading").textContent = window.languageManager?.get(signup ? "auth.create" : "auth.welcome") || (signup ? "Create your account" : "Welcome back");
  setMessage("");
}
document.addEventListener("liquindo-language-changed", () => {
  const key = message.dataset.i18nMessageKey;
  const role = message.getAttribute("role") || "status";
  const color = message.style.color;
  setMode(mode);
  if (key && window.languageManager) {
    message.dataset.i18nMessageKey = key;
    message.textContent = window.languageManager.get(key);
    message.setAttribute("role", role);
    message.style.color = color;
  }
  if (accountMessage.dataset.i18nMessageKey && window.languageManager) accountMessage.textContent = window.languageManager.get(accountMessage.dataset.i18nMessageKey);
});
function showSession(session) {
  const signedIn = Boolean(session?.user);
  formPanel.classList.toggle("auth-hidden", signedIn);
  accountPanel.classList.toggle("auth-hidden", !signedIn);
  if (signedIn) {
    const username = session.user.user_metadata?.username;
    accountEmail.textContent = username ? "Signed in as " + username : (session.user.email || "Signed-in user");
  }
}
confirmPasswordInput.addEventListener("input", () => confirmPasswordInput.removeAttribute("aria-invalid"));
loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

forgotPasswordButton.addEventListener("click", async () => {
  let email = identifierInput.value.trim();
  if (!email.includes("@")) email = window.prompt("Enter the recovery email address associated with your account:");
  if (!email || !email.trim()) {
    setMessage("Enter the email address associated with your account to reset your password.", true);
    return;
  }
  email = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setMessage("Enter a valid email address.", true);
    return;
  }
  forgotPasswordButton.disabled = true;
  setMessage("Sending password recovery email…");
  try {
    const token = getCaptchaToken();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("reset-password.html", window.location.href).href,
      captchaToken: token
    });
    if (error) throw error;
    setMessage("If an account exists for that email, a password recovery link has been sent. Check your inbox and spam folder.");
  } catch (error) {
    setMessage(recoveryErrorMessage(error), true);
  } finally {
    resetCaptcha();
    forgotPasswordButton.disabled = false;
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  submitButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  setMessage(mode === "signup" ? "Creating your account…" : "Signing in…");
  try {
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;
    const recoveryEmail = recoveryEmailInput.value.trim();
    if (mode === "signup" && !/^[a-zA-Z0-9_]{3,24}$/.test(identifier)) {
      setMessage("Username must be 3–24 characters and use only letters, numbers, or underscores.", true);
      identifierInput.focus();
      return;
    }
    if (mode === "signup" && recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      setMessage("Enter a valid recovery email address, or leave it blank.", true);
      recoveryEmailInput.focus();
      return;
    }
    if (mode === "signup" && password !== confirmPasswordInput.value) {
      confirmPasswordInput.setAttribute("aria-invalid", "true");
      setMessage("The passwords do not match. Please check both fields.", true);
      confirmPasswordInput.focus();
      return;
    }
    confirmPasswordInput.removeAttribute("aria-invalid");
    const token = getCaptchaToken();
    if (mode === "signup") {
      if (recoveryEmail) {
        const { data, error } = await supabase.auth.signUp({
          email: recoveryEmail,
          password,
          options: {
            data: { username: identifier.toLowerCase(), display_name: identifier },
            emailRedirectTo: new URL("login.html", window.location.href).href,
            captchaToken: token
          }
        });
        if (error) throw error;
        setMessage(data.session
          ? "Account created and signed in."
          : "Account created. Check your email for a confirmation link before logging in.");
      } else {
        const result = await usernameAuth({ action: "signup-no-email", username: identifier, password, captchaToken: token });
        if (result.session) {
          const { error } = await supabase.auth.setSession(result.session);
          if (error) throw error;
          setMessage("Account created and signed in.");
        } else {
          setMessage(result.message || "Account created. Please log in with your username.");
        }
      }
    } else if (identifier.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password, options: { captchaToken: token } });
      if (error) throw error;
      setMessage("Signed in successfully.");
    } else {
      const result = await usernameAuth({ action: "username-login", username: identifier, password, captchaToken: token });
      const { error } = await supabase.auth.setSession(result.session);
      if (error) throw error;
      setMessage("Signed in successfully.");
    }
    if (mode === "login") {
      const requestedPage = new URLSearchParams(window.location.search).get("next");
      if (requestedPage === "gallery.html") {
        window.location.replace("gallery.html");
        return;
      }
    }
  } catch (error) {
    setMessage(authErrorMessage(error), true);
  } finally {
    resetCaptcha();
    submitButton.disabled = false;
    form.removeAttribute("aria-busy");
  }
});
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  accountMessage.textContent = "";
  let error = null;
  try { error = (await supabase.auth.signOut()).error; } catch (e) { error = e; }
  accountMessage.dataset.i18nMessageKey = error ? "auth.msg.authError" : "auth.msg.loggedOut";
  accountMessage.textContent = window.languageManager?.get(accountMessage.dataset.i18nMessageKey) || (error ? "We could not complete that account request. Check your details and try again." : "You have been logged out.");
  logoutButton.disabled = false;
});
supabase.auth.onAuthStateChange((_event, session) => showSession(session));
const { data: { session }, error } = await supabase.auth.getSession();
if (error) setMessage("We could not complete that account request. Check your details and try again.", true);
showSession(session);
