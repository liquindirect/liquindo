import { supabase } from "./supabase-client.js";

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

async function downloadCover(path, timeoutMs = 15000) {
  // Download image bytes from Supabase Storage first, then display a local
  // object URL. This gives us explicit HTTP errors instead of relying on the
  // WebView to render a remote image URL silently.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let objectUrl = "";
  try {
    const response = await fetch(publicImageUrl(path), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error("Supabase Storage returned HTTP " + response.status + ".");
    }
    const blob = await response.blob();
    if (!blob.size || !/^image\//i.test(blob.type || "")) {
      throw new Error("Supabase returned an empty file or a non-image response.");
    }
    objectUrl = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The downloaded cover is not a displayable image."));
      image.src = objectUrl;
    });
    return objectUrl;
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (error?.name === "AbortError") {
      throw new Error("The cover download timed out. Check the app's internet connection.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function setStatus(node, message, state = "") {
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function applyCover(cover, imageUrl) {
  const hero = document.querySelector(".app-cover-hero");
  if (!hero) throw new Error("The app cover display area is missing.");

  // Render the remotely loaded image as a real element instead of relying on
  // WebView CSS background-image behaviour. The image is fetched from Supabase
  // before this function is called, so a failed download never replaces the
  // currently displayed cover.
  let image = hero.querySelector(".app-cover-image");
  if (!image) {
    image = document.createElement("img");
    image.className = "app-cover-image";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.draggable = false;
    hero.prepend(image);
  }
  image.src = imageUrl;
  image.dataset.coverId = cover.id;
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

    const savedCover = covers.find((cover) => cover.image_path === savedPath) || null;
    const buttonsById = new Map();

    // Render choices before downloading full-size artwork. A stalled image request
    // must never prevent users from selecting another cover.
    for (const cover of covers) {
      const button = makeElement("button", "cover-choice");
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
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
        setStatus(status, "Loading cover: " + cover.title + "…");
        try {
          const imageUrl = await downloadCover(cover.image_path);
          applyCover(cover, imageUrl);
          if (storageWorks) {
            try {
              localStorage.setItem(STORAGE_KEY, cover.image_path);
            } catch {
              storageWorks = false;
            }
          }
          buttonsById.forEach((item, id) => item.setAttribute("aria-pressed", String(id === cover.id)));
          setStatus(status, storageWorks
            ? "Cover applied: " + cover.title + ". Your choice is saved on this device."
            : "Cover applied for this visit, but device storage is blocked so the choice may reset when you reopen the app.",
            storageWorks ? "success" : "warning");
        } catch (error) {
          setStatus(status, "Could not load " + cover.title + ": " + (error?.message || "unknown image error") + ". The current cover has been kept.", "error");
          console.error("Could not apply app cover:", cover.title, error);
        } finally {
          button.disabled = false;
        }
      });

      buttonsById.set(cover.id, button);
      list.append(button);
    }

    const ordered = savedCover
      ? [savedCover, ...covers.filter((cover) => cover.id !== savedCover.id)]
      : covers;
    let selected = null;
    for (const cover of ordered) {
      try {
        const imageUrl = await downloadCover(cover.image_path);
        applyCover(cover, imageUrl);
        selected = cover;
        break;
      } catch (error) {
        console.warn("App cover image failed to load:", cover.title, error);
      }
    }

    if (selected) {
      if (storageWorks && savedCover?.id === selected.id) {
        setStatus(status, "Your saved cover, " + selected.title + ", is active.");
      } else {
        if (storageWorks) {
          try { localStorage.setItem(STORAGE_KEY, selected.image_path); }
          catch { storageWorks = false; }
        }
        setStatus(status, storageWorks
          ? "Cover " + selected.title + " is active. Choose another below."
          : "Cover " + selected.title + " is active for this visit. Device storage is unavailable.");
      }
      buttonsById.forEach((button, id) => button.setAttribute("aria-pressed", String(id === selected.id)));
    } else {
      setStatus(status, "Cover choices loaded, but all Supabase image downloads failed. Tap a cover to see its specific download error.", "error");
    }
  } catch (error) {
    setStatus(status, "Could not load the cover library. The standard design remains active. Check your connection and reload.", "error");
    console.error("App cover library failed:", error);
  }
}


home();
