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
    let createdDynamically = false;
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
      createdDynamically = true;
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
    const safeContent = DOMPurify.sanitize(articleData.content, sanitizeOptions);
    article.innerHTML = createdDynamically ? ((header ? header.outerHTML : "") + safeContent) : safeContent;
    if (window.location.hash === "#" + articleData.slug) {
      document.title = (articleData.title || articleData.slug) + " - Liquinwiki";
    }
  }
  if (typeof window.updateWikiPage === "function") window.updateWikiPage();
}
async function requireMemberAccess() {
  document.documentElement.classList.remove("wiki-access-pending");
  const gate = document.getElementById("wiki-access-gate");
  const container = document.querySelector(".wiki-container");
  if (container) container.hidden = true;
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) {
      if (gate) gate.innerHTML = '<h2>Members only</h2><p>Sign in to your Liquindo member account to view LiquinWiki.</p><a class="section-link" href="login.html?next=wiki.html">Log in</a>';
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !["member", "admin"].includes(profile.role)) {
      if (gate) gate.innerHTML = '<h2>Members only</h2><p>Your account does not currently have Liquindo member access. Contact an administrator if you think this is a mistake.</p><a class="section-link" href="index.html">Back to the main site</a>';
      return;
    }
    if (gate) gate.hidden = true;
    if (container) container.hidden = false;
    await loadApprovedArticles();
  } catch (error) {
    console.error("LiquinWiki access check failed.", error);
    if (gate) gate.innerHTML = '<h2>Unable to verify membership</h2><p>LiquinWiki is hidden until your membership can be verified. Please try again later.</p><a class="section-link" href="login.html?next=wiki.html">Return to login</a>';
  }
}
requireMemberAccess();


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
