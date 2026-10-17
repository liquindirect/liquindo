import { mkdir, writeFile, readFile } from "node:fs/promises";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = process.cwd();
await mkdir(new URL("../www/", import.meta.url), { recursive: true });
await mkdir(new URL("../assets/", import.meta.url), { recursive: true });

const fallbackPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#071329">
  <title>Liquindo</title>
  <style>
    :root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#071329;color:#f7f4ed;font:16px/1.6 system-ui,sans-serif}
    main{max-width:34rem;padding:2rem;text-align:center}h1{color:#fdbe00}p{opacity:.9}
  </style>
</head>
<body><main><h1>Liquindo</h1><p>The Liquindo website could not be loaded. Check your internet connection and try again.</p></main></body>
</html>
`;
await writeFile(new URL("../www/index.html", import.meta.url), fallbackPage, "utf8");

const offlinePage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#071329">
  <meta name="color-scheme" content="dark">
  <title>Connection problem | Liquindo</title>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#071329;color:#f7f4ed;font:16px/1.6 system-ui,sans-serif}
    main{width:min(34rem,100%);padding:2rem;text-align:center}h1{color:#fdbe00}p{opacity:.9}
    a,button{display:inline-block;margin:.5rem;padding:.8rem 1.1rem;border:1px solid #fdbe00;border-radius:999px;background:#fdbe00;color:#071329;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}
    a.secondary{background:transparent;color:#f7f4ed;border-color:#64748b}
    #status{min-height:1.5em;font-size:.9rem}
  </style>
</head>
<body><main>
  <h1>Liquindo is temporarily unavailable</h1>
  <p>The website could not be reached. Check your internet connection, then try again.</p>
  <button id="retry" type="button">Try again</button>
  <a class="secondary" href="https://liquindirect.github.io/liquindo/">Open Liquindo website</a>
  <p id="status" role="status" aria-live="polite"></p>
  <script>
    const status = document.getElementById("status");
    document.getElementById("retry").addEventListener("click", () => {
      status.textContent = "Trying to reconnect…";
      window.location.href = "https://liquindirect.github.io/liquindo/?retry=" + Date.now();
    });
  </script>
</main></body>
</html>
`;
await writeFile(new URL("../www/offline.html", import.meta.url), offlinePage, "utf8");

const svg = await readFile(new URL("../app-icon.svg", import.meta.url));
await sharp(svg, { density: 384 })
  .resize(1024, 1024, { fit: "contain", background: "#071329" })
  .png()
  .toFile(fileURLToPath(new URL("../assets/icon-only.png", import.meta.url)));

console.log("Prepared Capacitor web fallback and 1024px Liquindo app icon.");
