import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://uivjovkvpskvvazznlyr.supabase.co",
  "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
);

const loadingPanel = document.querySelector("#members-loading");
const signedOutPanel = document.querySelector("#members-signed-out");
const contentPanel = document.querySelector("#members-content");
const profileEmail = document.querySelector("#profile-email");
const profileRole = document.querySelector("#profile-role");
const displayNameInput = document.querySelector("#display-name");
const profileForm = document.querySelector("#profile-form");
const saveButton = document.querySelector("#save-profile");
const profileStatus = document.querySelector("#profile-status");
const logoutButton = document.querySelector("#members-logout");
const directoryStatus = document.querySelector("#directory-status");
const directory = document.querySelector("#member-directory");
let currentUser = null;

function showState(state) {
  loadingPanel.classList.toggle("members-hidden", state !== "loading");
  signedOutPanel.classList.toggle("members-hidden", state !== "signed-out");
  contentPanel.classList.toggle("members-hidden", state !== "signed-in");
}
function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "var(--teal)";
}
async function loadProfile() {
  if (!currentUser) return;
  profileEmail.textContent = currentUser.email || "Signed-in user";
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role").eq("id", currentUser.id).single();
  if (error) {
    showStatus(profileStatus, "Could not load your profile. Please set up the profiles table in Supabase first.", true);
    return;
  }
  displayNameInput.value = data.display_name || "";
  profileRole.textContent = data.role || "member";
}
async function loadDirectory() {
  directory.replaceChildren();
  showStatus(directoryStatus, "Loading members…");
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role").order("display_name", { ascending: true });
  if (error) {
    showStatus(directoryStatus, "Could not load the directory. Check the Supabase profile table and access policies.", true);
    return;
  }
  if (!data.length) {
    showStatus(directoryStatus, "No member profiles yet.");
    return;
  }
  showStatus(directoryStatus, "");
  for (const member of data) {
    const item = document.createElement("li");
    item.className = "member-item";
    const name = document.createElement("strong");
    name.textContent = member.display_name || "Member";
    const role = document.createElement("span");
    role.className = "member-role";
    role.textContent = member.role || "member";
    item.append(name, role);
    directory.append(item);
  }
}
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const displayName = displayNameInput.value.trim();
  if (!displayName || displayName.length > 40) {
    showStatus(profileStatus, "Please enter a display name between 1 and 40 characters.", true);
    return;
  }
  saveButton.disabled = true;
  showStatus(profileStatus, "Saving your profile…");
  try {
    const { error } = await supabase.from("profiles")
      .update({ display_name: displayName }).eq("id", currentUser.id);
    if (error) throw error;
    showStatus(profileStatus, "Your profile has been saved.");
    await loadDirectory();
  } catch (error) {
    showStatus(profileStatus, error.message || "Could not save your profile.", true);
  } finally {
    saveButton.disabled = false;
  }
});
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  if (error) showStatus(profileStatus, error.message, true);
  else window.location.href = "login.html";
  logoutButton.disabled = false;
});
async function initialize() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    showState("signed-out");
    return;
  }
  currentUser = session.user;
  showState("signed-in");
  await loadProfile();
  await loadDirectory();
}
supabase.auth.onAuthStateChange((_event, session) => {
  if (!session?.user) {
    currentUser = null;
    showState("signed-out");
  } else if (currentUser?.id !== session.user.id) {
    currentUser = session.user;
    showState("signed-in");
    loadProfile();
    loadDirectory();
  }
});
await initialize();
