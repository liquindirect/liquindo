import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import DOMPurify from "https://esm.sh/dompurify@3";

const supabase = createClient(
  "https://uivjovkvpskvvazznlyr.supabase.co",
  "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
);
const articles = {
  "liquindo": "Liquindo",
  "liquin-plan": "Liquin's Plan",
  "lnf": "Liquindo Nationalist Front",
  "integralist-front": "Liquindian Integralist Front",
  "npf": "Nuclear Proliferation Faction"
};
const $ = (selector) => document.querySelector(selector);
const loading = $("#editor-loading");
const signedOut = $("#editor-signed-out");
const noPermission = $("#editor-no-permission");
const app = $("#editor-app");
const articleSelect = $("#article-select");
const canvas = $("#editor-canvas");
const status = $("#editor-status");
const submitButton = $("#submit-revision");
const pendingPanel = $("#review-panel");
const permissionPanel = $("#permission-panel");
const permissionForm = $("#permission-form");
const permissionEmail = $("#permission-email");
const permissionChoice = $("#permission-choice");
const permissionStatus = $("#permission-status");
const pendingContainer = $("#pending-revisions");
const historyContainer = $("#revision-history");
let user = null;
let isWikiAdmin = false;
let isWikiEditor = false;
let activeSlug = null;
let draftTimer = null;
let allLoadedRevisions = [];
let allPendingRevisions = [];
let allComparisonRevisions = [];
let loadedRevisionNames = {};

function draftKey(slug) {
  return "liquinwiki-draft:" + user.id + ":" + slug;
}
function saveDraft() {
  if (!user || !activeSlug || !isWikiEditor) return;
  try {
    const content = safeHtml(canvas.innerHTML);
    if (!content.trim()) return;
    localStorage.setItem(draftKey(activeSlug), JSON.stringify({ content, savedAt: new Date().toISOString() }));
    showMessage("Draft saved on this device · " + new Date().toLocaleTimeString());
  } catch (error) {
    showMessage("Could not save a local draft. Check this browser's storage settings.", true);
  }
}
function scheduleDraftSave() {
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 600);
}
function clearDraftIfMatches(slug, submittedContent) {
  if (!user) return;
  try {
    const key = draftKey(slug);
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && safeHtml(saved.content).trim() === submittedContent) localStorage.removeItem(key);
  } catch {
    // Draft cleanup is best-effort; a saved draft must never block submission.
  }
}

