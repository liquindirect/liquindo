const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
}[char]));

export function slugifyWikiTitle(value) {
  return String(value ?? "").trim().toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "article";
}

function internalLink(target, label, titleToSlug) {
  const cleanTarget = String(target || "").trim();
  const slug = titleToSlug[cleanTarget.toLocaleLowerCase()] || slugifyWikiTitle(cleanTarget);
  return '<a href="wiki.html#' + encodeURIComponent(slug) + '">' +
    (label == null ? escapeHtml(cleanTarget) : label) + "</a>";
}

function renderInline(source, titleToSlug = {}, refs = null) {
  let text = escapeHtml(source);
  // References are collected before ordinary inline formatting so reference bodies can contain links.
  if (refs) {
    text = text.replace(/&lt;ref(?:\s+name=&quot;([^&]+)&quot;)?\s*\/&gt;/gi, (_, name) => {
      const key = name ? decodeEntities(name) : "";
      const ref = key ? refs.named.get(key) : refs.items[refs.items.length - 1];
      if (!ref) return '<sup class="reference">[?]</sup>';
      ref.uses++;
      return '<sup class="reference" id="cite_ref-' + ref.id + '-' + ref.uses + '"><a href="#cite_note-' + ref.id + '">' + ref.id + '</a></sup>';
    });
    text = text.replace(/&lt;ref(?:\s+name=&quot;([^&]+)&quot;)?&gt;([\s\S]*?)&lt;\/ref&gt;/gi, (_, name, body) => {
      const key = name ? decodeEntities(name) : "";
      let ref = key ? refs.named.get(key) : null;
      if (!ref) {
        ref = { id: refs.items.length + 1, key, body, uses: 0 };
        refs.items.push(ref);
        if (key) refs.named.set(key, ref);
      }
      ref.uses++;
      return '<sup class="reference" id="cite_ref-' + ref.id + '-' + ref.uses + '"><a href="#cite_note-' + ref.id + '">' + ref.id + '</a></sup>';
    });
  }
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, target, label) => internalLink(decodeEntities(target), label, titleToSlug));
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_, target) => internalLink(decodeEntities(target), null, titleToSlug));
  text = text.replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]/g, (_, url, label) =>
    '<a href="' + url + '" rel="nofollow noopener noreferrer" target="_blank">' + (label || url) + "</a>");
  text = text.replace(/'''(.+?)'''/g, "<strong>$1</strong>");
  text = text.replace(/''(.+?)''/g, "<em>$1</em>");
  text = text.replace(/~~(.+?)~~/g, "<del>$1</del>");
  return text;
}

function decodeEntities(value) {
  return String(value ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function renderInfobox(lines, titleToSlug, refs) {
  const first = lines[0].match(/^\{\{Infobox(?:\s+([^|}]+))?/i);
  const kind = (first?.[1] || "Information").trim();
  const fields = [];
  let current = null;
  for (const line of lines.slice(1)) {
    if (/^\s*\}\}\s*$/.test(line)) break;
    const field = line.match(/^\s*\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (field) {
      current = { key: field[1].trim(), value: field[2].trim() };
      fields.push(current);
    } else if (current && line.trim()) current.value += " " + line.trim();
  }
  const rows = fields.map(({ key, value }) => {
    const rendered = /^\s*(https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg))(?:\s*\|\s*(.*))?$/i.exec(value);
    const cell = rendered
      ? '<img src="' + escapeHtml(rendered[1]) + '" alt="' + escapeHtml(rendered[2] || kind) + '" loading="lazy">'
      : renderInline(value, titleToSlug, refs);
    return '<tr><th scope="row">' + renderInline(key, titleToSlug, refs) + '</th><td>' + cell + '</td></tr>';
  }).join("");
  return '<table class="infobox"><caption>' + renderInline(kind, titleToSlug, refs) + '</caption><tbody>' + rows + '</tbody></table>';
}

function renderTable(lines, titleToSlug, refs) {
  let html = '<table class="wikitable"><tbody>';
  let rowOpen = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "|}") break;
    if (line === "|-" || line === "|- class=") {
      if (rowOpen) html += "</tr>";
      html += "<tr>";
      rowOpen = true;
      continue;
    }
    if (line.startsWith("!") || line.startsWith("|")) {
      if (!rowOpen) { html += "<tr>"; rowOpen = true; }
      const header = line.startsWith("!");
      const delimiter = header ? "!!" : "||";
      const cells = line.slice(1).split(delimiter);
      for (const cell of cells) {
        const split = cell.indexOf("|");
        const value = split >= 0 && /^[^|=]+\s*=/.test(cell.slice(0, split)) ? cell.slice(split + 1) : cell;
        html += header ? "<th>" + renderInline(value.trim(), titleToSlug, refs) + "</th>" :
          "<td>" + renderInline(value.trim(), titleToSlug, refs) + "</td>";
      }
    }
  }
  if (rowOpen) html += "</tr>";
  return html + "</tbody></table>";
}

