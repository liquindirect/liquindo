import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://uivjovkvpskvvazznlyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz";
const BUCKET = "liquindo-gallery";
const EXPECTED_IMAGE_COUNT = 52;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function showGalleryMessage(message) {
  let notice = document.getElementById("gallery-security-status");
  if (!notice) {
    notice = document.createElement("p");
    notice.id = "gallery-security-status";
    notice.setAttribute("role", "status");
    notice.style.cssText = "max-width:900px;margin:1.5rem auto;padding:1rem 1.25rem;border:1px solid #fdbe00;border-radius:12px;color:#fff8e8;background:#080f1c;";
    document.querySelector("main")?.prepend(notice);
  }
  notice.textContent = message;
}

function hidePublicImageSources() {
  document.querySelectorAll(".gallery-page-grid img[data-gallery-source^='images/']").forEach((img) => {
    img.dataset.privateGalleryPath = decodeURIComponent(img.getAttribute("data-gallery-source").slice("images/".length));
    img.removeAttribute("data-gallery-source");
  });
}

async function importImagesIfNeeded(isAdmin) {
  const { data: objects, error } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
  if (error) throw error;
  const count = (objects || []).length;
  if (count > 0) {
    if (count < EXPECTED_IMAGE_COUNT) showGalleryMessage("The private archive currently contains " + count + " image(s). An administrator can add more images using Gallery management.");
    return;
  }
  if (!isAdmin) throw new Error("The private gallery is being set up. Please try again after an administrator has opened it.");
  showGalleryMessage("Securing the gallery images in private storage. This may take a minute…");
  const { data, error: importError } = await supabase.functions.invoke("import-liquindo-gallery", { method: "POST" });
  if (importError) throw importError;
  if (data?.failed?.length || data?.imported !== EXPECTED_IMAGE_COUNT) {
    throw new Error("Some gallery images could not be imported (" + (data?.imported ?? 0) + "/" + EXPECTED_IMAGE_COUNT + "). Please contact an administrator.");
  }
}

function makeDeleteButton(path) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Delete image";
  button.setAttribute("aria-label", "Delete " + path);
  button.style.cssText = "display:block;margin:.5rem auto;padding:.45rem .7rem;border:1px solid #b42318;border-radius:8px;background:#fff;color:#b42318;cursor:pointer;font:inherit;font-size:.85rem;";
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (!window.confirm("Delete this image from the private gallery? This cannot be undone.")) return;
    button.disabled = true;
    button.textContent = "Deleting…";
    const { error } = await supabase.functions.invoke("manage-liquindo-gallery", { body: { action: "delete", path } });
    if (error) {
      showGalleryMessage("Could not delete the image: " + error.message);
      button.disabled = false;
      button.textContent = "Delete image";
      return;
    }
    window.location.reload();
  });
  return button;
}

function addAdminPanel() {
  const panel = document.createElement("section");
  panel.id = "gallery-admin-panel";
  panel.setAttribute("aria-labelledby", "gallery-admin-title");
  panel.style.cssText = "max-width:1100px;margin:1rem auto 1.5rem;padding:1.25rem;border:1px solid #fdbe00;border-radius:14px;background:#080f1c;color:#fff8e8;";
  panel.innerHTML = `
    <h2 id="gallery-admin-title" style="margin:0 0 .4rem;font-size:1.2rem">Gallery management</h2>
    <p style="margin:.25rem 0 1rem">Administrators only · JPG, PNG, WebP or GIF · maximum 15 MB per image.</p>
    <form id="gallery-upload-form" style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap">
      <label for="gallery-upload-file">Add images</label>
      <input id="gallery-upload-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required multiple />
      <button type="submit" style="padding:.65rem 1rem;border:0;border-radius:8px;background:#fdbe00;color:#080f1c;font:inherit;font-weight:700;cursor:pointer">Upload selected images</button>
    </form>
    <p id="gallery-admin-message" role="status" aria-live="polite" style="margin:.75rem 0 0"></p>`;
  const toolbar = document.querySelector(".gallery-toolbar");
  toolbar?.before(panel);
  const form = panel.querySelector("#gallery-upload-form");
  const fileInput = panel.querySelector("#gallery-upload-file");
  const status = panel.querySelector("#gallery-admin-message");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = [...(fileInput.files || [])];
    if (!files.length) return;
    if (files.some(file => file.size > 15 * 1024 * 1024)) {
      status.textContent = "Each image must be 15 MB or smaller.";
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    status.textContent = "Uploading " + files.length + " image(s)…";
    let uploaded = 0;
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const { error } = await supabase.functions.invoke("manage-liquindo-gallery", { body: formData });
      if (error) {
        status.textContent = "Uploaded " + uploaded + " of " + files.length + ". Upload failed: " + error.message;
        submit.disabled = false;
        return;
      }
      uploaded++;
      status.textContent = "Uploaded " + uploaded + " of " + files.length + " image(s)…";
    }
    window.location.reload();
  });
  return panel;
}

