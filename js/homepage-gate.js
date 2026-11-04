/* Keep ordinary subpages reachable through the homepage navigation in this browser tab.
   This is a navigation gate, not a security boundary. Authentication callback
   pages must remain reachable from email links opened in a fresh tab/browser. */
(function () {
  try {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();

    // Supabase email confirmation and password-recovery links return directly
    // to these pages. Redirecting them before Supabase processes the URL tokens
    // discards the callback and leaves the newly confirmed user signed out.
    if (currentPage === "login.html" || currentPage === "reset-password.html") {
      return;
    }

    if (sessionStorage.getItem("liquindo-homepage-visited") !== "yes") {
      window.location.replace("index.html");
    }
  } catch (_) {
    // Storage may be unavailable in privacy-restricted browser contexts.
    // Do not block authentication callback pages in that case.
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();
    if (currentPage !== "login.html" && currentPage !== "reset-password.html") {
      window.location.replace("index.html");
    }
  }
})();
