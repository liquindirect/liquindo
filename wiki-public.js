import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import DOMPurify from "https://esm.sh/dompurify@3";
import { looksLikeWikiMarkup, renderWikiMarkup, slugifyWikiTitle } from "./wiki-markup.js?v=20261024-markup-v5";

const supabase = createClient(
  "https://uivjovkvpskvvazznlyr.supabase.co",
  "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
);

const sanitizeOptions = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "object", "embed", "svg", "math"]
};

function renderStoredContent(content) {
  const source = looksLikeWikiMarkup(content) ? renderWikiMarkup(content, window.wikiTitleSlugs || {}) : (content || "");
  return DOMPurify.sanitize(source, sanitizeOptions);
}
function safeContentForSearch(content) { return renderStoredContent(content); }

async function loadApprovedArticles() {
  const { data, error } = await supabase.from("wiki_pages")
    .select("slug, title, description, content, article_status");
  if (error) {
    console.error("LiquinWiki: could not load approved article revisions.", error.message);
    const status = document.getElementById("wiki-search-status");
    if (status) status.textContent = "Articles could not be loaded. Please try again later.";
    window.wikiArticlesLoaded = true;
    if (typeof window.filterWikiDirectory === "function") window.filterWikiDirectory();
  if (typeof window.updateWikiPage === "function") window.updateWikiPage();
    return;
  }
  window.wikiTitleSlugs = Object.fromEntries((data || []).map(article => [String(article.title || article.slug).trim().toLocaleLowerCase(), article.slug]));
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
      description.textContent = articleData.description || "LiquinWiki article.";
      card.append(cardHeading, description);
      card.dataset.searchContent = new DOMParser().parseFromString(safeContentForSearch(articleData.content), "text/html").body.textContent || "";
      card.dataset.title = (articleData.title || articleData.slug).toLocaleLowerCase();
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
    const safeContent = renderStoredContent(articleData.content);
    const parsedContent = new DOMParser().parseFromString(safeContent, "text/html");
    const categoryNames = [...parsedContent.querySelectorAll(".wiki-categories a")].map(link => link.textContent.trim()).filter(Boolean);
    const cardForArticle = [...document.querySelectorAll("#wiki-directory .article-card")].find(card => card.querySelector("a")?.getAttribute("href") === "wiki.html#" + articleData.slug);
    if (cardForArticle) {
      const cardLink = cardForArticle.querySelector("h3 a");
      if (cardLink) {
        cardLink.textContent = articleData.title || articleData.slug;
        cardLink.href = "wiki.html#" + articleData.slug;
      }
      const cardDescription = cardForArticle.querySelector(".article-description");
      if (cardDescription) cardDescription.textContent = articleData.description || "LiquinWiki article.";
      cardForArticle.dataset.title = (articleData.title || articleData.slug).toLocaleLowerCase();
      cardForArticle.dataset.categories = categoryNames.map(name => slugifyWikiTitle(name)).join("|");
      cardForArticle.dataset.searchContent = parsedContent.body.textContent || "";
    }
    window.wikiCategoryIndex = window.wikiCategoryIndex || {};
    window.wikiCategoryIndex[articleData.slug] = categoryNames;
    article.innerHTML = header && !/class=["\']article-header["\']/.test(safeContent) ? header.outerHTML + safeContent : safeContent;
    const statusLabels = { complete: "Complete", needs_work: "Needs work", incomplete: "Incomplete" };
    const statusValue = statusLabels[articleData.article_status] ? articleData.article_status : "incomplete";
    const labelText = statusLabels[statusValue];
    const articleHeader = article.querySelector(".article-header");
    if (articleHeader) {
      let badge = articleHeader.querySelector(".wiki-completion-tag");
      if (!badge) { badge = document.createElement("span"); badge.className = "wiki-completion-tag"; articleHeader.append(badge); }
      badge.dataset.status = statusValue;
      badge.textContent = labelText;
    }
    const currentCard = [...document.querySelectorAll("#wiki-directory .article-card")].find(card => card.querySelector("a")?.getAttribute("href") === "wiki.html#" + articleData.slug);
    if (currentCard) {
      let badge = currentCard.querySelector(".wiki-completion-tag");
      if (!badge) { badge = document.createElement("span"); badge.className = "wiki-completion-tag"; currentCard.append(badge); }
      badge.dataset.status = statusValue;
      badge.textContent = labelText;
    }
    if (window.location.hash === "#" + articleData.slug) {
      document.title = (articleData.title || articleData.slug) + " - Liquinwiki";
    }
  }
  window.wikiArticlesLoaded = true;
  const searchStatus = document.getElementById("wiki-search-status");
  const categoryFilter = document.getElementById("wiki-category-filter");
  if (categoryFilter) {
    const categories = [...new Set(Object.values(window.wikiCategoryIndex || {}).flat())].sort((a, b) => a.localeCompare(b));
    for (const name of categories) {
      if ([...categoryFilter.options].some(option => option.textContent === name)) continue;
      const option = document.createElement("option");
      option.value = slugifyWikiTitle(name);
      option.textContent = name;
      categoryFilter.append(option);
    }
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (requestedCategory && [...categoryFilter.options].some(option => option.value === requestedCategory.toLocaleLowerCase())) categoryFilter.value = requestedCategory.toLocaleLowerCase();
    categoryFilter.dispatchEvent(new Event("change"));
  }
  if (searchStatus && !categoryFilter) searchStatus.textContent = "Showing all " + document.querySelectorAll("#wiki-directory .article-card").length + " articles.";
  if (typeof window.updateWikiPage === "function") window.updateWikiPage();
}
async function requireMemberAccess() {
  const gate = document.getElementById("wiki-access-gate");
  const container = document.querySelector("main.wiki-container");
  if (container) container.hidden = true;
  document.documentElement.classList.remove("wiki-access-pending");
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
  const editLink = document.getElementById("wiki-edit-current");
  const historyLink = document.getElementById("wiki-history-current");
  const articleLink = document.getElementById("wiki-tab-article");
  const slug = window.location.hash.slice(1);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
  const encoded = encodeURIComponent(slug);
  if (editLink) editLink.href = "wiki-editor.html?article=" + encoded;
  if (historyLink) historyLink.href = "wiki-editor.html?article=" + encoded + "&tab=history#revision-history";
  if (articleLink) articleLink.href = "wiki.html#" + encoded;
}
window.addEventListener("hashchange", updateCurrentArticleEditLink);
document.addEventListener("DOMContentLoaded", updateCurrentArticleEditLink);
updateCurrentArticleEditLink();
