/**
 * bundle-single-file.mjs
 * ---------------------------------------------------------------
 * Builds dist/token-tome.html: the whole site in ONE file, with the
 * CSS, JavaScript, and data all inside. Useful for hosts where you
 * drag and drop a single file (Netlify Drop, Claude artifacts).
 *
 * GitHub Pages does NOT need this; it serves the normal files.
 *
 *   npm run build:single
 * ---------------------------------------------------------------
 */
import { build } from 'esbuild';
import fs from 'fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

// 1. Bundle all JavaScript modules into one script
const result = await build({
  entryPoints: [new URL('js/main.js', root).pathname],
  bundle: true,
  format: 'esm',
  write: false,
  minify: false,
  logLevel: 'error',
});
const js = result.outputFiles[0].text;

// 2. Put the data right in the page so nothing needs to be fetched
const data = {
  vocab: JSON.parse(read('data/vocab.json')),
  gameWords: JSON.parse(read('data/game-words.json')),
  funFacts: JSON.parse(read('data/fun-facts.json')),
};
const dataScript = JSON.stringify(data)
  .replace(/</g, '\\u003c')       // never close the <script> tag early
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029')
  .replace(/\ufffd/g, '\\ufffd');

// 3. Swap the external CSS and JS links for the inlined versions
let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="css/styles.css">', () => `<style>\n${read('css/styles.css')}\n</style>`);
html = html.replace('<script type="module" src="js/main.js"></script>', () =>
  `<script>window.__TOKEN_TOME_DATA__ = ${dataScript};</script>\n<script type="module">\n${js}\n</script>`);

fs.mkdirSync(new URL('dist/', root), { recursive: true });
fs.writeFileSync(new URL('dist/token-tome.html', root), html);
console.log(`Wrote dist/token-tome.html (${(html.length / 1e6).toFixed(1)} MB)`);
