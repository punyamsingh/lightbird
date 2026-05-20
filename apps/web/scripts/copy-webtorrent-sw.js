const { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } = require('fs');
const { join, dirname } = require('path');

const root = join(__dirname, '..'); // apps/web/
const dest = join(root, 'public');

// Locate the installed `webtorrent` package across possible pnpm layouts.
let distDir;
try {
  const pkg = require.resolve('webtorrent/package.json', {
    paths: [
      join(root, 'node_modules'),
      join(root, '..', '..', 'node_modules'),
      join(root, '..', '..', 'packages', 'lightbird', 'node_modules'),
    ],
  });
  distDir = join(dirname(pkg), 'dist');
} catch {
  console.warn('Warning: webtorrent not found. Magnet link streaming will be unavailable.');
  process.exit(0);
}

if (!existsSync(join(distDir, 'sw.min.js'))) {
  console.warn('Warning: webtorrent service worker bundle not found. Skipping.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

// Copy the minified service worker, rewriting its sourceMappingURL to match
// the renamed map file so browser devtools can resolve it.
const sw = readFileSync(join(distDir, 'sw.min.js'), 'utf8').replace(
  'sourceMappingURL=sw.min.js.map',
  'sourceMappingURL=webtorrent-sw.js.map',
);
writeFileSync(join(dest, 'webtorrent-sw.js'), sw);
copyFileSync(join(distDir, 'sw.min.js.map'), join(dest, 'webtorrent-sw.js.map'));

console.log('Copied WebTorrent service worker to public/webtorrent-sw.js');
