/* Keep subpages reachable through the homepage navigation in this browser tab.
   This is a navigation gate, not a security boundary. */
(function () {
  try {
    if (sessionStorage.getItem("liquindo-homepage-visited") !== "yes") {
      window.location.replace("index.html");
    }
  } catch (_) {
    window.location.replace("index.html");
  }
})();
