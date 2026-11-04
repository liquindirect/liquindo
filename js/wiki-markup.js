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
  // MediaWiki-compatible image syntax: [[File:https://...|thumb|right|250px|alt=...|caption]].
  text = text.replace(/\[\[(?:File|Image):([^|\]]+)((?:\|[^\]]*)?)\]\]/gi, (_, rawUrl, rawOptions) => {
    const url = decodeEntities(rawUrl).trim();
    if (!/^https?:\/\//i.test(url)) return "";
    const options = String(rawOptions || "").split("|").map(item => item.trim()).filter(Boolean);
    const alignment = options.find(item => /^(left|right|center)$/i.test(item))?.toLowerCase() || "right";
    const widthOption = options.find(item => /^\d{2,4}px$/i.test(item));
    const width = widthOption ? Math.min(1200, Math.max(80, parseInt(widthOption, 10))) : 320;
    const altOption = options.find(item => /^alt=/i.test(item));
    const alt = altOption ? altOption.slice(4) : "";
    const caption = options.filter(item => !/^(thumb|thumbnail|frame|left|right|center)$/i.test(item) && !/^\d{2,4}px$/i.test(item) && !/^alt=/i.test(item)).join(" ");
    return '<span class="wiki-image wiki-image-' + alignment + '"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt || caption) + '" loading="lazy" style="max-width:' + width + 'px"><span class="wiki-image-caption">' + renderInline(caption, titleToSlug, refs) + '</span></span>';
  });
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
  const captionField = fields.find(field => /^(name|title)$/i.test(field.key));
  const caption = captionField ? renderInline(captionField.value, titleToSlug, refs) : renderInline(kind, titleToSlug, refs);
  return '<table class="infobox"><caption>' + caption + '</caption><tbody>' + rows + '</tbody></table>';
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
    const baseId = slugifyWikiTitle(text.replace(/'''|''/g, ""));
    let id = baseId;
    let suffix = 2;
    while (usedHeadingIds.has(id)) id = baseId + "-" + suffix++;
    usedHeadingIds.add(id);
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
    // Gallery blocks accept either <gallery>...</gallery> or {{Gallery ... }}.
    if (/^<gallery\s*>$/i.test(line) || /^\{\{Gallery\s*$/i.test(line)) {
      flushParagraph(); closeList();
      const html = [];
      while (i + 1 < lines.length) {
        const galleryLine = lines[++i].trim();
        if (/^<\/gallery\s*>$/i.test(galleryLine) || galleryLine === "}}") break;
        if (!galleryLine) continue;
        const parts = galleryLine.replace(/^\*\s*/, "").split("|");
        const url = parts.shift().trim().replace(/^(?:File|Image):/i, "");
        if (!/^https?:\/\//i.test(url)) continue;
        const caption = parts.join(" ").trim();
        html.push('<figure class="wiki-gallery-item"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(caption) + '" loading="lazy"><figcaption>' + renderInline(caption, titleToSlug, refs) + '</figcaption></figure>');
      }
      if (html.length) output.push('<div class="wiki-gallery" role="group" aria-label="Image gallery">' + html.join("") + '</div>');
      continue;
    }
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
    const quote = rawLine.startsWith(" ");
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
  const noteText = new Map();
  for (const note of doc.querySelectorAll(".wiki-references li[id^='cite_note-']")) {
    const id = note.id.replace("cite_note-", "");
    const clone = note.cloneNode(true);
    clone.querySelectorAll(".reference-backlink").forEach(link => link.remove());
    noteText.set(id, (clone.textContent || "").trim());
  }
  const referenceUses = new Map();
  const convert = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    if (node.classList.contains("wiki-references")) return "";
    if (node.classList.contains("wiki-categories")) {
      return [...node.querySelectorAll("a")].map(link => "[[Category:" + link.textContent.trim() + "]]").join("\n") + "\n";
    }
    if (node.matches("sup.reference")) {
      const id = node.querySelector("a[href^='#cite_note-']")?.getAttribute("href")?.slice("#cite_note-".length);
      if (!id || !noteText.has(id)) return "";
      const count = referenceUses.get(id) || 0;
      referenceUses.set(id, count + 1);
      const name = "lms-ref-" + id.replace(/[^a-z0-9_-]/gi, "");
      return count ? '<ref name="' + name + '" />' : '<ref name="' + name + '">' + noteText.get(id) + "</ref>";
    }
    if (node.classList.contains("wiki-gallery")) {
      const items = [...node.querySelectorAll(".wiki-gallery-item")].map(item => {
        const image = item.querySelector("img");
        const caption = item.querySelector("figcaption")?.textContent?.trim() || image?.alt || "";
        return image?.src ? image.src + (caption ? " | " + caption : "") : "";
      }).filter(Boolean);
      return items.length ? "{{Gallery\n" + items.join("\n") + "\n}}\n\n" : "";
    }
    if (node.matches("figure.wiki-image, span.wiki-image")) {
      const image = node.querySelector("img");
      if (!image?.src) return "";
      const alignment = ["left", "right", "center"].find(value => node.classList.contains("wiki-image-" + value)) || "right";
      const width = image.style.maxWidth.match(/(\d{2,4})px/)?.[1] || "320";
      const caption = node.querySelector("figcaption,.wiki-image-caption")?.textContent?.trim() || "";
      return "[[File:" + image.src + "|" + alignment + "|" + width + "px|alt=" + (image.alt || caption) + "|" + caption + "]]";
    }
    if (tag === "img") {
      return node.src ? "[[File:" + node.src + "|right|320px|alt=" + (node.alt || "") + "]]" : "";
    }
    if (tag === "table") {
      const rows = [...node.querySelectorAll("tr")];
      if (node.classList.contains("infobox")) {
        const title = node.querySelector("caption")?.textContent?.trim() || "Information";
        const fields = rows.map(row => {
          const cells = [...row.children];
          return cells.length >= 2 ? "| " + cells[0].textContent.trim() + " = " + cells.slice(1).map(cell => cell.textContent.trim()).join(" ") : "";
        }).filter(Boolean);
        return "{{Infobox " + title + "\n" + fields.join("\n") + "\n}}\n\n";
      }
      const tableRows = rows.map(row => {
        const cells = [...row.children].map(cell => [...cell.childNodes].map(convert).join("").trim());
        const isHeader = [...row.children].length > 0 && [...row.children].every(cell => cell.tagName.toLowerCase() === "th");
        return "|-\n" + (isHeader ? "! " + cells.join(" !! ") : "| " + cells.join(" || "));
      });
      return tableRows.length ? '{| class="wikitable"\n' + tableRows.join("\n") + "\n|}\n\n" : "";
    }
    if (/^h[2-6]$/.test(tag)) return "\n" + "=".repeat(Number(tag.slice(1))) + " " + [...node.childNodes].map(convert).join("").trim() + " " + "=".repeat(Number(tag.slice(1))) + "\n";
    if (tag === "p" || tag === "div" || tag === "section") return [...node.childNodes].map(convert).join("") + "\n\n";
    if (tag === "strong" || tag === "b") return "'''" + [...node.childNodes].map(convert).join("") + "'''";
    if (tag === "em" || tag === "i") return "''" + [...node.childNodes].map(convert).join("") + "''";
    if (tag === "del" || tag === "s") return "~~" + [...node.childNodes].map(convert).join("") + "~~";
    if (tag === "li") {
      const marker = node.parentElement?.tagName.toLowerCase() === "ol" ? "#" : "*";
      return marker + " " + [...node.childNodes].map(convert).join("").trim() + "\n";
    }
    if (tag === "ul" || tag === "ol") return [...node.children].map(convert).join("") + "\n";
    if (tag === "blockquote") return [...node.childNodes].map(convert).join("").trim().split("\n").map(line => " " + line).join("\n") + "\n";
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      const inner = [...node.childNodes].map(convert).join("");
      if (href.startsWith("wiki.html#")) return "[[" + decodeURIComponent(href.slice("wiki.html#".length)).replace(/-/g, " ") + "|" + inner + "]]";
      return href ? "[" + href + " " + inner + "]" : inner;
    }
    if (tag === "br") return "\n";
    return [...node.childNodes].map(convert).join("");
  };
  return [...doc.body.childNodes].map(convert).join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function looksLikeWikiMarkup(source) {
  const text = String(source ?? "").trim();
  if (!text) return false;
  // Treat real HTML content as HTML, but allow MediaWiki's <ref> tags in markup.
  if (/<\/?(?:p|div|section|table|img|h[1-6]|ul|ol|li|strong|em|a|blockquote|figure)\b[^>]*>/i.test(text)) return false;
  return /^(?:={2,6}\s|#(?:REDIRECT|redirect)\s|\{\{(?:Infobox|Short description|See also|Disambiguation)|\[\[|[*#]+\s|\{\||----)/im.test(text) ||
    /\[\[Category:|<\/?ref(?:\s|>|\/)|<references\s*\//im.test(text);
}


// LiquinWiki Markup Standard (LMS) diagnostics. Checks never rewrite stored article text.
export function validateWikiMarkup(source) {
  const text = String(source ?? "");
  const errors = [];
  const warnings = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const stack = [];
  const namedRefs = new Set();
  const usedRefs = new Set();
  lines.forEach((raw, index) => {
    const line = raw.trim();
    const lineNumber = index + 1;
    if (/^\{\{Infobox(?:\s+[^}]*)?$/i.test(line)) stack.push({ type: "Infobox", line: lineNumber });
    if (/^\{\{Gallery\s*$/i.test(line) || /^<gallery\s*>$/i.test(line)) stack.push({ type: "Gallery", line: lineNumber });
    if (line.startsWith("{|")) stack.push({ type: "table", line: lineNumber });
    if (line === "}}" || line === "|}") {
      const expected = line === "|}" ? "table" : null;
      const position = expected ? stack.map(item => item.type.toLowerCase()).lastIndexOf(expected) : stack.length - 1;
      if (position >= 0) stack.splice(position, 1);
    }
    if (/^<\/gallery\s*>$/i.test(line)) {
      const position = stack.map(item => item.type).lastIndexOf("Gallery");
      if (position >= 0) stack.splice(position, 1);
      else warnings.push("Line " + lineNumber + ": closing gallery tag has no matching opening tag.");
    }
    for (const match of line.matchAll(/<ref\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/ref>/gi)) namedRefs.add(match[1]);
    for (const match of line.matchAll(/<ref\s+name=["']([^"']+)["']\s*\/>/gi)) usedRefs.add(match[1]);
    const fileMatch = line.match(/\[\[(?:File|Image):([^|\]]+)/i);
    if (fileMatch && !/^https?:\/\//i.test(fileMatch[1].trim())) warnings.push("Line " + lineNumber + ": image links must use an http:// or https:// image URL.");
    if (/^={1,}$/.test(line)) warnings.push("Line " + lineNumber + ": heading markup needs at least two matching equals signs.");
  });
  for (const item of stack) errors.push("Unclosed " + item.type + " block opened on line " + item.line + ".");
  for (const name of usedRefs) if (!namedRefs.has(name)) warnings.push('Named reference "' + name + '" is used but has no definition.');
  if (/<script\b|javascript:/i.test(text)) errors.push("Scripts and javascript: URLs are not permitted in article markup.");
  return { valid: errors.length === 0, errors, warnings };
}
