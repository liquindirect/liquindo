(() => {
  "use strict";

  const base = "/liquindo/";
  // Native APK builds append their own build number to the remote app URL.
  // Persist it across navigation so the update checker can compare like-for-like.
  const apkVersionParam = new URLSearchParams(location.search).get("apkVersion");
  if (/^\d+$/.test(apkVersionParam || "")) {
    try { localStorage.setItem("liquindo-apk-version", apkVersionParam); } catch (_) {}
  }
  const links = [
    { id: "home", label: "Home", href: "index.html", icon: "⌂" },
    { id: "wiki", label: "Wiki", href: "wiki.html", icon: "▤" },
    { id: "members", label: "Members", href: "members.html", icon: "♙" }
  ];
  const extraLinks = [
    ["Hierarchy", "hierarchy.html"],
    ["Gallery", "gallery.html"],
    ["Account", "login.html"],
    ["Privacy", "privacy.html"]
  ];

  function currentFile() {
    if (location.pathname.endsWith("/")) return "index.html";
    return location.pathname.split("/").filter(Boolean).pop() || "index.html";
  }

  // One shared Contents menu is rendered on every website page. Existing
  // page-specific copies are replaced so the links, grouping, search and
  // mobile behaviour stay identical across the site.
  function initializeUniversalContentsMenu() {
    if (!document.body || document.querySelector("[data-liquindo-contents-ready]")) return;

    const menuMarkup = `
      <details class="contents-menu liquindo-universal-contents" data-liquindo-contents-ready>
        <summary aria-label="Open site contents" aria-controls="site-contents-panel">
          <span class="contents-menu-icon" aria-hidden="true">☰</span>
          <span>Contents</span>
          <span class="contents-chevron" aria-hidden="true">⌄</span>
        </summary>
        <button type="button" class="contents-backdrop" aria-label="Close contents menu" tabindex="-1"></button>
        <div class="contents-panel" id="site-contents-panel">
          <p class="contents-panel-label">Liquindo <span aria-hidden="true">/</span> Contents</p>
          <p class="contents-panel-intro">Explore the project, community and resources.</p>
          <label class="contents-search-label" for="contents-search">Find a page</label>
          <input id="contents-search" class="contents-search" type="search" placeholder="Search contents…" autocomplete="off">
          <p class="contents-search-status" id="contents-search-status" aria-live="polite"></p>
          <p class="contents-group-label">EXPLORE</p>
          <a href="index.html#home"><span>01</span><span>Introduction</span></a>
          <a href="index.html#history"><span>02</span><span data-i18n="nav.history">History</span></a>
          <a href="index.html#ideology"><span>03</span><span data-i18n="nav.ideology">Ideology</span></a>
          <a href="hierarchy.html"><span>04</span><span>Hierarchy</span></a>
          <p class="contents-group-label">COMMUNITY &amp; KNOWLEDGE</p>
          <a href="members.html"><span>05</span><span data-i18n="nav.members">Members</span></a>
          <a href="wiki.html"><span>06</span><span data-i18n="auth.wiki">LiquinWiki</span></a>
          <a href="gallery.html"><span>07</span><span data-i18n="nav.gallery">Gallery</span></a>
          <p class="contents-group-label">TOOLS &amp; RESOURCES</p>
          <a href="app.html"><span>08</span><span>Liquindo Web App · PWA install</span></a>
          <a href="index.html#finance"><span>09</span><span data-i18n="nav.finance">Finance</span></a>
          <p class="contents-group-label">CONTACT &amp; ACCOUNT</p>
          <a href="index.html#contact"><span>10</span><span data-i18n="nav.contact">Contact</span></a>
          <a href="https://liquindomerch.printify.me/products" target="_blank" rel="noopener noreferrer"><span>11</span><span>Merchandise Shop ↗</span></a>
          <a href="login.html"><span>12</span><span>Account</span></a>
          <a href="admin-tools.html" id="admin-tools-nav" hidden><span>13</span><span>Admin Tools</span></a>
        </div>
      </details>`;

    const oldMenus = [...document.querySelectorAll(".contents-menu")];
    const host = document.querySelector(".topbar") ||
      document.querySelector(".topline") ||
      null;
    const wrapper = document.createElement("nav");
    wrapper.className = "liquindo-contents-host";
    wrapper.setAttribute("aria-label", "Site contents");
    wrapper.innerHTML = menuMarkup;
    const menu = wrapper.firstElementChild;

    oldMenus.forEach((oldMenu) => oldMenu.remove());
    if (host) {
      host.insertBefore(menu, host.firstChild);
      host.classList.add("liquindo-contents-hosted");
    } else {
      document.body.insertBefore(wrapper, document.body.firstChild);
    }

    if (!document.getElementById("liquindo-universal-contents-styles")) {
      const style = document.createElement("style");
      style.id = "liquindo-universal-contents-styles";
      style.textContent = `
        .liquindo-universal-contents { position: static !important; z-index: 1001 !important; flex: 0 0 auto; }
        .liquindo-universal-contents > summary {
          position: fixed !important; top: 14px !important; left: 14px !important; z-index: 1003 !important;
          display: inline-flex !important; align-items: center; justify-content: center; gap: 9px;
          min-height: 44px; padding: 9px 13px; border: 1px solid rgba(223,191,112,.58);
          border-radius: 2px; background: #000032 !important; color: #f4f0e5 !important;
          box-shadow: 0 5px 20px rgba(0,0,0,.2); cursor: pointer; list-style: none;
          font-size: .9rem; font-weight: 750; letter-spacing: .025em;
        }
        .liquindo-universal-contents > summary::-webkit-details-marker { display: none; }
        .liquindo-universal-contents > summary:hover,
        .liquindo-universal-contents[open] > summary { border-color: #fdbe00; color: #fff0c5 !important; }
        .liquindo-universal-contents .contents-menu-icon,
        .liquindo-universal-contents .contents-chevron { color: #fdbe00; }
        .liquindo-universal-contents .contents-chevron { margin-left: 3px; transition: transform .18s ease; }
        .liquindo-universal-contents[open] .contents-chevron { transform: rotate(180deg); }
        .liquindo-universal-contents:not([open]) > .contents-backdrop,
        .liquindo-universal-contents:not([open]) > .contents-panel { display: none !important; }
        .liquindo-universal-contents .contents-backdrop {
          display: block; position: fixed; inset: 0; z-index: 1000; width: 100%; height: 100%;
          margin: 0; padding: 0; border: 0; border-radius: 0; background: rgba(0,0,30,.64); cursor: default;
        }
        .liquindo-universal-contents .contents-panel {
          display: block; position: fixed; inset: 0 auto 0 0; z-index: 1002;
          width: min(360px,88vw); height: 100vh; height: 100dvh; max-height: none;
          overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain;
          padding: 76px 20px 28px; border: 0; border-right: 1px solid rgba(223,191,112,.42);
          border-radius: 0; background: #000032; color: #e9e5da;
          box-shadow: 18px 0 48px rgba(0,0,0,.28); animation: liquindo-contents-enter .2s ease-out;
        }
        .liquindo-universal-contents .contents-panel-label {
          margin: 0 0 10px; padding: 0 0 14px; border-bottom: 1px solid rgba(223,191,112,.32);
          color: #fdbe00; font-size: .72rem; font-weight: 800; letter-spacing: .16em; line-height: 1.5; text-transform: uppercase;
        }
        .liquindo-universal-contents .contents-panel-intro { margin: 0 0 16px; color: #cbd3e0; font-size: .86rem; }
        .liquindo-universal-contents .contents-search-label { display: block; margin: 0 0 .35rem; color: #fdbe00; font-size: .75rem; font-weight: 750; }
        .liquindo-universal-contents .contents-search {
          display: block; box-sizing: border-box; width: 100%; min-height: 42px; margin: 0; padding: .65rem .75rem;
          border: 1px solid rgba(253,190,0,.48); border-radius: 2px; background: #08083d; color: #fff; font: inherit; font-size: .92rem;
        }
        .liquindo-universal-contents .contents-search::placeholder { color: #b7bfd0; opacity: 1; }
        .liquindo-universal-contents .contents-search-status { min-height: 1rem; margin: .35rem 0 .2rem; color: #cbd3e0; font-size: .76rem; }
        .liquindo-universal-contents .contents-group-label {
          margin: 1.15rem 0 .25rem; padding-top: .8rem; border-top: 1px solid rgba(253,190,0,.25);
          color: #fdbe00; font-size: .68rem; font-weight: 800; letter-spacing: .14em;
        }
        .liquindo-universal-contents .contents-group-label:first-of-type { margin-top: .5rem; padding-top: 0; border-top: 0; }
        .liquindo-universal-contents .contents-panel a {
          display: grid; grid-template-columns: 2.2rem minmax(0,1fr); align-items: baseline; gap: 10px;
          padding: 13px 2px; border: 0; border-bottom: 1px solid rgba(223,191,112,.16);
          border-radius: 0; background: transparent; color: #e9e5da; font-size: .96rem; line-height: 1.4;
          text-decoration: none; box-shadow: none; transform: none; transition: color .16s ease,padding-left .16s ease;
        }
        .liquindo-universal-contents .contents-panel a > span:first-child { color: #fdbe00; font-size: .76rem; font-variant-numeric: tabular-nums; }
        .liquindo-universal-contents .contents-panel a:hover,
        .liquindo-universal-contents .contents-panel a:focus-visible { padding-left: 7px; background: transparent; color: #fff0c5; }
        .liquindo-universal-contents [hidden] { display: none !important; }
        .liquindo-universal-contents > summary:focus-visible,
        .liquindo-universal-contents .contents-panel a:focus-visible { outline: 2px solid #fdbe00; outline-offset: 3px; }
        .liquindo-contents-hosted > .brand,
        .liquindo-contents-hosted .wordmark { margin-left: 58px !important; }
        .liquindo-contents-host { position: relative; z-index: 1001; min-height: 58px; }
        .liquindo-contents-host > .contents-menu { position: static; }
        @keyframes liquindo-contents-enter { from { opacity: .65; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @media (max-width:780px) { .liquindo-universal-contents > summary { top: 10px !important; left: 10px !important; } .liquindo-universal-contents .contents-panel { width: min(340px,88vw); } }
        @media (max-width:520px) { .liquindo-universal-contents > summary { min-height: 42px; padding: 8px 10px; } .liquindo-universal-contents .contents-panel { width: min(320px,88vw); padding: 70px 18px 24px; } }
        @media (prefers-reduced-motion:reduce) { .liquindo-universal-contents .contents-panel { animation: none; } .liquindo-universal-contents .contents-chevron,.liquindo-universal-contents .contents-panel a { transition: none; } }
      `;
      document.head.appendChild(style);
    }

    const topbar = menu.closest(".topbar");
    const backdrop = menu.querySelector(".contents-backdrop");
    const links = [...menu.querySelectorAll(".contents-panel a")];
    const search = menu.querySelector("#contents-search");
    const status = menu.querySelector("#contents-search-status");
    const syncOpenState = () => {
      if (topbar) topbar.classList.toggle("contents-nav-open", menu.open);
    };
    const updateSearch = () => {
      const query = (search.value || "").trim().toLocaleLowerCase();
      let visible = 0;
      links.forEach((link) => {
        const match = !query || link.textContent.toLocaleLowerCase().includes(query);
        link.hidden = !match;
        if (match) visible += 1;
      });
      menu.querySelectorAll(".contents-group-label").forEach((heading) => {
        let next = heading.nextElementSibling;
        let hasVisibleLink = false;
        while (next && !next.classList.contains("contents-group-label")) {
          if (next.matches("a") && !next.hidden) hasVisibleLink = true;
          next = next.nextElementSibling;
        }
        heading.hidden = !!query && !hasVisibleLink;
      });
      status.textContent = query ? visible + " page" + (visible === 1 ? "" : "s") + " found" : "";
    };
    menu.addEventListener("toggle", syncOpenState);
    search.addEventListener("input", updateSearch);
    links.forEach((link) => link.addEventListener("click", () => { menu.open = false; syncOpenState(); }));
    backdrop.addEventListener("click", () => { menu.open = false; syncOpenState(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.open) { menu.open = false; syncOpenState(); }
    });
    document.addEventListener("click", (event) => {
      if (menu.open && !menu.contains(event.target)) { menu.open = false; syncOpenState(); }
    });
    updateSearch();

    // LiquinWiki and Gallery are member-only. Hide every navigation/CTA link
    // to either page until Supabase confirms an authenticated session. The
    // Members directory intentionally remains public.
    function initializeMemberOnlyLinks() {
      const protectedLinks = [...document.querySelectorAll('a[href]')].filter((link) => {
        const href = link.getAttribute("href") || "";
        return /^(?:\.\/)?gallery\.html(?:[?#].*)?$/.test(href);
      });
      protectedLinks.forEach((link) => {
        link.dataset.requiresAuth = "true";
        link.hidden = true;
        link.setAttribute("aria-hidden", "true");
      });
      if (!protectedLinks.length) return;

      const applySession = (session) => {
        const signedIn = Boolean(session?.user);
        protectedLinks.forEach((link) => {
          link.hidden = !signedIn;
          if (signedIn) link.removeAttribute("aria-hidden");
          else link.setAttribute("aria-hidden", "true");
        });
      };

      import("https://esm.sh/@supabase/supabase-js@2")
        .then(({ createClient }) => {
          const client = createClient(
            "https://uivjovkvpskvvazznlyr.supabase.co",
            "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
          );
          client.auth.onAuthStateChange((_event, session) => applySession(session));
          return client.auth.getSession().then(({ data, error }) => {
            if (error) throw error;
            applySession(data.session);
          });
        })
        .catch(() => {
          // Fail closed: keep member-only navigation hidden if auth status
          // cannot be verified.
          applySession(null);
        });
    }
    initializeMemberOnlyLinks();

    // The universal Contents menu is generated on every page, so its
    // administrator shortcut must be authorized here rather than only by
    // homepage-specific code. Wiki-only permissions do not grant this link.
    function initializeAdminToolsLink() {
      const adminLink = menu.querySelector("#admin-tools-nav");
      if (!adminLink) return;

      let sequence = 0;
      const applySession = async (session) => {
        const current = ++sequence;
        adminLink.hidden = true;
        adminLink.setAttribute("aria-hidden", "true");
        if (!session?.user) return;

        try {
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const client = createClient(
            "https://uivjovkvpskvvazznlyr.supabase.co",
            "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
          );
          const { data, error } = await client
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

          if (current !== sequence || error || data?.role !== "admin") return;
          adminLink.hidden = false;
          adminLink.removeAttribute("aria-hidden");
        } catch {
          // Fail closed if the account or role cannot be verified.
        }
      };

      import("https://esm.sh/@supabase/supabase-js@2")
        .then(({ createClient }) => {
          const client = createClient(
            "https://uivjovkvpskvvazznlyr.supabase.co",
            "sb_publishable_-wytXeSX8qFAS46RZYBdVg_5atQ4xAz"
          );
          client.auth.onAuthStateChange((_event, session) => applySession(session));
          return client.auth.getSession().then(({ data, error }) => {
            if (error) throw error;
            return applySession(data.session);
          });
        })
        .catch(() => {
          adminLink.hidden = true;
          adminLink.setAttribute("aria-hidden", "true");
        });
    }
    initializeAdminToolsLink();
  }

  function detectPwaDisplayMode() {
    if (!document.body) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    document.body.classList.toggle("liquindo-installed-pwa", isStandalone);
    document.body.classList.toggle("liquindo-browser-mode", !isStandalone);
    document.body.dataset.liquindoDisplayMode = isStandalone ? "standalone" : "browser";
  }

  function addPwaInstallGuide() {
    // Keep the installation guide on the homepage only, and never show it inside
    // an installed Home Screen app or the native Capacitor app.
    if (currentFile() !== "index.html" || document.querySelector(".liquindo-pwa-install-guide")) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    const isNativeApp = !!window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform();
    if (isStandalone || isNativeApp) return;

    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    // A browser may fire beforeinstallprompt after this guide is created. In that
    // case the native browser prompt button replaces the manual instructions.
    if (!isIOS && !isAndroid && !window.matchMedia("(pointer: coarse)").matches) return;

    const guide = document.createElement("aside");
    guide.className = "liquindo-pwa-install-guide";
    guide.setAttribute("aria-label", "Install Liquindo");
    guide.style.cssText = "position:relative;z-index:10;margin:12px auto;padding:14px 16px;width:min(920px,calc(100% - 24px));border:1px solid rgba(253,190,0,.65);border-radius:14px;background:#071329;color:#f7f4ed;font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.12)";
    const title = document.createElement("strong");
    title.textContent = "Install Liquindo on your Home Screen";
    title.style.cssText = "display:block;margin:0 28px 4px 0;color:#fdbe00;font-size:15px";
    const copy = document.createElement("p");
    copy.style.cssText = "margin:0;color:#f7f4ed";
    if (isIOS) {
      copy.textContent = "On iPhone or iPad, open this page in Safari, tap Share, choose Add to Home Screen, then tap Add. Liquindo will open like an app.";
    } else if (isAndroid) {
      copy.textContent = "Use your browser menu and choose Install app or Add to Home screen. If an Install Liquindo button appears, you can use that instead.";
    } else {
      copy.textContent = "Use your browser's install option or menu and choose Install app / Add to Home screen.";
    }
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Dismiss";
    close.setAttribute("aria-label", "Dismiss installation instructions");
    close.style.cssText = "position:absolute;top:9px;right:10px;padding:4px 8px;border:1px solid rgba(255,255,255,.35);border-radius:8px;background:transparent;color:#f7f4ed;font:inherit";
    close.addEventListener("click", () => guide.remove());
    guide.append(title, copy, close);
    const header = document.querySelector(".site-header, .page-header, header");
    if (header) header.insertAdjacentElement("afterend", guide);
    else document.body.prepend(guide);
  }

  function addMobileNavigation() {
    if (document.querySelector(".liquindo-app-nav") || !document.body) return;
    const current = currentFile();
    const nav = document.createElement("nav");
    nav.className = "liquindo-app-nav";
    nav.setAttribute("aria-label", "App navigation");

    links.forEach((item) => {
      const a = document.createElement("a");
      a.href = base + item.href;
      a.className = "liquindo-app-nav-item" + (current === item.href ? " is-active" : "");
      if (current === item.href) a.setAttribute("aria-current", "page");
      a.innerHTML = '<span class="app-nav-icon" aria-hidden="true"></span><span class="app-nav-label"></span>';
      a.querySelector(".app-nav-icon").textContent = item.icon;
      a.querySelector(".app-nav-label").textContent = item.label;
      nav.appendChild(a);
    });

    const menuWrap = document.createElement("div");
    menuWrap.className = "liquindo-app-menu-wrap";
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "liquindo-app-nav-item liquindo-app-menu-button";
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-controls", "liquindo-app-more");
    menuButton.innerHTML = '<span class="app-nav-icon" aria-hidden="true">⋯</span><span class="app-nav-label">More</span>';
    const panel = document.createElement("div");
    panel.id = "liquindo-app-more";
    panel.className = "liquindo-app-more";
    panel.hidden = true;

    extraLinks.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.href = base + href;
      a.textContent = label;
      panel.appendChild(a);
    });

    // The APK's app/website preference is stored in this WebView's origin storage.
    // Ordinary browser/PWA users never set the APK marker, so they do not see this switch.
    let modeLink = null;
    function syncApkModeLink() {
      let isApk = false;
      let appMode = false;
      try {
        isApk = localStorage.getItem("liquindo-apk-installed") === "1";
        appMode = localStorage.getItem("liquindo-apk-mode") !== "website";
      } catch (_) {}
      if (!isApk) {
        modeLink?.remove();
        modeLink = null;
        return;
      }
      if (!modeLink) {
        modeLink = document.createElement("a");
        panel.appendChild(modeLink);
      }
      modeLink.textContent = appMode ? "Switch to website mode" : "Switch to app mode";
      modeLink.href = base + (appMode ? "index.html" : "app.html");
      modeLink.addEventListener("click", () => {
        try {
          localStorage.setItem("liquindo-apk-mode", appMode ? "website" : "app");
        } catch (_) {}
      }, { once: true });
    }
    syncApkModeLink();

    // Admin navigation may be revealed asynchronously after Supabase verifies a session.
    let adminAnchor = null;
    function syncAdminLink() {
      const adminLink = document.querySelector("#admin-tools-nav");
      const shouldShow = !!adminLink && !adminLink.hidden &&
        getComputedStyle(adminLink).display !== "none";
      if (shouldShow && !adminAnchor) {
        adminAnchor = document.createElement("a");
        adminAnchor.href = base + "admin-tools.html";
        adminAnchor.textContent = "Admin Tools";
        panel.appendChild(adminAnchor);
      } else if (!shouldShow && adminAnchor) {
        adminAnchor.remove();
        adminAnchor = null;
      }
    }
    syncAdminLink();
    const adminObserver = new MutationObserver(syncAdminLink);
    adminObserver.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "class", "style", "aria-hidden"]
    });

    menuButton.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      menuButton.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (event) => {
      if (!menuWrap.contains(event.target)) {
        panel.hidden = true;
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        panel.hidden = true;
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.focus();
      }
    });
    panel.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        panel.hidden = true;
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
    menuWrap.append(menuButton, panel);
    nav.appendChild(menuWrap);
    document.body.appendChild(nav);
    document.body.classList.add("liquindo-app-mode");
    detectPwaDisplayMode();
    addPwaInstallGuide();

    // Native install prompt is optional: DuckDuckGo and iOS may not expose it.
    let installPrompt = null;
    let installButton = null;
    function removeInstallButton() {
      installButton?.remove();
      installButton = null;
    }
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      document.querySelector(".liquindo-pwa-install-guide")?.remove();
      if (installButton) return;
      installButton = document.createElement("button");
      installButton.type = "button";
      installButton.className = "liquindo-install-button";
      installButton.textContent = "Install Liquindo";
      installButton.addEventListener("click", async () => {
        if (!installPrompt) return;
        const promptEvent = installPrompt;
        installPrompt = null;
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice?.outcome === "accepted") removeInstallButton();
          else if (installButton) installButton.textContent = "Install Liquindo";
        } catch (error) {
          console.warn("Liquindo install prompt was unavailable.", error);
        }
      });
      const header = document.querySelector(".site-header, .page-header, header") || document.body;
      header.appendChild(installButton);
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      removeInstallButton();
    });
  }

  function addConnectionStatus() {
    // Keep this APK-specific UI out of the ordinary website/PWA experience.
    const isNativeApp = !!window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform();
    if (!isNativeApp || !document.body || document.querySelector(".liquindo-connection-banner")) return;
    const banner = document.createElement("div");
    banner.className = "liquindo-connection-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.hidden = navigator.onLine;
    banner.style.cssText = "position:sticky;top:0;z-index:1000;padding:10px 14px;text-align:center;background:#7f1d1d;color:#fff;font:700 14px/1.4 system-ui,sans-serif";
    const message = document.createElement("span");
    message.textContent = "You appear to be offline. Some Liquindo pages need an internet connection.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry";
    retry.style.cssText = "margin-left:10px;padding:5px 10px;border:1px solid #fff;border-radius:999px;background:transparent;color:#fff;font:inherit";
    retry.addEventListener("click", () => location.reload());
    banner.append(message, retry);
    document.body.prepend(banner);
    window.addEventListener("offline", () => { banner.hidden = false; });
    window.addEventListener("online", () => { banner.hidden = true; });
  }

  function setupUpdateAndAboutTools() {
    const checkButton = document.getElementById("check-updates");
    const status = document.getElementById("update-status");
    const releaseLink = document.getElementById("latest-release-link");
    const aboutButton = document.getElementById("about-toggle");
    const aboutPanel = document.getElementById("about-panel");

    if (aboutButton && aboutPanel) {
      aboutButton.addEventListener("click", () => {
        const expanded = aboutButton.getAttribute("aria-expanded") === "true";
        aboutButton.setAttribute("aria-expanded", String(!expanded));
        aboutPanel.hidden = expanded;
      });
    }
    if (!checkButton || !status || !releaseLink) return;

    checkButton.addEventListener("click", async () => {
      checkButton.disabled = true;
      status.dataset.state = "";
      status.textContent = "Checking GitHub Releases…";
      releaseLink.hidden = true;
      try {
        // Query the published releases list with a cache-busting parameter instead of
        // relying on /releases/latest, which can remain stale in intermediary caches.
        const endpoint = "https://api.github.com/repos/liquindirect/liquindo/releases?per_page=100&_=" + Date.now();
        const response = await fetch(endpoint, {
          // Avoid Cache-Control request headers: on some WebViews they trigger a
          // cross-origin preflight that GitHub's API request may not pass.
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store"
        });
        if (!response.ok) throw new Error("GitHub returned " + response.status);
        const releases = await response.json();
        if (!Array.isArray(releases)) throw new Error("GitHub returned an unexpected release list.");
        const candidates = releases.filter((item) =>
          item && !item.draft && !item.prerelease &&
          /^liquindo-v\d+$/i.test(item.tag_name || "") &&
          Array.isArray(item.assets) &&
          item.assets.some((asset) => asset.name === "app-release.apk" && asset.browser_download_url)
        );
        candidates.sort((a, b) =>
          Number((b.tag_name.match(/\d+$/) || ["0"])[0]) -
          Number((a.tag_name.match(/\d+$/) || ["0"])[0])
        );
        const release = candidates[0];
        if (!release) throw new Error("No published signed APK release was found.");
        const latestNumber = Number((release.tag_name.match(/\d+$/) || ["0"])[0]);
        const version = "v" + latestNumber;
        const apkAsset = release.assets.find((asset) => asset.name === "app-release.apk" && asset.browser_download_url);
        if (!apkAsset) throw new Error("The latest release has no downloadable APK asset.");

        let installedNumber = null;
        try {
          const savedVersion = localStorage.getItem("liquindo-apk-version");
          if (/^\d+$/.test(savedVersion || "")) installedNumber = Number(savedVersion);
        } catch (_) {}

        status.dataset.state = "success";
        if (installedNumber === null) {
          status.textContent = "Latest published Android APK: " + version + ". The installed version could not be verified; download this APK to ensure you are current.";
        } else if (installedNumber < latestNumber) {
          status.textContent = "Update available: " + version + " (installed build v" + installedNumber + "). Download the APK, then open it and confirm installation in Android.";
        } else if (installedNumber === latestNumber) {
          status.textContent = "You're up to date: v" + installedNumber + " is the latest published Android APK.";
        } else {
          status.textContent = "Installed build v" + installedNumber + " is newer than the latest published release (" + version + "). No newer APK has been published yet.";
        }
        releaseLink.href = apkAsset.browser_download_url;
        releaseLink.textContent = "Download " + version + " APK";
        releaseLink.hidden = false;
      } catch (error) {
        status.dataset.state = "error";
        status.textContent = navigator.onLine
          ? "Could not check releases right now. Try again later or open GitHub Releases."
          : "You are offline. Reconnect to check for updates.";
        releaseLink.href = "https://github.com/liquindirect/liquindo/releases/latest";
        releaseLink.textContent = "Open GitHub Releases";
        releaseLink.hidden = false;
        console.warn("Liquindo update check failed.", error);
      } finally {
        checkButton.disabled = false;
      }
    });
  }

  function registerWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(base + "service-worker.js", { scope: base }).catch((error) => {
        console.warn("Liquindo offline shell could not be registered.", error);
      });
    }, { once: true });
  }

  // Keep the PWA install guidance and display-mode detection, but do not inject
  // the fixed bottom navigation bar into the website.
  initializeUniversalContentsMenu();

  function initializePwaGuidance() {
    detectPwaDisplayMode();
    addPwaInstallGuide();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePwaGuidance, { once: true });
  } else {
    initializePwaGuidance();
  }
  registerWorker();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      addConnectionStatus();
      setupUpdateAndAboutTools();
    }, { once: true });
  } else {
    addConnectionStatus();
    setupUpdateAndAboutTools();
  }
})();