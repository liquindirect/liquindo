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
    const file = location.pathname.split("/").filter(Boolean).pop();
    return file || "index.html";
  }

  function addMobileNavigation() {
    if (document.querySelector(".liquindo-app-nav")) return;
    const current = currentFile();
    const nav = document.createElement("nav");
    nav.className = "liquindo-app-nav";
    nav.setAttribute("aria-label", "App navigation");

    links.forEach((item) => {
      const a = document.createElement("a");
      a.href = base + item.href;
      a.className = "liquindo-app-nav-item" + (current === item.href ? " is-active" : "");
      if (current === item.href || (item.id === "home" && current === "")) a.setAttribute("aria-current", "page");
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

    // The admin shortcut appears only when the existing page exposes its admin navigation.
    // This is convenience only; the actual admin page must continue enforcing authorization.
    const adminLink = document.querySelector("#admin-tools-nav:not([hidden])");
    if (adminLink) {
      const a = document.createElement("a");
      a.href = base + "admin-tools.html";
      a.textContent = "Admin Tools";
      panel.appendChild(a);
    }

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
    menuWrap.append(menuButton, panel);
    nav.appendChild(menuWrap);
    document.body.appendChild(nav);
    document.body.classList.add("liquindo-app-mode");

    // Offer native install UI when the browser exposes the install prompt.
    let installPrompt = null;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      if (!document.querySelector(".liquindo-install-button")) {
        const install = document.createElement("button");
        install.type = "button";
        install.className = "liquindo-install-button";
        install.textContent = "Install Liquindo";
        install.addEventListener("click", async () => {
          if (!installPrompt) return;
          installPrompt.prompt();
          await installPrompt.userChoice;
          installPrompt = null;
          install.remove();
        });
        const header = document.querySelector(".site-header") || document.querySelector("header") || document.body;
        header.appendChild(install);
      }
    });
  }

  function registerWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(base + "service-worker.js", { scope: base }).catch((error) => {
        console.warn("Liquindo offline shell could not be registered.", error);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addMobileNavigation, { once: true });
  } else {
    addMobileNavigation();
  }
  registerWorker();
})();
