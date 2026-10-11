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
const directorySearchClear = document.querySelector("#directory-search-clear");
const directoryRoleFilter = document.querySelector("#directory-role-filter");
const directoryLetters = document.querySelector("#directory-letters");
const directoryCount = document.querySelector("#directory-count");
const bioCharacterCount = document.querySelector("#bio-character-count");
let savedProfileValues = null;
let currentUser = null;
let directoryMembers = [];
let activeLetter = "";
const t = (key, values = {}) => {
  let value = window.languageManager?.get(key) || key;
  for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, String(replacement));
  return value;
};

function showState(state) {
  loadingPanel.classList.toggle("members-hidden", state !== "loading");
  if (signedOutPanel) signedOutPanel.classList.add("members-hidden");
  contentPanel.classList.toggle("members-hidden", state === "loading");
  profilePanel.classList.toggle("members-hidden", state !== "signed-in");
}
function showStatus(element, key, isError = false, values = {}) {
  element.dataset.i18nMessageKey = key;
  element.dataset.i18nMessageValues = JSON.stringify(values);
  element.textContent = t(key, values);
  element.style.color = isError ? "#b42318" : "var(--teal)";
}
async function loadProfile() {
  if (!currentUser) return;
  profileEmail.textContent = currentUser.email || "Signed-in user";
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role, bio").eq("id", currentUser.id).maybeSingle();
  if (error) {
    showStatus(profileStatus, "dir.profileError", true);
    return;
  }
  if (!data) {
    showStatus(profileStatus, "dir.profileError", true);
    return;
  }
  displayNameInput.value = data.display_name || "";
  bioInput.value = data.bio || "";
  profileRole.textContent = data.role || "member";
  savedProfileValues = { displayName: displayNameInput.value, bio: bioInput.value };
  updateProfileEditState();
}
function memberMatches(member) {
  const query = (directorySearch?.value || "").trim().toLocaleLowerCase();
  const role = (directoryRoleFilter?.value || "").toLocaleLowerCase();
  const firstLetter = (member.display_name || "Member").trim().charAt(0).toLocaleUpperCase();
  const searchText = [member.display_name, member.role, member.bio].filter(Boolean).join(" ").toLocaleLowerCase();
  return (!query || searchText.includes(query)) &&
    (!role || (member.role || "member").toLocaleLowerCase() === role) &&
    (!activeLetter || firstLetter === activeLetter);
}
function renderAlphabet() {
  if (!directoryLetters) return;
  directoryLetters.replaceChildren();
  const letters = [...new Set(directoryMembers.map(member =>
    (member.display_name || "Member").trim().charAt(0).toLocaleUpperCase()
  ))].filter(letter => /^[A-Z]$/.test(letter)).sort();
  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "directory-letter";
  allButton.textContent = t("dir.allLetters");
  allButton.setAttribute("aria-pressed", String(!activeLetter));
  allButton.addEventListener("click", () => { activeLetter = ""; renderAlphabet(); filterDirectory(); });
  directoryLetters.append(allButton);
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "directory-letter";
    button.textContent = letter;
    button.disabled = !letters.includes(letter);
    button.setAttribute("aria-pressed", String(activeLetter === letter));
    button.setAttribute("aria-label", t("dir.showLetter", {letter}));
    button.addEventListener("click", () => {
      activeLetter = activeLetter === letter ? "" : letter;
      renderAlphabet();
      filterDirectory();
    });
    directoryLetters.append(button);
  }
}
function renderRoleOptions() {
  if (!directoryRoleFilter) return;
  const selectedRole = directoryRoleFilter.value;
  const roles = [...new Set(directoryMembers.map(member => (member.role || "member").trim()))]
    .filter(Boolean).sort((a, b) => a.localeCompare(b));
  directoryRoleFilter.replaceChildren(new Option(t("dir.allRoles"), ""));
  for (const role of roles) directoryRoleFilter.add(new Option(role.charAt(0).toLocaleUpperCase() + role.slice(1), role.toLocaleLowerCase()));
  if (roles.some(role => role.toLocaleLowerCase() === selectedRole)) directoryRoleFilter.value = selectedRole;
}
function filterDirectory() {
  const items = [...directory.children].filter(item => !item.classList.contains("directory-empty"));
  let visible = 0;
  for (const item of items) {
    const matches = memberMatches(directoryMembers.find(member => member.id === item.dataset.memberId) || {});
    item.hidden = !matches;
    if (matches) visible++;
  }
  if (directoryCount) directoryCount.textContent = t("dir.count", {shown: visible, total: directoryMembers.length});
  if (directoryMembers.length && visible === 0) {
    showStatus(directoryStatus, "dir.noMatch");
  } else if (directoryMembers.length) {
    directoryStatus.textContent = "";
    delete directoryStatus.dataset.i18nMessageKey;
    delete directoryStatus.dataset.i18nMessageValues;
  }
}
directorySearch?.addEventListener("input", filterDirectory);
directoryRoleFilter?.addEventListener("change", filterDirectory);
directorySearchClear?.addEventListener("click", () => {
  if (directorySearch) directorySearch.value = "";
  if (directoryRoleFilter) directoryRoleFilter.value = "";
  activeLetter = "";
  renderAlphabet();
  filterDirectory();
  directorySearch?.focus();
});

