#!/usr/bin/env node
/**
 * Copies the WebTorrent service-worker bundle and its source map from the
 * installed `webtorrent` package into `public/` so that Next.js can serve
 * them at the correct URL.
 *
 * Run: node scripts/copy-webtorrent-sw.js
 * Or add to package.json "scripts":
 *   "prepare": "node scripts/copy-webtorrent-sw.js"
 *
 * Source:   node_modules/webtorrent/dist/sw.min.js
 * Source map (for inspection): node_modules/webtorrent/dist/sw.min.js.map
 */

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "webtorrent", "dist");
const dest = path.join(__dirname, "..", "public");

const files = [
  ["sw.min.js", "webtorrent-sw.js"],
  ["sw.min.js.map", "webtorrent-sw.js.map"],
];

for (const [srcFile, destFile] of files) {
  fs.copyFileSync(path.join(src, srcFile), path.join(dest, destFile));
  console.log(`Copied ${srcFile} → public/${destFile}`);
}