function setVisible(element, visible) {
  element.classList.toggle("editor-hidden", !visible);
}
function showMessage(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#b42318" : "var(--teal)";
}
function safeHtml(html) {
  return DOMPurify.sanitize(html || "", {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "object", "embed", "svg", "math"]
  });
}
function setAppState(state) {
  setVisible(loading, state === "loading");
  setVisible(signedOut, state === "signed-out");
  setVisible(noPermission, state === "no-permission");
  setVisible(app, state === "ready");
}
async function baselineContent(slug) {
  const response = await fetch("wiki.html", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the current wiki article.");
  const html = await response.text();
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const article = parsed.getElementById(slug);
  if (!article) throw new Error("Article not found in wiki.html: " + slug);
  return article.innerHTML;
}
async function loadArticle() {
  if (draftTimer) {
    clearTimeout(draftTimer);
    draftTimer = null;
    saveDraft();
  }
  const slug = articleSelect.value;
  showMessage("Loading article…");
  try {
    const { data, error } = await supabase.from("wiki_pages")
      .select("content").eq("slug", slug).maybeSingle();
    if (error) throw error;
    const html = data?.content ?? await baselineContent(slug);
    activeSlug = slug;
    canvas.innerHTML = safeHtml(html);
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey(slug)) || "null");
      if (draft?.content && draft.content !== safeHtml(html) &&
          window.confirm("A local draft for this article was saved on " + formatDate(draft.savedAt) + ". Restore it?")) {
        canvas.innerHTML = safeHtml(draft.content);
        showMessage(isWikiAdmin ? "Local draft restored. Continue editing; administrator changes publish immediately." : "Local draft restored. Continue editing or submit it for approval.");
        return;
      }
    } catch (error) {
      showMessage("Loaded article, but the local draft could not be read.", true);
      return;
    }
    showMessage("Loaded " + articles[slug] + ".");
  } catch (error) {
    showMessage(error.message || "Could not load article.", true);
  }
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
async function profileNames(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return {};
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", uniqueIds);
  return Object.fromEntries((data || []).map(profile => [profile.id, profile.display_name || "Member"]));
}
async function fetchRevisions() {
  const { data, error } = await supabase.from("wiki_revisions")
    .select("id, page_id, slug, title, content, edited_by, edited_at, status, reviewed_by, reviewed_at, review_note")
    .order("edited_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}
async function fetchPendingRevisions() {
  const { data, error } = await supabase.from("wiki_revisions")
    .select("id, page_id, slug, title, content, edited_by, edited_at, status, reviewed_by, reviewed_at, review_note")
    .eq("status", "pending")
    .order("edited_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
function revisionTextLines(html) {
  const parsed = new DOMParser().parseFromString(safeHtml(html), "text/html");
  const root = parsed.body;
  const blocks = [...root.children];
  const lines = (blocks.length ? blocks : [root]).map(node => (node.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean);
  return lines.length ? lines : [""];
}
function renderComparison(revision, oldHtml, oldLabel, newLabel) {
  const panel = $("#revision-compare-panel");
  const result = $("#revision-compare-result");
  $("#revision-compare-title").textContent = "Compare: " + (revision.title || articles[revision.slug] || revision.slug);
  result.replaceChildren();
  result.append(element("p", "revision-meta", oldLabel + " vs " + newLabel));
  const oldLines = revisionTextLines(oldHtml);
  const newLines = revisionTextLines(revision.content);
  const diff = element("div", "revision-diff");
  const legend = element("div", "revision-diff-legend");
  legend.append(element("span", "", "＋ Added"), element("span", "", "− Removed"), element("span", "", "  Unchanged"));
  result.append(legend);
  if (oldLines.length * newLines.length > 40000) {
    result.append(element("p", "", "This article is too large for an automatic line-by-line comparison. Open the submitted content preview and the live article separately."));
    panel.classList.remove("editor-hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const dp = Array.from({ length: oldLines.length + 1 }, () => new Uint32Array(newLines.length + 1));
  for (let i = oldLines.length - 1; i >= 0; i--) {
    for (let j = newLines.length - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.append(element("span", "revision-diff-line unchanged", "  " + oldLines[i]));
      i++; j++;
    } else if (j < newLines.length && (i === oldLines.length || dp[i][j + 1] >= dp[i + 1][j])) {
      diff.append(element("span", "revision-diff-line added", "+ " + newLines[j]));
      j++;
    } else {
      diff.append(element("span", "revision-diff-line removed", "− " + oldLines[i]));
      i++;
    }
  }
  result.append(diff);
  panel.classList.remove("editor-hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
function showRevisionComparison(revision, allRevisions) {
  const older = allRevisions
    .filter(item => item.slug === revision.slug && item.id !== revision.id &&
      new Date(item.edited_at).getTime() < new Date(revision.edited_at).getTime())
    .sort((a, b) => new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime())[0];
  if (!older) {
    const panel = $("#revision-compare-panel");
    $("#revision-compare-title").textContent = "Compare: " + (revision.title || articles[revision.slug] || revision.slug);
    $("#revision-compare-result").replaceChildren(element("p", "", "There is no older revision of this article in the loaded history to compare against."));
    panel.classList.remove("editor-hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  renderComparison(revision, older.content,
    "Older version (" + formatDate(older.edited_at) + ")",
    "Selected revision (" + formatDate(revision.edited_at) + ")");
}
async function showLiveRevisionComparison(revision) {
  showMessage("Loading the current live article for comparison…");
  try {
    const { data, error } = await supabase.from("wiki_pages")
      .select("content, updated_at").eq("slug", revision.slug).maybeSingle();
    if (error) throw error;
    const liveHtml = data?.content ?? await baselineContent(revision.slug);
    renderComparison(revision, liveHtml,
      "Current live article" + (data?.updated_at ? " (" + formatDate(data.updated_at) + ")" : ""),
      "Proposed revision (" + formatDate(revision.edited_at) + ")");
    showMessage("Comparison ready. Review removed and added lines before deciding.");
  } catch (error) {
    showMessage(error.message || "Could not compare against the live article.", true);
  }
}
$("#close-revision-compare").addEventListener("click", () => $("#revision-compare-panel").classList.add("editor-hidden"));

function addRevisionCard(container, revision, names, showReviewActions, allRevisions) {
  const card = element("article", "revision-card");
  const heading = element("h3", "", revision.title || articles[revision.slug] || revision.article_slug);
  card.append(heading);
  const statusLine = element("p", "revision-meta");
  statusLine.textContent = "Status: " + revision.status + " · Submitted by " +
    (names[revision.edited_by] || "Member") + " · " + formatDate(revision.edited_at);
  card.append(statusLine);
  if (revision.reviewed_at) {
    card.append(element("p", "revision-meta", "Reviewed by " +
      (names[revision.reviewed_by] || "Administrator") + " · " + formatDate(revision.reviewed_at)));
  }
  if (revision.review_note) card.append(element("p", "", "Review note: " + revision.review_note));

  const details = element("details");
  const summary = element("summary", "", "View submitted content");
  details.append(summary);
  const preview = element("div", "revision-preview wiki-article");
  preview.innerHTML = safeHtml(revision.content);
  details.append(preview);
  card.append(details);

  const actions = element("div", "revision-actions");
  const loadButton = element("button", "editor-button", "Load as a new revision");
  loadButton.type = "button";
  loadButton.addEventListener("click", () => {
    if (!Object.prototype.hasOwnProperty.call(articles, revision.slug)) {
      showMessage("This revision refers to an article that is not available in the editor.", true);
      return;
    }
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; saveDraft(); }
    articleSelect.value = revision.slug;
    activeSlug = revision.slug;
    canvas.innerHTML = safeHtml(revision.content);
    showMessage("Loaded an earlier version. Submit it to create a new revision; history will remain intact.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  actions.append(loadButton);
  const compareButton = element("button", "editor-button", "Compare with older revision");
  compareButton.type = "button";
  compareButton.addEventListener("click", () => showRevisionComparison(revision, allRevisions));
  actions.append(compareButton);

  if (showReviewActions && revision.status === "pending" && user && revision.edited_by === user.id) {
    actions.append(element("p", "editor-note", "You submitted this revision. For independent review, another LiquinWiki administrator must approve or reject it."));
  }

  if (showReviewActions && revision.status === "pending" && (!user || revision.edited_by !== user.id)) {
    const liveCompare = element("button", "editor-button", "Compare with live article");
    liveCompare.type = "button";
    liveCompare.addEventListener("click", () => showLiveRevisionComparison(revision));
    actions.append(liveCompare);
    const approve = element("button", "editor-button", "Approve and publish");
    approve.type = "button";
    approve.addEventListener("click", () => reviewRevision(revision.id, "approved", names));
    const reject = element("button", "editor-button", "Reject");
    reject.type = "button";
    reject.addEventListener("click", () => reviewRevision(revision.id, "rejected", names));
    actions.append(approve, reject);
  }
  card.append(actions);
  container.append(card);
}
function renderSubmissionStatusSummary() {
  const summary = $("#submission-status-summary");
  if (!summary) return;
  if (!user) {
    summary.textContent = "Sign in to see your submission status.";
    return;
  }
  const mine = allLoadedRevisions.filter(revision => revision.edited_by === user.id);
  const count = status => mine.filter(revision => revision.status === status).length;
  const pending = count("pending");
  const approved = count("approved");
  const rejected = count("rejected");
  summary.replaceChildren();
  const heading = element("h3", "", "Your submission status");
  const detail = element("p", "", mine.length
    ? mine.length + " submission" + (mine.length === 1 ? "" : "s") + " in the latest 100 revisions: " +
      pending + " pending · " + approved + " approved · " + rejected + " rejected."
    : "No submissions from this account appear in the latest 100 revisions.");
  summary.append(heading, detail);
  const needsAttention = mine.filter(revision => revision.status === "rejected");
  if (needsAttention.length) {
    const attention = element("p", "editor-note", "Needs attention: review the note on your rejected revision" +
      (needsAttention.length === 1 ? "" : "s") + " below, then load the content as a new revision if you want to resubmit.");
    summary.append(attention);
  }
}
function renderFilteredHistory() {
  renderSubmissionStatusSummary();
  const articleFilter = $("#history-article-filter")?.value || "";
  const statusFilter = $("#history-status-filter")?.value || "";
  const mineOnly = $("#history-mine-only")?.checked || false;
  const searchQuery = ($("#history-search")?.value || "").trim().toLocaleLowerCase();
  const filtered = allLoadedRevisions.filter(revision => {
    if (mineOnly && (!user || revision.edited_by !== user.id)) return false;
    if (articleFilter && revision.slug !== articleFilter) return false;
    if (statusFilter && revision.status !== statusFilter) return false;
    if (searchQuery) {
      const searchable = [
        revision.title,
        articles[revision.slug],
        revision.slug,
        loadedRevisionNames[revision.edited_by],
        loadedRevisionNames[revision.reviewed_by],
        revision.review_note,
        revision.status
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      if (!searchable.includes(searchQuery)) return false;
    }
    return true;
  });
  historyContainer.replaceChildren();
  if (!filtered.length) {
    historyContainer.append(element("p", "", allLoadedRevisions.length
      ? "No revisions match these filters."
      : "No revisions have been submitted yet."));
  } else {
    for (const revision of filtered) addRevisionCard(historyContainer, revision, loadedRevisionNames, false, allLoadedRevisions);
  }
  const summary = $("#history-filter-status");
  if (summary) summary.textContent = "Showing " + filtered.length + " of " + allLoadedRevisions.length + " revisions.";
}
["#history-article-filter", "#history-status-filter", "#history-search", "#history-mine-only"].forEach(selector => {
  $(selector)?.addEventListener("input", renderFilteredHistory);
  $(selector)?.addEventListener("change", renderFilteredHistory);
});
$("#history-filter-reset")?.addEventListener("click", () => {
  $("#history-article-filter").value = "";
  $("#history-status-filter").value = "";
  $("#history-search").value = "";
  $("#history-mine-only").checked = false;
  renderFilteredHistory();
});

function renderPendingRevisions(pending, allRevisions, names) {
  const articleFilter = $("#pending-article-filter")?.value || "";
  const search = ($("#pending-review-search")?.value || "").trim().toLocaleLowerCase();
  const sort = $("#pending-review-sort")?.value || "newest";
  const filtered = pending.filter(revision => {
    if (articleFilter && revision.slug !== articleFilter) return false;
    if (search) {
      const haystack = [
        revision.title,
        articles[revision.slug],
        revision.slug,
        names[revision.edited_by]
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
  filtered.sort((a, b) => (new Date(a.edited_at).getTime() - new Date(b.edited_at).getTime()) * (sort === "oldest" ? 1 : -1));
  pendingContainer.replaceChildren();
  if (!filtered.length) {
    pendingContainer.append(element("p", "", pending.length
      ? "No pending revisions match these review filters."
      : "There are no pending revisions."));
  } else {
    for (const revision of filtered) addRevisionCard(pendingContainer, revision, names, true, allRevisions);
  }
  const count = $("#pending-review-filter-status");
  if (count) count.textContent = "Showing " + filtered.length + " of " + pending.length + " pending revisions.";
}
["#pending-article-filter", "#pending-review-search", "#pending-review-sort"].forEach(selector => {
  $(selector)?.addEventListener("input", () => {
    if (isWikiAdmin) renderPendingRevisions(allPendingRevisions, allComparisonRevisions, loadedRevisionNames);
  });
  $(selector)?.addEventListener("change", () => {
    if (isWikiAdmin) renderPendingRevisions(allPendingRevisions, allComparisonRevisions, loadedRevisionNames);
  });
});
$("#pending-review-reset")?.addEventListener("click", () => {
  $("#pending-article-filter").value = "";
  $("#pending-review-search").value = "";
  $("#pending-review-sort").value = "newest";
  if (isWikiAdmin) renderPendingRevisions(allPendingRevisions, allComparisonRevisions, loadedRevisionNames);
});

async function renderRevisions() {
  historyContainer.replaceChildren(element("p", "", "Loading revision history…"));
  if (isWikiAdmin) {
    pendingPanel.classList.remove("editor-hidden");
    pendingContainer.replaceChildren(element("p", "", "Loading pending revisions…"));
  } else {
    pendingPanel.classList.add("editor-hidden");
  }
  try {
    const revisions = await fetchRevisions();
    const pending = isWikiAdmin ? await fetchPendingRevisions() : [];
    const comparisonRevisions = [...new Map([...revisions, ...pending].map(revision => [revision.id, revision])).values()];
    const names = await profileNames(comparisonRevisions.flatMap(r => [r.edited_by, r.reviewed_by]));
    allLoadedRevisions = revisions;
    allPendingRevisions = pending;
    allComparisonRevisions = comparisonRevisions;
    loadedRevisionNames = names;
    renderFilteredHistory();

    if (isWikiAdmin) {
      const alert = $("#pending-revision-alert");
      if (alert) {
        alert.classList.toggle("pending-alert-active", pending.length > 0);
        alert.textContent = pending.length
          ? "Action needed: " + pending.length + " pending revision" + (pending.length === 1 ? "" : "s") +
            " awaiting review. Review them below."
          : "All clear: there are no pending revisions awaiting review.";
      }
      renderPendingRevisions(pending, comparisonRevisions, names);
    }
  } catch (error) {
    historyContainer.replaceChildren(element("p", "", error.message || "Could not load revision history."));
    if (isWikiAdmin) pendingContainer.replaceChildren(element("p", "", "Could not load pending revisions."));
  }
}
async function reviewRevision(id, decision, names = {}) {
  let note = "";
  try {
    // Re-check the latest database status before asking for a publication decision.
    const { data: latest, error: lookupError } = await supabase.from("wiki_revisions")
      .select("id, slug, title, status, edited_by, edited_at")
      .eq("id", id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!latest) throw new Error("This revision could not be found. Refresh the page and try again.");
    if (latest.status !== "pending") {
      showMessage("This revision is no longer pending. Refreshing the revision list.", true);
      await renderRevisions();
      return;
    }

    if (decision === "rejected") {
      const detail = "Reject this pending revision?\n\nArticle: " +
        (latest.title || articles[latest.slug] || latest.slug) + "\nSubmitted by: " +
        (names[latest.edited_by] || "Member") + "\nSubmitted: " + formatDate(latest.edited_at) +
        "\n\nYou can optionally add a note for the editor.";
      if (!window.confirm(detail)) return;
      note = window.prompt("Optional note for the editor:", "") || "";
    } else {
      const detail = "PUBLISH THIS REVISION TO THE LIVE WIKI?\n\nArticle: " +
        (latest.title || articles[latest.slug] || latest.slug) + "\nSubmitted by: " +
        (names[latest.edited_by] || "Member") + "\nSubmitted: " + formatDate(latest.edited_at) +
        "\n\nThe approved content will replace the current live version of this article. " +
        "Check the submitted content preview and revision comparison before continuing.";
      if (!window.confirm(detail)) return;
    }

    const { error } = await supabase.rpc("review_liquinwiki_revision", {
      p_revision_id: id,
      p_decision: decision,
      p_note: note
    });
    if (error) throw error;
    showMessage(decision === "approved" ? "Revision approved and published." : "Revision rejected.");
    await renderRevisions();
  } catch (error) {
    showMessage(error.message || "Could not review this revision.", true);
  }
}

permissionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isWikiAdmin) return;
  const email = permissionEmail.value.trim();
  const permission = permissionChoice.value;
  const button = $("#permission-save");
  button.disabled = true;
  permissionStatus.textContent = "Saving permission…";
  permissionStatus.style.color = "";
  try {
    const { error } = await supabase.rpc("set_liquinwiki_permission", {
      p_email: email,
      p_permission: permission
    });
    if (error) throw error;
    permissionStatus.textContent = permission === "none"
      ? "Wiki access removed for that account."
      : "Wiki permission saved. The user may need to refresh or sign in again.";
    permissionEmail.value = "";
  } catch (error) {
    permissionStatus.textContent = error.message || "Could not save wiki permission.";
    permissionStatus.style.color = "#b42318";
  } finally {
    button.disabled = false;
  }
});

$("#load-article").addEventListener("click", loadArticle);
articleSelect.addEventListener("change", loadArticle);
canvas.addEventListener("input", scheduleDraftSave);
window.addEventListener("pagehide", () => {
  if (draftTimer) clearTimeout(draftTimer);
  saveDraft();
});
document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => {
    canvas.focus();
    document.execCommand(button.dataset.command, false, button.dataset.value || null);
  });
});
$("#insert-link").addEventListener("click", () => {
  const url = window.prompt("Enter the link URL (https://…):", "https://");
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) {
    showMessage("Please use a full https:// or http:// link.", true);
    return;
  }
  canvas.focus();
  document.execCommand("createLink", false, url);
});
$("#remove-format").addEventListener("click", () => {
  canvas.focus();
  document.execCommand("removeFormat", false, null);
});
submitButton.addEventListener("click", async () => {
  if (!user || !isWikiEditor) return;
  const slug = articleSelect.value;
  const content = safeHtml(canvas.innerHTML).trim();
  if (!content) {
    showMessage("Article content cannot be empty.", true);
    return;
  }
  if (content.length > 200000) {
    showMessage("This article is too long to submit.", true);
    return;
  }
  submitButton.disabled = true;
  showMessage(isWikiAdmin ? "Publishing article and recording revision history…" : "Submitting revision for approval…");
  try {
    if (isWikiAdmin) {
      const { error } = await supabase.rpc("publish_liquinwiki_admin_revision", {
        p_slug: slug,
        p_title: articles[slug],
        p_content: content
      });
      if (error) throw error;
      clearDraftIfMatches(slug, content);
      showMessage("Article published immediately. A revision was recorded in history.");
      await renderRevisions();
      return;
    }
    const { data: page, error: pageError } = await supabase.from("wiki_pages")
      .select("id").eq("slug", slug).maybeSingle();
    if (pageError) throw pageError;
    const { error } = await supabase.from("wiki_revisions").insert({
      page_id: page?.id ?? null,
      slug,
      title: articles[slug],
      content,
      edited_by: user.id,
      status: "pending"
    });
    if (error) throw error;
    clearDraftIfMatches(slug, content);
    showMessage("Revision submitted. It will go live only after an administrator approves it.");
    await renderRevisions();
  } catch (error) {
    showMessage(error.message || "Could not submit the revision.", true);
  } finally {
    submitButton.disabled = false;
  }
});

async function initialize() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.user) {
    setAppState("signed-out");
    return;
  }
  user = session.user;
  const [{ data: profile, error: profileError }, { data: permission, error: permissionError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("wiki_permissions").select("permission").eq("user_id", user.id).maybeSingle()
  ]);
  if (profileError) throw profileError;
  if (permissionError) throw permissionError;
  isWikiAdmin = profile?.role === "admin" || permission?.permission === "liquinwiki_admin";
  isWikiEditor = isWikiAdmin || permission?.permission === "liquinwiki_editor";
  submitButton.textContent = isWikiAdmin ? "Publish article immediately" : "Submit revision for approval";
  if (!isWikiEditor) {
    setAppState("no-permission");
    return;
  }
  setAppState("ready");
  setVisible(permissionPanel, isWikiAdmin);
  await loadArticle();
  await renderRevisions();
}
try {
  await initialize();
} catch (error) {
  setAppState("no-permission");
  const explanation = noPermission.querySelector("p");
  explanation.textContent = error.message || "Could not initialize the editor. Check that the Supabase SQL setup has been run.";
  explanation.style.color = "#b42318";
}