function updateProfileEditState() {
  if (bioCharacterCount) bioCharacterCount.textContent = t("dir.bioCount", {count: bioInput.value.length});
  if (!savedProfileValues) return;
  const changed = displayNameInput.value.trim() !== savedProfileValues.displayName ||
    bioInput.value.trim() !== savedProfileValues.bio;
  showStatus(profileStatus, changed ? "dir.unsaved" : "dir.upToDate");
  saveButton.disabled = !changed;
}
displayNameInput.addEventListener("input", updateProfileEditState);
bioInput.addEventListener("input", updateProfileEditState);
window.addEventListener("beforeunload", (event) => {
  if (!savedProfileValues) return;
  const changed = displayNameInput.value.trim() !== savedProfileValues.displayName ||
    bioInput.value.trim() !== savedProfileValues.bio;
  if (changed) {
    event.preventDefault();
    event.returnValue = "";
  }
});

async function loadDirectory() {
  directory.replaceChildren();
  showStatus(directoryStatus, "dir.loading");
  if (directoryCount) directoryCount.textContent = t("dir.loading");
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, role, bio").order("display_name", { ascending: true });
  if (error) {
    showStatus(directoryStatus, "dir.loadError", true);
    if (directoryCount) directoryCount.textContent = t("dir.loadError");
    return;
  }
  directoryMembers = data || [];
  if (!directoryMembers.length) {
    showStatus(directoryStatus, "dir.noMembers");
    if (directoryCount) directoryCount.textContent = "0 members";
    if (directoryLetters) directoryLetters.replaceChildren();
    return;
  }
  renderRoleOptions();
  renderAlphabet();
  for (const member of directoryMembers) {
    const item = document.createElement("li");
    item.className = "member-item";
    item.dataset.memberId = member.id;
    const avatar = document.createElement("span");
    avatar.className = "member-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (member.display_name || "M").trim().charAt(0).toLocaleUpperCase() || "M";
    const name = document.createElement("strong");
    name.className = "member-name";
    name.textContent = member.display_name || "Member";
    const roleLine = document.createElement("span");
    roleLine.className = "member-role";
    roleLine.textContent = member.role || "member";
    const bio = document.createElement("p");
    bio.className = "member-bio";
    bio.hidden = true;
    bio.textContent = member.bio || t("dir.bioEmpty");
    const toggle = document.createElement("button");
    toggle.className = "member-bio-toggle";
    toggle.type = "button";
    toggle.textContent = "↓";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("dir.showBio", {name: member.display_name || "member"}));
    toggle.addEventListener("click", () => {
      const opening = bio.hidden;
      bio.hidden = !opening;
      toggle.textContent = opening ? "↑" : "↓";
      toggle.setAttribute("aria-expanded", String(opening));
      toggle.setAttribute("aria-label", t(opening ? "dir.hideBio" : "dir.showBio", {name: member.display_name || "member"}));
    });
    const main = document.createElement("div");
    main.className = "member-main";
    main.append(name, roleLine, bio);
    item.append(avatar, main, toggle);
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
    showStatus(profileStatus, "dir.invalidName", true);
    return;
  }
  saveButton.disabled = true;
  showStatus(profileStatus, "dir.saving");
  try {
    const { error } = await supabase.from("profiles")
      .update({ display_name: displayName, bio }).eq("id", currentUser.id);
    if (error) throw error;
    savedProfileValues = { displayName, bio };
    updateProfileEditState();
    showStatus(profileStatus, "dir.saved");
    await loadDirectory();
  } catch (error) {
    showStatus(profileStatus, "dir.saveError", true);
  } finally {
    if (savedProfileValues) updateProfileEditState();
    else saveButton.disabled = false;
  }
});
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  if (error) showStatus(profileStatus, "dir.profileError", true);
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

document.addEventListener("liquindo-language-changed", () => {
  document.querySelectorAll("[data-i18n-message-key]").forEach((element) => {
    let values = {};
    try { values = JSON.parse(element.dataset.i18nMessageValues || "{}"); } catch (_) {}
    element.textContent = t(element.dataset.i18nMessageKey, values);
  });
  if (bioCharacterCount) bioCharacterCount.textContent = t("dir.bioCount", {count: bioInput.value.length});
  if (directoryMembers.length) { renderRoleOptions(); renderAlphabet(); filterDirectory(); }
  directory.querySelectorAll(".member-item").forEach((item) => {
    const member = directoryMembers.find((candidate) => candidate.id === item.dataset.memberId);
    const bio = item.querySelector(".member-bio");
    const toggle = item.querySelector(".member-bio-toggle");
    if (member && bio && !member.bio) bio.textContent = t("dir.bioEmpty");
    if (member && toggle) toggle.setAttribute("aria-label", t(bio?.hidden ? "dir.showBio" : "dir.hideBio", {name: member.display_name || "member"}));
  });
});