async function loadPrivateImages(isAdmin) {
  const { data: objects, error: listError } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
  if (listError) throw listError;
  const objectNames = new Set((objects || []).filter(item => item.name && !item.id?.endsWith("/")).map(item => item.name));
  const grid = document.querySelector(".gallery-page-grid");
  if (!grid) throw new Error("Gallery grid not found.");

  const existing = new Map();
  [...grid.querySelectorAll("figure")].forEach(figure => {
    const image = figure.querySelector("img");
    const path = image?.dataset.privateGalleryPath;
    if (!path) return;
    existing.set(path, figure);
    if (!objectNames.has(path)) figure.remove();
  });

  let nextNumber = Math.max(0, ...[...grid.querySelectorAll("figure")].map(figure => Number(figure.dataset.imageNumber) || 0)) + 1;
  for (const name of objectNames) {
    if (existing.has(name)) continue;
    const figure = document.createElement("figure");
    figure.dataset.imageNumber = String(nextNumber);
    figure.dataset.privateGalleryPath = name;
    const image = document.createElement("img");
    image.alt = "Image " + nextNumber;
    image.loading = "lazy";
    image.dataset.privateGalleryPath = name;
    const caption = document.createElement("figcaption");
    caption.textContent = name;
    figure.append(image, caption);
    grid.append(figure);
    if (typeof window.openGalleryFigure === "function") {
      figure.addEventListener("click", () => window.openGalleryFigure(figure));
      figure.tabIndex = 0;
      figure.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.openGalleryFigure(figure);
        }
      });
    }
    nextNumber++;
  }

  if (isAdmin) {
    addAdminPanel();
    [...grid.querySelectorAll("figure")].forEach(figure => {
      const path = figure.querySelector("img")?.dataset.privateGalleryPath || figure.dataset.privateGalleryPath;
      if (path && !figure.querySelector(".gallery-admin-delete")) {
        const button = makeDeleteButton(path);
        button.classList.add("gallery-admin-delete");
        figure.append(button);
      }
    });
  }

  const images = [...grid.querySelectorAll("img")].filter(img => img.dataset.privateGalleryPath);
  const paths = [...new Set(images.map(img => img.dataset.privateGalleryPath))];
  if (paths.length) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    if (error) throw error;
    const signed = new Map((data || []).filter(item => item.signedUrl).map(item => [item.path, new URL(item.signedUrl, SUPABASE_URL).href]));
    const missing = paths.filter(path => !signed.has(path));
    if (missing.length) throw new Error("Private image access was not granted for " + missing.length + " image(s).");
    images.forEach(img => { img.src = signed.get(img.dataset.privateGalleryPath); });
  }
  if (typeof window.refreshGalleryFigures === "function") window.refreshGalleryFigures();
  document.body.classList.add("gallery-access-ready");
}

hidePublicImageSources();
try {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) {
    window.location.replace("login.html?next=gallery.html");
  } else {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.session.user.id).maybeSingle();
    if (profileError) throw profileError;
    const isAdmin = profile?.role === "admin";
    await importImagesIfNeeded(isAdmin);
    await loadPrivateImages(isAdmin);
  }
} catch (error) {
  showGalleryMessage(error instanceof Error ? error.message : "The private gallery could not be loaded. Please try again.");
  document.body.classList.add("gallery-access-ready");
}
