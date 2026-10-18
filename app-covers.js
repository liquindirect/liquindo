import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://uivjovkvpskvvazznlyr.supabase.co",
  "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
);
const BUCKET = "liquindo-app-covers";
const STORAGE_KEY = "liquindo-app-cover-selection";
const FALLBACK_TITLE = "Standard Liquindo cover";

function publicImageUrl(path) {
  const { data, error } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (error || !data?.publicUrl) throw new Error("Could not create the cover image URL.");
  return data.publicUrl;
}

function makeElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(url);
    image.onerror = () => reject(new Error("This cover image could not be loaded."));
    image.src = url;
  });
}

function setStatus(node, message, state = "") {
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function applyCover(cover, imageUrl) {
  const hero = document.querySelector(".app-cover-hero");
  if (!hero) throw new Error("The app cover display area is missing.");
  hero.style.backgroundImage =
    'linear-gradient(90deg,rgba(7,19,41,.90),rgba(7,19,41,.30)),url("' +
    imageUrl.replace(/"/g, "%22") + '")';
  hero.style.backgroundSize = "cover";
  hero.style.backgroundPosition = "center";
  hero.dataset.coverId = cover.id;
  const label = hero.querySelector("[data-cover-current]");
  if (label) label.textContent = cover.title;
  hero.classList.add("has-selected-cover");
}

async function home() {
  const root = document.querySelector("#app-cover-picker");
  if (!root) return;

  const status = root.querySelector("[data-cover-status]");
  const list = root.querySelector("[data-cover-list]");
  const hero = document.querySelector(".app-cover-hero");
  if (!status || !list || !hero) {
    console.error("App Cover setup: required home-screen elements are missing.");
    return;
  }

  const standardLabel = hero.querySelector("[data-cover-current]");
  if (standardLabel) standardLabel.textContent = FALLBACK_TITLE;
  setStatus(status, "Loading available covers…");

  try {
    const { data, error } = await supabase
      .from("app_covers")
      .select("id,title,description,image_path")
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;

    const covers = data || [];
    list.replaceChildren();

    if (!covers.length) {
      setStatus(status, "No custom covers are available. The standard design remains active.");
      return;
    }

    let savedPath = "";
    let storageWorks = true;
    try {
      savedPath = localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      storageWorks = false;
    }

    const savedCover = covers.find((cover) => cover.image_path === savedPath);
    const ordered = savedCover
      ? [savedCover, ...covers.filter((cover) => cover.id !== savedCover.id)]
      : covers;
    let selected = null;

    // Preload the saved image before applying it. If it fails, try the remaining
    // available covers rather than claiming that a broken image was selected.
    for (const cover of ordered) {
      try {
        const imageUrl = await loadImage(publicImageUrl(cover.image_path));
        applyCover(cover, imageUrl);
        selected = cover;
        break;
      } catch (error) {
        console.warn("App cover image failed to load:", cover.title, error);
      }
    }

    for (const cover of covers) {
      const button = makeElement("button", "cover-choice");
      button.type = "button";
      button.setAttribute("aria-pressed", String(cover.id === selected?.id));
      button.setAttribute("aria-label", "Use app cover: " + cover.title);

      const thumbnail = makeElement("img");
      thumbnail.alt = "";
      thumbnail.loading = "lazy";
      thumbnail.src = publicImageUrl(cover.image_path);
      thumbnail.addEventListener("error", () => {
        thumbnail.classList.add("cover-image-error");
        thumbnail.alt = "Preview unavailable";
      }, { once: true });

      const copy = makeElement("span", "cover-choice-copy");
      copy.append(makeElement("strong", "", cover.title));
      if (cover.description) copy.append(makeElement("small", "", cover.description));
      button.append(thumbnail, copy);

      button.addEventListener("click", async () => {
        button.disabled = true;
        setStatus(status, "Loading “" + cover.title + "”…");
        try {
          const imageUrl = await loadImage(publicImageUrl(cover.image_path));
          // Persist only after the actual image has loaded and can be applied.
          applyCover(cover, imageUrl);
          if (storageWorks) {
            try {
              localStorage.setItem(STORAGE_KEY, cover.image_path);
            } catch {
              storageWorks = false;
            }
          }
          list.querySelectorAll("button.cover-choice").forEach((item) => {
            item.setAttribute("aria-pressed", String(item === button));
          });
          if (!storageWorks) {
            setStatus(status, "Cover applied for this visit, but this device blocked saving the choice. It may reset when you reopen the app.", "warning");
          } else {
            setStatus(status, "Cover “" + cover.title + "” loaded and applied. Your choice is saved on this device.", "success");
          }
        } catch (error) {
          setStatus(status, "Could not apply “" + cover.title + "”. The current cover has been kept. Check your connection and try again.", "error");
          console.error("Could not apply app cover:", error);
        } finally {
          button.disabled = false;
        }
      });
      list.append(button);
    }

    if (selected) {
      if (storageWorks && savedCover?.id === selected.id) {
        setStatus(status, "Your saved cover, “" + selected.title + "”, is active.");
      } else {
        if (storageWorks) {
          try { localStorage.setItem(STORAGE_KEY, selected.image_path); }
          catch { storageWorks = false; }
        }
        setStatus(status, storageWorks
          ? "Cover “" + selected.title + "” is active. Choose another below."
          : "Cover “" + selected.title + "” is active for this visit. Device storage is unavailable.");
      }
      list.querySelectorAll("button.cover-choice").forEach((button, index) => {
        const cover = covers[index];
        button.setAttribute("aria-pressed", String(cover.id === selected.id));
      });
    } else {
      setStatus(status, "The cover library loaded, but none of its images could be displayed. The standard design remains active. Check your connection and try again.", "error");
    }
  } catch (error) {
    setStatus(status, "Could not load the cover library. The standard design remains active. Check your connection and reload.", "error");
    console.error("App cover library failed:", error);
  }
}

async function admin() {
  const root = document.querySelector("#cover-admin-app");
  if (!root) return;

  const status = root.querySelector("[data-admin-status]");
  const form = root.querySelector("#cover-create-form");
  const rows = root.querySelector("#cover-admin-list");
  if (!status || !form || !rows) return;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    setStatus(status, "Sign in with an administrator account to manage covers.", "error");
    return;
  }

  const user = sessionData.session.user;
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "admin") {
    setStatus(status, "Administrator access required. No changes have been made.", "error");
    return;
  }

  form.hidden = false;

  async function loadAdminCovers() {
    const { data, error } = await supabase
      .from("app_covers").select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;

    rows.replaceChildren();
    if (!data?.length) rows.append(makeElement("p", "", "No covers yet. Upload the first above."));

    for (const cover of data || []) {
      const card = makeElement("article", "cover-admin-row");
      const image = makeElement("img");
      image.src = publicImageUrl(cover.image_path);
      image.alt = cover.title;
      image.addEventListener("error", () => {
        image.alt = "Cover image unavailable";
        image.removeAttribute("src");
      }, { once: true });

      const body = makeElement("div", "cover-admin-row-body");
      const title = makeElement("input");
      title.value = cover.title;
      title.maxLength = 80;
      title.setAttribute("aria-label", "Cover title");
      title.required = true;

      const description = makeElement("input");
      description.value = cover.description || "";
      description.maxLength = 240;
      description.placeholder = "Optional description";
      description.setAttribute("aria-label", "Cover description");

      const label = makeElement("label", "cover-admin-check");
      const available = makeElement("input");
      available.type = "checkbox";
      available.checked = cover.is_available;
      label.append(available, document.createTextNode("Available to app users"));

      const actions = makeElement("div", "cover-admin-actions");
      const save = makeElement("button", "cover-admin-button", "Save changes");
      const remove = makeElement("button", "cover-admin-button danger", "Remove cover");
      save.type = remove.type = "button";

      save.addEventListener("click", async () => {
        if (!title.value.trim()) {
          setStatus(status, "A cover title is required.", "error");
          title.focus();
          return;
        }
        save.disabled = true;
        const { error } = await supabase.from("app_covers").update({
          title: title.value.trim(),
          description: description.value.trim(),
          is_available: available.checked,
          updated_at: new Date().toISOString()
        }).eq("id", cover.id);
        save.disabled = false;
        if (error) {
          setStatus(status, "Save failed: " + error.message, "error");
          return;
        }
        setStatus(status, "Cover saved.", "success");
        try { await loadAdminCovers(); }
        catch (loadError) { setStatus(status, "Cover saved, but refresh failed: " + loadError.message, "error"); }
      });

      remove.addEventListener("click", async () => {
        if (!confirm("Remove “" + cover.title + "” and its stored image?")) return;
        remove.disabled = true;
        const { error } = await supabase.from("app_covers").delete().eq("id", cover.id);
        if (error) {
          remove.disabled = false;
          setStatus(status, "Remove failed: " + error.message, "error");
          return;
        }
        const { error: storageError } = await supabase.storage.from(BUCKET).remove([cover.image_path]);
        setStatus(status, storageError
          ? "Cover removed from the library, but its image could not be deleted: " + storageError.message
          : "Cover and stored image removed.", storageError ? "warning" : "success");
        try { await loadAdminCovers(); }
        catch (loadError) { setStatus(status, "Cover removed, but refresh failed: " + loadError.message, "error"); }
      });

      body.append(title, description, label, makeElement("small", "", cover.image_path), actions);
      actions.append(save, remove);
      card.append(image, body);
      rows.append(card);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileInput = form.querySelector("#cover-image-file");
    const file = fileInput?.files?.[0];
    const title = form.querySelector("#cover-title").value.trim();
    const description = form.querySelector("#cover-description").value.trim();
    if (!file || !title) {
      setStatus(status, "Choose an image and enter a title.", "error");
      return;
    }
    const extensions = {
      "image/jpeg": "jpg", "image/png": "png",
      "image/webp": "webp", "image/gif": "gif"
    };
    const extension = extensions[file.type];
    if (!extension || file.size > 15 * 1024 * 1024) {
      setStatus(status, "Use JPG, PNG, WebP or GIF, up to 15 MB.", "error");
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, "Uploading cover…");
    try {
      const path = Date.now() + "-" + crypto.randomUUID() + "." + extension;
      const upload = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upload.error) throw new Error("Upload failed: " + upload.error.message);

      const { error: insertError } = await supabase.from("app_covers").insert({
        title, description, image_path: path, created_by: user.id
      });
      if (insertError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error("Could not save cover details: " + insertError.message);
      }
      form.reset();
      setStatus(status, "Cover uploaded and added to the library.", "success");
      await loadAdminCovers();
    } catch (error) {
      setStatus(status, error.message || "Cover upload failed.", "error");
    } finally {
      button.disabled = false;
    }
  });

  try {
    await loadAdminCovers();
    setStatus(status, "Administrator verified. Manage the shared cover library below.", "success");
  } catch (error) {
    setStatus(status, "Could not load covers: " + error.message, "error");
  }
}

home();
admin();
