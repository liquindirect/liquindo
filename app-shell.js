(() => {
  "use strict";

  const base = "/liquindo/";
  const links = [
    { id: "home", label: "Home", href: "index.html", icon: "⌂" },
    { id: "wiki", label: "Wiki", href: "wiki.html", icon: "▤" },
    { id: "flagmaker", label: "Flag Maker", href: "flagmaker.html", icon: "⚑" },
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
      if (event.key === "Escape") {
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

  function registerWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(base + "service-worker.js", { scope: base }).catch((error) => {
        console.warn("Liquindo offline shell could not be registered.", error);
      });
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addMobileNavigation, { once: true });
  } else {
    addMobileNavigation();
  }
  registerWorker();
})();