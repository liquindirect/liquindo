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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addMobileNavigation, { once: true });
  } else {
    addMobileNavigation();
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