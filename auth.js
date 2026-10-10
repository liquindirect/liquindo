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
let mode = "login";

function setMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? "#b42318" : "var(--teal)";
  message.setAttribute("role", error ? "alert" : "status");
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
function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  loginTab.setAttribute("aria-pressed", String(!signup));
  signupTab.setAttribute("aria-pressed", String(signup));
  submitButton.textContent = signup ? "Create account" : "Log in";
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
  confirmPasswordField.classList.toggle("auth-hidden", !signup);
  confirmPasswordInput.required = signup;
  if (!signup) confirmPasswordInput.value = "";
  forgotPasswordButton.classList.toggle("auth-hidden", signup);
  document.querySelector("#auth-heading").textContent = signup ? "Create your account" : "Welcome back";
  setMessage("");
}
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
  forgotPasswordButton.disabled = true;
  setMessage("Sending password recovery email…");
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("reset-password.html", window.location.href).href
    });
    if (error) throw error;
    setMessage("If an account exists for that email, a password recovery link has been sent. Check your inbox and spam folder.");
  } catch (error) {
    setMessage(recoveryErrorMessage(error), true);
  } finally {
    forgotPasswordButton.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
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
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: new URL("login.html", window.location.href).href }
      });
      if (error) throw error;
      setMessage(data.session
        ? "Account created and signed in."
        : "Account created. Check your email for a confirmation link before logging in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMessage("Signed in successfully.");
    }
  } catch (error) {
    setMessage(error.message || "Something went wrong. Please try again.", true);
  } finally {
    submitButton.disabled = false;
  }
});
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  accountMessage.textContent = "";
  const { error } = await supabase.auth.signOut();
  accountMessage.textContent = error ? error.message : "You have been logged out.";
  logoutButton.disabled = false;
});
supabase.auth.onAuthStateChange((_event, session) => showSession(session));
const { data: { session }, error } = await supabase.auth.getSession();
if (error) setMessage(error.message, true);
showSession(session);
