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
  document.querySelectorAll(".gallery-redesign img[src^='images/']").forEach((img) => {
    img.dataset.privateGalleryPath = decodeURIComponent(img.getAttribute("src").slice("images/".length));
    img.removeAttribute("src");
  });
}

async function importImagesIfNeeded() {
  const { data: objects, error: listError } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
  if (listError) throw listError;
  if ((objects || []).length >= EXPECTED_IMAGE_COUNT) return;

  showGalleryMessage("Securing the gallery images in private storage. This may take a minute…");
  const { data, error } = await supabase.functions.invoke("import-liquindo-gallery", { method: "POST" });
  if (error) throw error;
  if (data?.failed?.length || data?.imported !== EXPECTED_IMAGE_COUNT) {
    throw new Error("Some gallery images could not be imported (" + (data?.imported ?? 0) + "/" + EXPECTED_IMAGE_COUNT + ").");
  }
}

async function loadPrivateImages() {
  const images = [...document.querySelectorAll("img[data-private-gallery-path]")];
  const paths = [...new Set(images.map((img) => img.dataset.privateGalleryPath).filter(Boolean))];
  if (!paths.length) {
    document.body.classList.add("gallery-access-ready");
    return;
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  const signed = new Map((data || []).filter((item) => item.signedUrl).map((item) => [item.path, new URL(item.signedUrl, SUPABASE_URL).href]));
  const missing = paths.filter((path) => !signed.has(path));
  if (missing.length) throw new Error("Private image access was not granted for " + missing.length + " image(s).");

  images.forEach((img) => {
    const url = signed.get(img.dataset.privateGalleryPath);
    if (url) img.src = url;
  });
  document.body.classList.add("gallery-access-ready");
}

hidePublicImageSources();
try {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) {
    window.location.replace("login.html?next=gallery.html");
  } else {
    await importImagesIfNeeded();
    await loadPrivateImages();
  }
} catch (error) {
  // Fail closed: never restore public image URLs as a fallback.
  showGalleryMessage(error instanceof Error ? error.message : "The private gallery could not be loaded. Please try again.");
  document.body.classList.add("gallery-access-ready");
}
