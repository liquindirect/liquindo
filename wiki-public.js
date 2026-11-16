import { supabase } from "./supabase-client.js";
import DOMPurify from "https://esm.sh/dompurify@3";
import { looksLikeWikiMarkup, renderWikiMarkup, slugifyWikiTitle } from "./wiki-markup.js?v=20261116-tags-unified1";


const sanitizeOptions = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "object", "embed", "svg", "math"]
};

function renderStoredContent(content) {
  const source = looksLikeWikiMarkup(content) ? renderWikiMarkup(content, window.wikiTitleSlugs || {}) : (content || "");
  return DOMPurify.sanitize(source, sanitizeOptions);
}
function safeContentForSearch(content) { return renderStoredContent(content); }
function normalizeArticleTags(names) {
  const seen = new Set();
  return (names || []).map(name => String(name || "").trim().replace(/\s+/g, " "))
    .filter(name => {
      const key = slugifyWikiTitle(name);
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function loadApprovedArticles() {
  const { data, error } = await supabase.from("wiki_pages")
    .select("slug, title, description, content, article_status, updated_at");
  if (error) {
    console.error("LiquinWiki: could not load approved article revisions.", error.message);
    const status = document.getElementById("wiki-search-status");
    if (status) status.textContent = "Articles could not be loaded. Please try again later.";
    window.wikiArticlesLoaded = true;
    if (typeof window.filterWikiDirectory === "function") window.filterWikiDirectory();
  if (typeof window.updateWikiPage === "function") window.updateWikiPage();
    return;
  }
  const { data: deletedRows, error: deletedError } = await supabase.from("wiki_deleted_articles").select("slug");
  if (deletedError) console.warn("LiquinWiki: deleted article list could not be loaded.", deletedError.message);
  const deletedSlugs = new Set((deletedRows || []).map(row => row.slug));
  for (const slug of deletedSlugs) {
    document.getElementById(slug)?.remove();
    document.querySelectorAll("#wiki-directory .article-card a").forEach(link => {
      if (link.getAttribute("href") === "wiki.html#" + slug) link.closest(".article-card")?.remove();
    });
  }
  const visibleArticles = (data || []).filter(article => !deletedSlugs.has(article.slug));
  window.wikiTitleSlugs = Object.fromEntries(visibleArticles.map(article => [String(article.title || article.slug).trim().toLocaleLowerCase(), article.slug]));
  for (const articleData of visibleArticles) {
    let article = document.getElementById(articleData.slug);
    let articleHeaderTemplate = null;
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
      const updated = document.createElement("time");
      updated.className = "article-updated";
      updated.dateTime = articleData.updated_at || "";
      updated.textContent = articleData.updated_at ? "Last edited " + new Date(articleData.updated_at).toLocaleDateString() : "";
      card.append(updated);
      card.dataset.searchContent = new DOMParser().parseFromString(safeContentForSearch(articleData.content), "text/html").body.textContent || "";
      card.dataset.title = (articleData.title || articleData.slug).toLocaleLowerCase();
      card.dataset.updatedAt = articleData.updated_at || "";
      list.append(card);

      article = document.createElement("article");
      article.id = articleData.slug;
      article.className = "wiki-article";
      article.setAttribute("data-wiki-article", "");
      article.hidden = true;
      const header = document.createElement("header");
      header.className = "article-header";
      articleHeaderTemplate = header;
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

    // Ensure a published article has a directory card even when its article
    // body was already present in the static page markup.
    const directoryList = document.querySelector("#wiki-directory .articles-list");
    if (directoryList && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(articleData.slug)) {
      let directoryCard = [...directoryList.querySelectorAll(".article-card")].find(card =>
        card.querySelector("a")?.getAttribute("href") === "wiki.html#" + articleData.slug
      );
      if (!directoryCard) {
        directoryCard = document.createElement("article");
        directoryCard.className = "article-card";
        const heading = document.createElement("h3");
        const link = document.createElement("a");
        link.href = "wiki.html#" + articleData.slug;
        link.textContent = articleData.title || articleData.slug;
        heading.append(link);
        const description = document.createElement("p");
        description.className = "article-description";
        description.textContent = articleData.description || "LiquinWiki article.";
        const updated = document.createElement("time");
        updated.className = "article-updated";
        directoryCard.append(heading, description, updated);
        directoryList.append(directoryCard);
      }
      directoryCard.dataset.title = (articleData.title || articleData.slug).toLocaleLowerCase();
      directoryCard.dataset.updatedAt = articleData.updated_at || "";
      directoryCard.dataset.searchContent = new DOMParser()
        .parseFromString(safeContentForSearch(articleData.content), "text/html").body.textContent || "";
      const description = directoryCard.querySelector(".article-description");
      if (description) description.textContent = articleData.description || "LiquinWiki article.";
      const updated = directoryCard.querySelector(".article-updated");
      if (updated) {
        updated.dateTime = articleData.updated_at || "";
        updated.textContent = articleData.updated_at ? "Last edited " + new Date(articleData.updated_at).toLocaleDateString() : "";
      }
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
    const categoryNames = normalizeArticleTags([
      ...[...parsedContent.querySelectorAll(".wiki-categories a")].map(link => link.textContent),
      // The Liquindian Directorate is the designated recommended article.
      (articleData.slug === "liquindian-directorate" || String(articleData.title || "").trim().toLocaleLowerCase() === "liquindian directorate") ? "Recommended" : ""
    ]);
    const cardForArticle = [...document.querySelectorAll("#wiki-directory .article-card")].find(card => card.querySelector("a")?.getAttribute("href") === "wiki.html#" + articleData.slug);
    if (cardForArticle) {
      const cardLink = cardForArticle.querySelector("h3 a");
      if (cardLink) {
        cardLink.textContent = articleData.title || articleData.slug;
        cardLink.href = "wiki.html#" + articleData.slug;
      }
      const cardDescription = cardForArticle.querySelector(".article-description");
      if (cardDescription) cardDescription.textContent = articleData.description || "LiquinWiki article.";
      let updatedLabel = cardForArticle.querySelector(".article-updated");
      if (!updatedLabel) { updatedLabel = document.createElement("time"); updatedLabel.className = "article-updated"; cardForArticle.append(updatedLabel); }
      updatedLabel.dateTime = articleData.updated_at || "";
      updatedLabel.textContent = articleData.updated_at ? "Last edited " + new Date(articleData.updated_at).toLocaleDateString() : "";
      cardForArticle.dataset.title = (articleData.title || articleData.slug).toLocaleLowerCase();
      cardForArticle.dataset.updatedAt = articleData.updated_at || "";
      cardForArticle.dataset.categories = categoryNames.map(name => slugifyWikiTitle(name)).join("|");
      cardForArticle.dataset.searchContent = parsedContent.body.textContent || "";
    }
    window.wikiCategoryIndex = window.wikiCategoryIndex || {};
    window.wikiCategoryIndex[articleData.slug] = categoryNames;
    article.innerHTML = articleHeaderTemplate && !/class=["\']article-header["\']/.test(safeContent) ? articleHeaderTemplate.outerHTML + safeContent : safeContent;
    const statusLabels = { complete: "Complete", needs_work: "Needs work", incomplete: "Incomplete" };
    const statusValue = statusLabels[articleData.article_status] ? articleData.article_status : "incomplete";
    const labelText = statusLabels[statusValue];
    let articleHeader = article.querySelector(".article-header");
    if (!articleHeader) {
      articleHeader = document.createElement("header");
      articleHeader.className = "article-header";
      const heading = document.createElement("h1");
      heading.className = "article-title";
      heading.textContent = articleData.title || articleData.slug;
      articleHeader.append(heading);
      article.prepend(articleHeader);
    }
    let articleBadge = articleHeader.querySelector(".wiki-completion-tag");
    if (!articleBadge) { articleBadge = document.createElement("span"); articleBadge.className = "wiki-completion-tag"; articleHeader.append(articleBadge); }
    articleBadge.dataset.status = statusValue;
    articleBadge.textContent = labelText;

    // Show assigned directory categories as visible tags on the article itself.
    const articleCategories = [...new Set([
      ...categoryNames,
    ])];
    let categoryTags = articleHeader.querySelector(".wiki-article-category-tags");
    if (!categoryTags) {
      categoryTags = document.createElement("div");
      categoryTags.className = "wiki-article-category-tags";
      categoryTags.setAttribute("aria-label", "Article categories");
      articleHeader.append(categoryTags);
    }
    categoryTags.replaceChildren();
    for (const categoryName of articleCategories) {
      const tag = document.createElement("a");
      tag.className = "wiki-category-tag";
      tag.href = "wiki.html?category=" + encodeURIComponent(slugifyWikiTitle(categoryName));
      tag.textContent = categoryName;
      categoryTags.append(tag);
    }
    const currentCard = [...document.querySelectorAll("#wiki-directory .article-card")].find(card => card.querySelector("a")?.getAttribute("href") === "wiki.html#" + articleData.slug);
    if (currentCard) {
      let badge = currentCard.querySelector(".wiki-completion-tag");
      if (!badge) { badge = document.createElement("span"); badge.className = "wiki-completion-tag"; currentCard.append(badge); }
      badge.dataset.status = statusValue;
      badge.textContent = labelText;
      let cardTags = currentCard.querySelector(".wiki-card-category-tags");
      if (!cardTags) {
        cardTags = document.createElement("div");
        cardTags.className = "wiki-card-category-tags";
        currentCard.append(cardTags);
      }
      cardTags.replaceChildren();
      const cardCategoryNames = [...new Set([
        ...categoryNames,
      ])];
      for (const categoryName of cardCategoryNames) {
        const tag = document.createElement("a");
        tag.className = "wiki-category-tag";
        tag.href = "wiki.html?category=" + encodeURIComponent(slugifyWikiTitle(categoryName));
        tag.textContent = categoryName;
        cardTags.append(tag);
      }
      currentCard.dataset.categories = categoryNames.map(name => slugifyWikiTitle(name)).join("|");
      currentCard.dataset.articleStatus = statusValue;
    }
    if (window.location.hash === "#" + articleData.slug) {
      document.title = (articleData.title || articleData.slug) + " - Liquinwiki";
    }
  }
  window.wikiArticlesLoaded = true;
  const searchStatus = document.getElementById("wiki-search-status");
  const categoryFilter = document.getElementById("wiki-category-filter");
  if (categoryFilter) {
    const categories = normalizeArticleTags([...Object.values(window.wikiCategoryIndex || {}).flat(), "Recommended"]).sort((a, b) => a.localeCompare(b));
    for (const name of categories) {
      if ([...categoryFilter.options].some(option => option.textContent === name)) continue;
      const option = document.createElement("option");
      option.value = slugifyWikiTitle(name);
      option.textContent = name;
      categoryFilter.append(option);
    }
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    const defaultCategory = requestedCategory ? requestedCategory.toLocaleLowerCase() : "";
    if ([...categoryFilter.options].some(option => option.value === defaultCategory)) {
      categoryFilter.value = defaultCategory;
    }
    categoryFilter.dispatchEvent(new Event("change"));
  }
  if (searchStatus && !categoryFilter) searchStatus.textContent = "Showing all " + document.querySelectorAll("#wiki-directory .article-card").length + " articles.";
  if (typeof window.updateWikiPage === "function") window.updateWikiPage();
}
// LiquinWiki's public directory and published articles are publicly readable.
// Editing and administrative actions remain protected by the separate editor permissions.
async function initializePublicWiki() {
  const gate = document.getElementById("wiki-access-gate");
  const container = document.querySelector("main.wiki-container");
  if (gate) gate.hidden = true;
  document.documentElement.classList.remove("wiki-access-pending");
  if (container) container.hidden = false;
  await loadApprovedArticles();
}
initializePublicWiki().catch(error => {
  console.error("LiquinWiki could not be initialized.", error);
  const status = document.getElementById("wiki-search-status");
  if (status) status.textContent = "LiquinWiki could not be loaded. Please refresh the page.";
  window.wikiArticlesLoaded = true;
  if (typeof window.filterWikiDirectory === "function") window.filterWikiDirectory();
  if (typeof window.updateWikiPage === "function") window.updateWikiPage();
});


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
