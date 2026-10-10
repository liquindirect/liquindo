import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://uivjovkvpskvvazznlyr.supabase.co",
  "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
);

const loadingPanel = document.querySelector("#members-loading");
const signedOutPanel = document.querySelector("#members-signed-out");
const profilePanel = document.querySelector("#profile-panel");
const contentPanel = document.querySelector("#members-content");
const profileEmail = document.querySelector("#profile-email");
const profileRole = document.querySelector("#profile-role");
const displayNameInput = document.querySelector("#display-name");
const bioInput = document.querySelector("#profile-bio");
const profileForm = document.querySelector("#profile-form");
const saveButton = document.querySelector("#save-profile");
const profileStatus = document.querySelector("#profile-status");
const logoutButton = document.querySelector("#members-logout");
const directoryStatus = document.querySelector("#directory-status");
const directory = document.querySelector("#member-directory");
const directorySearch = document.querySelector("#directory-search");
let currentUser = null;

function showState(state) {
  loadingPanel.classList.toggle("members-hidden", state !== "loading");
  if (signedOutPanel) signedOutPanel.classList.add("members-hidden");
  contentPanel.classList.toggle("members-hidden", state === "loading");
  profilePanel.classList.toggle("members-hidden", state !== "signed-in");
}
function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "var(--teal)";
}
async function loadProfile() {
  if (!currentUser) return;
  profileEmail.textContent = currentUser.email || "Signed-in user";
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role, bio").eq("id", currentUser.id).maybeSingle();
  if (error) {
    showStatus(profileStatus, "Could not load your profile. Please set up the profiles table in Supabase first.", true);
    return;
  }
  if (!data) {
    showStatus(profileStatus, "Your profile row was not found. Please contact the site administrator.", true);
    return;
  }
  displayNameInput.value = data.display_name || "";
  bioInput.value = data.bio || "";
  profileRole.textContent = data.role || "member";
}
function filterDirectory() {
  const query = (directorySearch?.value || "").trim().toLocaleLowerCase();
  const items = [...directory.children];
  let visible = 0;
  for (const item of items) {
    const matches = !query || (item.dataset.searchText || item.textContent).toLocaleLowerCase().includes(query);
    item.hidden = !matches;
    if (matches) visible++;
  }
  if (items.length) {
    showStatus(directoryStatus, query
      ? `Showing ${visible} of ${items.length} members matching “${query}”.`
      : `Showing all ${items.length} members.`);
    if (query && visible === 0) showStatus(directoryStatus, "No members match that search.");
  }
}
directorySearch?.addEventListener("input", filterDirectory);

async function loadDirectory() {
  directory.replaceChildren();
  showStatus(directoryStatus, "Loading members…");
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role, bio").order("display_name", { ascending: true });
  if (error) {
    showStatus(directoryStatus, "Could not load the directory. The public read policy may not be enabled in Supabase.", true);
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
    const main = document.createElement("div");
    main.className = "member-main";
    main.append(name);
    const roleLine = document.createElement("div");
    roleLine.className = "member-role";
    roleLine.textContent = member.role || "member";
    main.append(roleLine);

    const bio = document.createElement("p");
    bio.className = "member-bio";
    bio.hidden = true;
    bio.textContent = member.bio || "This member hasn't added a bio yet.";

    const toggle = document.createElement("button");
    toggle.className = "member-bio-toggle";
    toggle.type = "button";
    toggle.textContent = "↓";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Show " + (member.display_name || "member") + "'s bio");
    toggle.addEventListener("click", () => {
      const opening = bio.hidden;
      bio.hidden = !opening;
      toggle.textContent = opening ? "↑" : "↓";
      toggle.setAttribute("aria-expanded", String(opening));
      toggle.setAttribute("aria-label", (opening ? "Hide " : "Show ") + (member.display_name || "member") + "'s bio");
    });

    const info = document.createElement("div");
    info.className = "member-main";
    info.append(main, bio);
    item.append(info, toggle);
    directory.append(item);
  }
  filterDirectory();
}
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const displayName = displayNameInput.value.trim();
  const bio = bioInput.value.trim();
  if (!displayName || displayName.length > 40) {
    showStatus(profileStatus, "Please enter a display name between 1 and 40 characters.", true);
    return;
  }
  saveButton.disabled = true;
  showStatus(profileStatus, "Saving your profile…");
  try {
    const { error } = await supabase.from("profiles")
      .update({ display_name: displayName, bio }).eq("id", currentUser.id);
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
    await loadDirectory();
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
