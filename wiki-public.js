import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import DOMPurify from "https://esm.sh/dompurify@3";

const supabase = createClient(
  "https://uivjovkvpskvvazznlyr.supabase.co",
  "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
);

const sanitizeOptions = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "object", "embed", "svg", "math"]
};

async function loadApprovedArticles() {
  const { data, error } = await supabase.from("wiki_pages")
    .select("slug, title, content");
  if (error) {
    console.error("LiquinWiki: could not load approved article revisions.", error.message);
    return;
  }
  for (const articleData of data || []) {
    const article = document.getElementById(articleData.slug);
    if (!article || !article.hasAttribute("data-wiki-article")) continue;
    article.innerHTML = DOMPurify.sanitize(articleData.content, sanitizeOptions);
    const title = article.querySelector(".article-title");
    if (title && window.location.hash === "#" + articleData.slug) {
      document.title = title.textContent.trim() + " - Liquinwiki";
    }
  }
}
loadApprovedArticles();
