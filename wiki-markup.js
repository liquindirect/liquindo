const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
}[char]));

export function slugifyWikiTitle(value) {
  return String(value ?? "").trim().toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "article";
}

function renderInline(source, titleToSlug = {}) {
  let text = escapeHtml(source);
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, label) => {
    const slug = titleToSlug[target.trim().toLocaleLowerCase()] || slugifyWikiTitle(target);
    return '<a href="wiki.html#' + encodeURIComponent(slug) + '">' + label + "</a>";
  });
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
    const slug = titleToSlug[target.trim().toLocaleLowerCase()] || slugifyWikiTitle(target);
    return '<a href="wiki.html#' + encodeURIComponent(slug) + '">' + escapeHtml(target.trim()) + "</a>";
  });
  text = text.replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]/g, (_, url, label) =>
    '<a href="' + url + '" rel="nofollow noopener noreferrer" target="_blank">' + (label || url) + "</a>");
  text = text.replace(/'''(.+?)'''/g, "<strong>$1</strong>");
  text = text.replace(/''(.+?)''/g, "<em>$1</em>");
  return text;
}

export function renderWikiMarkup(source, titleToSlug = {}) {
  const categories = [];
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push("<p>" + paragraph.map(line => renderInline(line, titleToSlug)).join("<br>") + "</p>");
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      output.push("</" + listType + ">");
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const category = line.match(/^\[\[Category:([^\]]+)\]\]$/i);
    if (category) {
      const name = category[1].trim();
      if (name && !categories.includes(name)) categories.push(name);
      continue;
    }
    const heading = line.match(/^(={2,4})\s*(.*?)\s*\1$/);
    const list = line.match(/^([*#])\s+(.+)$/);
    if (!line || heading || list) flushParagraph();
    if (!line) { closeList(); continue; }
    if (heading) {
      closeList();
      const level = Math.min(4, Math.max(2, heading[1].length));
      output.push("<h" + level + ">" + renderInline(heading[2], titleToSlug) + "</h" + level + ">");
      continue;
    }
    if (list) {
      const nextType = list[1] === "*" ? "ul" : "ol";
      if (listType !== nextType) { closeList(); output.push("<" + nextType + ">"); listType = nextType; }
      output.push("<li>" + renderInline(list[2], titleToSlug) + "</li>");
      continue;
    }
    closeList();
    paragraph.push(line);
  }
  flushParagraph();
  closeList();

  if (categories.length) {
    output.push('<div class="wiki-categories" aria-label="Article categories"><strong>Categories:</strong> ' +
      categories.map(name => '<a href="wiki.html?category=' + encodeURIComponent(slugifyWikiTitle(name)) + '">' + escapeHtml(name) + '</a>').join(" · ") +
      "</div>");
  }
  return output.join("\n");
}

export function htmlToWikiMarkup(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ""), "text/html");
  const convert = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    const inner = [...node.childNodes].map(convert).join("");
    if (tag === "h2" || tag === "h3" || tag === "h4") return "\n" + "=".repeat(Number(tag.slice(1))) + " " + inner.trim() + " " + "=".repeat(Number(tag.slice(1))) + "\n";
    if (tag === "p" || tag === "div" || tag === "section") return inner + "\n\n";
    if (tag === "strong" || tag === "b") return "'''" + inner + "'''";
    if (tag === "em" || tag === "i") return "''" + inner + "''";
    if (tag === "li") return "* " + inner + "\n";
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      if (href.startsWith("wiki.html#")) return "[[" + decodeURIComponent(href.slice("wiki.html#".length)).replace(/-/g, " ") + "|" + inner + "]]";
      return href ? "[" + href + " " + inner + "]" : inner;
    }
    if (tag === "br") return "\n";
    return inner;
  };
  return [...doc.body.childNodes].map(convert).join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function looksLikeWikiMarkup(source) {
  const text = String(source ?? "").trim();
  if (!text || /<\/?[a-z][^>]*>/i.test(text)) return false;
  return /^(?:={2,4}\s|\[\[|[*#]\s)|\[\[Category:/im.test(text);
}