export function renderWikiMarkup(source, titleToSlug = {}) {
  const categories = [];
  const refs = { items: [], named: new Map() };
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;
  let listDepth = 0;
  const usedHeadingIds = new Set();

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push("<p>" + paragraph.map(line => renderInline(line, titleToSlug, refs)).join("<br>") + "</p>");
      paragraph = [];
    }
  };
  const closeList = () => {
    while (listDepth > 0) {
      output.push("</" + listType + ">");
      listDepth--;
    }
    listType = null;
  };
  const addHeading = (level, text) => {
    const safe = renderInline(text, titleToSlug, refs);
    const id = slugifyWikiTitle(text.replace(/'''|''/g, ""));
    output.push('<h' + level + ' id="' + id + '">' + safe + '</h' + level + '>');
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const category = line.match(/^\[\[Category:([^\]]+)\]\]$/i);
    if (category) {
      const name = category[1].trim();
      if (name && !categories.includes(name)) categories.push(name);
      continue;
    }
    const redirect = line.match(/^#(?:REDIRECT|redirect)\s+\[\[([^\]]+)\]\]$/);
    if (redirect) {
      flushParagraph(); closeList();
      output.push('<p class="wiki-redirect">Redirect to ' + internalLink(redirect[1], null, titleToSlug) + '.</p>');
      continue;
    }
    const shortDescription = line.match(/^\{\{Short description\|([\s\S]+)\}\}$/i);
    if (shortDescription) {
      output.push('<p class="wiki-short-description">' + renderInline(shortDescription[1], titleToSlug, refs) + '</p>');
      continue;
    }
    if (/^\{\{Disambiguation\}\}$/i.test(line)) {
      flushParagraph(); closeList();
      output.push('<div class="wiki-disambiguation"><strong>This is a disambiguation page.</strong> The following articles may share this title.</div>');
      continue;
    }
    const seeAlso = line.match(/^\{\{See also\|([\s\S]+)\}\}$/i);
    if (seeAlso) {
      flushParagraph(); closeList();
      output.push('<div class="wiki-see-also"><strong>See also:</strong> ' + seeAlso[1].split("|").map(item => internalLink(item.trim(), null, titleToSlug)).join(" · ") + '</div>');
      continue;
    }
    if (/^<references\s*\/\s*>$/i.test(line)) { flushParagraph(); closeList(); output.push("__WIKI_REFERENCES_MARKER__"); continue; }
    if (/^\{\{Infobox(?:\s+[^}]*)?$/i.test(line)) {
      flushParagraph(); closeList();
      const block = [line];
      while (i + 1 < lines.length) {
        i++;
        block.push(lines[i]);
        if (/^\s*\}\}\s*$/.test(lines[i])) break;
      }
      output.push(renderInfobox(block, titleToSlug, refs));
      continue;
    }
    if (line.startsWith("{|")) {
      flushParagraph(); closeList();
      const block = [line];
      while (i + 1 < lines.length) {
        i++;
        block.push(lines[i]);
        if (lines[i].trim() === "|}") break;
      }
      output.push(renderTable(block, titleToSlug, refs));
      continue;
    }
    const heading = line.match(/^(={2,6})\s*(.*?)\s*\1$/);
    const list = line.match(/^([*#]+)\s+(.+)$/);
    const quote = line.startsWith(" ") && rawLine.startsWith(" ");
    if (!line || heading || list || quote) flushParagraph();
    if (!line) { closeList(); continue; }
    if (heading) {
      closeList();
      const level = heading[1].length;
      addHeading(level, heading[2]);
      continue;
    }
    if (list) {
      const nextType = list[1][0] === "*" ? "ul" : "ol";
      const depth = Math.min(list[1].length, 3);
      if (listType !== nextType || depth < listDepth) closeList();
      if (!listType) { listType = nextType; output.push("<" + listType + ">"); listDepth = 1; }
      while (listDepth < depth) { output.push("<" + nextType + ">"); listDepth++; }
      output.push("<li>" + renderInline(list[2], titleToSlug, refs) + "</li>");
      continue;
    }
    closeList();
    if (/^----+$/.test(line)) { output.push("<hr>"); continue; }
    if (quote) { output.push("<blockquote>" + renderInline(line, titleToSlug, refs) + "</blockquote>"); continue; }
    paragraph.push(line);
  }
  flushParagraph();
  closeList();

  // Resolve explicit <references /> markers and append a references section if references were used.
  const referenceMarkup = refs.items.length
    ? '<div class="wiki-references"><h2 id="references">References</h2><ol class="reference-list">' +
      refs.items.map(ref => '<li id="cite_note-' + ref.id + '">' + renderInline(decodeEntities(ref.body), titleToSlug, null) +
        ' <a class="reference-backlink" href="#cite_ref-' + ref.id + '-1" aria-label="Return to citation ' + ref.id + '">↑</a></li>').join("") +
      '</ol></div>'
    : "";
  if (referenceMarkup) {
    const marker = output.findIndex(item => item === "__WIKI_REFERENCES_MARKER__");
    if (marker >= 0) output.splice(marker, 1, referenceMarkup);
    else output.push(referenceMarkup);
  } else {
    for (let i = output.length - 1; i >= 0; i--) {
      if (output[i] === "__WIKI_REFERENCES_MARKER__") output.splice(i, 1);
    }
  }

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
    if (/^h[2-6]$/.test(tag)) return "\n" + "=".repeat(Number(tag.slice(1))) + " " + inner.trim() + " " + "=".repeat(Number(tag.slice(1))) + "\n";
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
  return /^(?:={2,6}\s|#(?:REDIRECT|redirect)\s|\{\{(?:Infobox|Short description|See also|Disambiguation)|\[\[|[*#]+\s|\{\||----)/im.test(text) || /\[\[Category:/im.test(text);
}
