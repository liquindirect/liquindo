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

const svg = await readFile(new URL("../app-icon.svg", import.meta.url));
await sharp(svg, { density: 384 })
  .resize(1024, 1024, { fit: "contain", background: "#071329" })
  .png()
  .toFile(fileURLToPath(new URL("../assets/icon-only.png", import.meta.url)));

console.log("Prepared Capacitor web fallback and 1024px Liquindo app icon.");
