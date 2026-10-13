import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.querySelector("#auth-form");
const emailInput = document.querySelector("#email");
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
  ["Enter your email address first, then select Forgot password again.", "auth.msg.emailRequired"],
  ["Email or password is incorrect.", "auth.msg.invalidCredentials"],
  ["Please confirm your email using the link we sent before signing in.", "auth.msg.emailNotConfirmed"],
  ["An account may already exist for this email. Try logging in or using Forgot password.", "auth.msg.accountExists"],
  ["That password was rejected. Please choose a stronger password and try again.", "auth.msg.weakPassword"],
  ["Enter a valid email address.", "auth.msg.invalidEmail"]
]);

function setMessage(text, error = false) {
  const messageKey = AUTH_MESSAGE_KEYS.get(text);
  const safeKey = messageKey || (error && text ? "auth.msg.authError" : null);
  message.dataset.i18nMessageKey = safeKey || "";
  message.textContent = safeKey && window.languageManager ? window.languageManager.get(safeKey) : text;
  message.style.color = error ? "#b42318" : "var(--teal)";
  message.setAttribute("role", error ? "alert" : "status");
}
function authErrorMessage(error) {
  const detail = (error?.message || "").toLowerCase();
  const code = (error?.code || "").toLowerCase();
  if (/network|fetch|failed to fetch|load failed/i.test(detail)) {
    return "We could not reach the account service. Check your connection and try again.";
  }
  if (/invalid login credentials|invalid_credentials/.test(detail) || code === "invalid_credentials") {
    return "Email or password is incorrect.";
  }
  if (/email not confirmed|email_not_confirmed/.test(detail) || code === "email_not_confirmed") {
    return "Please confirm your email using the link we sent before signing in.";
  }
  if (/user already registered|already exists|user_already_exists/.test(detail) || code === "user_already_exists") {
    return "An account may already exist for this email. Try logging in or using Forgot password.";
  }
  if (/password.*(short|weak|common)|should be at least|weak_password/.test(detail) || code === "weak_password") {
    return "That password was rejected. Please choose a stronger password and try again.";
  }
  if (/invalid email|email_address_invalid/.test(detail) || code === "email_address_invalid") {
    return "Enter a valid email address.";
  }
  return "Something went wrong. Please try again.";
}
function recoveryErrorMessage(error) {
  if (error?.code === "over_email_send_rate_limit" || /rate limit|too many requests/i.test(error?.message || "")) {
    return "Too many recovery requests were made. Please wait a few minutes before trying again.";
  }
  if (/network|fetch/i.test(error?.message || "")) {
    return "We could not reach the account service. Check your connection and try again.";
  }
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
    callback: (token) => { captchaToken = token; },
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
  if (!signup) confirmPasswordInput.value = "";
  forgotPasswordButton.classList.toggle("auth-hidden", signup);
  document.querySelector("#auth-heading").textContent = window.languageManager?.get(signup ? "auth.create" : "auth.welcome") || (signup ? "Create your account" : "Welcome back");
  setMessage("");
}
document.addEventListener("liquindo-language-changed", () => {
  const previousKey = message.dataset.i18nMessageKey;
  const previousRole = message.getAttribute("role") || "status";
  const previousColor = message.style.color;
  setMode(mode);
  if (previousKey && window.languageManager) {
    message.dataset.i18nMessageKey = previousKey;
    message.textContent = window.languageManager.get(previousKey);
    message.setAttribute("role", previousRole);
    message.style.color = previousColor;
  }
  if (accountMessage.dataset.i18nMessageKey && window.languageManager) accountMessage.textContent = window.languageManager.get(accountMessage.dataset.i18nMessageKey);
});
function showSession(session) {
  const signedIn = Boolean(session?.user);
  formPanel.classList.toggle("auth-hidden", signedIn);
  accountPanel.classList.toggle("auth-hidden", !signedIn);
  if (signedIn) accountEmail.textContent = session.user.email || "Signed-in user";
}
confirmPasswordInput.addEventListener("input", () => confirmPasswordInput.removeAttribute("aria-invalid"));
loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));
forgotPasswordButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) {
    setMessage("Enter your email address first, then select Forgot password again.", true);
    emailInput.focus();
    return;
  }
  if (!emailInput.checkValidity()) {
    setMessage("Enter a valid email address.", true);
    emailInput.reportValidity();
    emailInput.focus();
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  setMessage(mode === "signup" ? "Creating your account…" : "Signing in…");
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (mode === "signup" && password !== confirmPasswordInput.value) {
      confirmPasswordInput.setAttribute("aria-invalid", "true");
      setMessage("The passwords do not match. Please check both fields.", true);
      confirmPasswordInput.focus();
      return;
    }
    confirmPasswordInput.removeAttribute("aria-invalid");
    const token = getCaptchaToken();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: new URL("login.html", window.location.href).href, captchaToken: token }
      });
      if (error) throw error;
      setMessage(data.session
        ? "Account created and signed in."
        : "Account created. Check your email for a confirmation link before logging in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
      if (error) throw error;
      setMessage("Signed in successfully.");
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
  try {
    const result = await supabase.auth.signOut();
    error = result.error;
  } catch (signOutError) {
    error = signOutError;
  }
  accountMessage.dataset.i18nMessageKey = error ? "auth.msg.authError" : "auth.msg.loggedOut";
  accountMessage.textContent = window.languageManager?.get(accountMessage.dataset.i18nMessageKey) || (error ? "We could not complete that account request. Check your details and try again." : "You have been logged out.");
  logoutButton.disabled = false;
});
supabase.auth.onAuthStateChange((_event, session) => showSession(session));
const { data: { session }, error } = await supabase.auth.getSession();
if (error) setMessage("We could not complete that account request. Check your details and try again.", true);
showSession(session);
