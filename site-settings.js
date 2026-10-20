import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

(async () => {
  const db = createClient(
    "https://uivjovkvpskvvazznlyr.supabase.co",
    "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
  );
  const { data, error } = await db.from("site_settings")
    .select("setting_key,setting_value")
    .in("setting_key", ["announcement", "maintenance_notice", "homepage_featured", "footer_settings", "language_settings", "faq_items", "custom_nav_links", "message_from_liquin"]);
  if (error || !data) return;
  const settings = Object.fromEntries(data.map(row => [row.setting_key, row.setting_value]));
  const liquinMessage = settings.message_from_liquin || {};
  const liquinMessageText = document.getElementById("liquin-message-text");
  if (liquinMessageText && typeof liquinMessage.text === "string" && liquinMessage.text.trim()) {
    liquinMessageText.textContent = liquinMessage.text.slice(0, 500);
  }
  const navSetting = settings.custom_nav_links || {};
  const contentsPanel = document.querySelector(".contents-panel");
  const navItems = Array.isArray(navSetting.items) ? navSetting.items.slice(0, 10) : [];
  if (contentsPanel) navItems.forEach((item, index) => {
    if (!item || typeof item.label !== "string" || typeof item.url !== "string" || !item.label.trim() ||
        !/^(https:\/\/|\/|\.\/|\.\.\/|#)/i.test(item.url)) return;
    const link = document.createElement("a");
    link.href = item.url;
    if (/^https:\/\//i.test(item.url)) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
    const number = document.createElement("span"); number.textContent = String(12 + index).padStart(2, "0");
    const label = document.createElement("span"); label.textContent = item.label.slice(0, 60);
    link.append(number, label); contentsPanel.append(link);
  });
  const footerSettings = settings.footer_settings || {};
  const languageSettings = settings.language_settings || {};
  if (!localStorage.getItem("liquindo-language") && ["en","pt","es","fr","de","it","hr","el","pl","ru","zh"].includes(languageSettings.default)) {
    window.languageManager?.setLanguage(languageSettings.default);
  }
  const footerContact = document.querySelector("footer .footer-content p");
  if (footerContact && typeof footerSettings.text === "string" && footerSettings.text.trim()) footerContact.textContent = footerSettings.text;
  const topbar = document.querySelector(".topbar");
  const footer = document.querySelector("footer");
  const addStyle = () => {
    if (document.getElementById("liquindo-public-settings-style")) return;
    const style = document.createElement("style");
    style.id = "liquindo-public-settings-style";
    style.textContent = ".liquindo-public-notice{padding:.85rem 1rem;margin:.6rem auto;width:min(1120px,calc(100% - 32px));border:1px solid #fdbe00;border-radius:10px;background:#000032;color:#fff8e6;line-height:1.5}.liquindo-public-notice strong{color:#fdbe00}.liquindo-featured{width:min(1120px,calc(100% - 32px));margin:1.5rem auto;padding:1.25rem;border:1px solid rgba(253,190,0,.55);border-radius:14px;background:#000032;color:#fff8e6}.liquindo-featured h2{color:#fdbe00;margin-top:0}.liquindo-featured a{color:#fdbe00;font-weight:800}.liquindo-faqs{width:min(1120px,calc(100% - 32px));margin:1.5rem auto;padding:1.25rem;border:1px solid rgba(253,190,0,.4);border-radius:14px;background:#fff;color:#172033}.liquindo-faqs h2{color:#000032}.liquindo-faqs details{padding:.75rem 0;border-bottom:1px solid #e1e4e8}.liquindo-faqs summary{font-weight:800;cursor:pointer;color:#000032}";
    document.head.append(style);
  };
  const makeNotice = (heading, text) => {
    if (!text) return null;
    const section = document.createElement("section");
    section.className = "liquindo-public-notice";
    section.setAttribute("role", "status");
    const strong = document.createElement("strong");
    strong.textContent = heading + ": ";
    const span = document.createElement("span");
    span.textContent = text;
    section.append(strong, span);
    return section;
  };
  const now = Date.now();
  const announcement = settings.announcement || {};
  const start = announcement.start_at ? new Date(announcement.start_at).getTime() : 0;
  const end = announcement.end_at ? new Date(announcement.end_at).getTime() : Infinity;
  let firstNotice = null;
  if (announcement.enabled && announcement.text && now >= start && now <= end) {
    firstNotice = makeNotice("Announcement", announcement.text);
  }
  const maintenance = settings.maintenance_notice || {};
  const maintenanceNotice = maintenance.enabled ? makeNotice("Maintenance notice", maintenance.text) : null;
  if (firstNotice || maintenanceNotice) addStyle();
  if (topbar) {
    if (firstNotice) topbar.insertAdjacentElement("afterend", firstNotice);
    if (maintenanceNotice) (firstNotice || topbar).insertAdjacentElement("afterend", maintenanceNotice);
  } else if (document.body) {
    if (firstNotice) document.body.prepend(firstNotice);
    if (maintenanceNotice) document.body.prepend(maintenanceNotice);
  }
  const featured = settings.homepage_featured || {};
  const faqSetting = settings.faq_items || {};
  const faqItems = Array.isArray(faqSetting.items) ? faqSetting.items.filter(item => item && typeof item.question === "string" && typeof item.answer === "string") : [];
  if (faqItems.length && footer) {
    addStyle();
    const section = document.createElement("section");
    section.className = "liquindo-faqs";
    const heading = document.createElement("h2");
    heading.textContent = "Frequently asked questions";
    section.append(heading);
    faqItems.slice(0, 20).forEach(item => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = item.question;
      const answer = document.createElement("p");
      answer.textContent = item.answer;
      details.append(summary, answer);
      section.append(details);
    });
    footer.parentNode.insertBefore(section, footer);
  }
  if (featured.title && footer) {
    addStyle();
    const section = document.createElement("section");
    section.className = "liquindo-featured";
    const title = document.createElement("h2");
    title.textContent = featured.title;
    section.append(title);
    if (featured.description) {
      const p = document.createElement("p");
      p.textContent = featured.description;
      section.append(p);
    }
    if (featured.url) {
      const url = String(featured.url).trim();
      if (/^(https?:\/\/|\/|\.\/|#)/i.test(url)) {
        const link = document.createElement("a");
        link.href = url;
        link.textContent = "Learn more →";
        if (/^https?:\/\//i.test(url)) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        section.append(link);
      }
    }
    footer.parentNode.insertBefore(section, footer);
  }
})();