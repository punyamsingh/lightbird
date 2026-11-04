const { appendFileSync, copyFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

// Keep responsive overrides after Tailwind utilities in the packaged stylesheet.
const root = join(__dirname, '..');
const responsive = join(root, 'src/styles/responsive.css');
appendFileSync(join(root, 'dist/styles.css'), '\n' + readFileSync(responsive, 'utf8'));
copyFileSync(responsive, join(root, 'dist/responsive.css'));
