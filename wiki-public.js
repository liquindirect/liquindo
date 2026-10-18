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
    let article = document.getElementById(articleData.slug);
    if (!article && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(articleData.slug)) {
      const list = document.querySelector("#wiki-directory .articles-list");
      const view = document.getElementById("wiki-article-view");
      if (!list || !view) continue;
      const card = document.createElement("article");
      card.className = "article-card";
      const cardHeading = document.createElement("h3");
      const cardLink = document.createElement("a");
      cardLink.href = "wiki.html#" + articleData.slug;
      cardLink.textContent = articleData.title || articleData.slug;
      cardHeading.append(cardLink);
      const description = document.createElement("p");
      description.className = "article-description";
      description.textContent = "Community-created LiquinWiki article.";
      card.append(cardHeading, description);
      list.append(card);

      article = document.createElement("article");
      article.id = articleData.slug;
      article.className = "wiki-article";
      article.setAttribute("data-wiki-article", "");
      article.hidden = true;
      const header = document.createElement("header");
      header.className = "article-header";
      const label = document.createElement("p");
      label.className = "section-label";
      label.textContent = "Liquinwiki";
      const heading = document.createElement("h1");
      heading.className = "article-title";
      heading.textContent = articleData.title || articleData.slug;
      header.append(label, heading);
      article.append(header);
      view.append(article);
    }
    if (!article || !article.hasAttribute("data-wiki-article")) continue;
    const header = article.querySelector(".article-header");
    if (header && !header.querySelector(".article-title")) {
      const heading = document.createElement("h1");
      heading.className = "article-title";
      heading.textContent = articleData.title || articleData.slug;
      header.append(heading);
    }
    const existingTitle = article.querySelector(".article-title");
    if (existingTitle) existingTitle.textContent = articleData.title || existingTitle.textContent;
    const headerHtml = header ? header.outerHTML : "";
    article.innerHTML = headerHtml + DOMPurify.sanitize(articleData.content, sanitizeOptions);
    if (window.location.hash === "#" + articleData.slug) {
      document.title = (articleData.title || articleData.slug) + " - Liquinwiki";
    }
  }
  if (typeof window.updateWikiPage === "function") window.updateWikiPage();
}
loadApprovedArticles();


// Keep the article-level Edit link pointed at the article currently open.
function updateCurrentArticleEditLink() {
  const link = document.getElementById("wiki-edit-current");
  const slug = window.location.hash.slice(1);
  if (link && /^[a-z0-9-]+$/i.test(slug)) {
    link.href = "wiki-editor.html?article=" + encodeURIComponent(slug);
  }
}
window.addEventListener("hashchange", updateCurrentArticleEditLink);
updateCurrentArticleEditLink();
