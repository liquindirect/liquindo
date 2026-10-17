import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

(async () => {
  const db = createClient(
    "https://uivjovkvpskvvazznlyr.supabase.co",
    "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
  );
  const { data, error } = await db.from("site_settings")
    .select("setting_key,setting_value")
    .in("setting_key", ["announcement", "maintenance_notice", "homepage_featured"]);
  if (error || !data) return;
  const settings = Object.fromEntries(data.map(row => [row.setting_key, row.setting_value]));
  const topbar = document.querySelector(".topbar");
  const footer = document.querySelector("footer");
  const addStyle = () => {
    if (document.getElementById("liquindo-public-settings-style")) return;
    const style = document.createElement("style");
    style.id = "liquindo-public-settings-style";
    style.textContent = ".liquindo-public-notice{padding:.85rem 1rem;margin:.6rem auto;width:min(1120px,calc(100% - 32px));border:1px solid #fdbe00;border-radius:10px;background:#000032;color:#fff8e6;line-height:1.5}.liquindo-public-notice strong{color:#fdbe00}.liquindo-featured{width:min(1120px,calc(100% - 32px));margin:1.5rem auto;padding:1.25rem;border:1px solid rgba(253,190,0,.55);border-radius:14px;background:#000032;color:#fff8e6}.liquindo-featured h2{color:#fdbe00;margin-top:0}.liquindo-featured a{color:#fdbe00;font-weight:800}";
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