// Simplify: strip theme-switcher UI ships a single style. Run once:
//   node simplify.mjs <index.html path> <script.js path>
const fs = require('fs');
const path = require('path');

const [,, htmlPath, jsPath] = process.argv;
if (!htmlPath || !jsPath) { console.error('usage: node simplify.mjs <html> <js>'); process.exit(1); }

let html = fs.readFileSync(htmlPath, 'utf8');
const origLen = html.length;

function cut(fromMarker, toMarker) {
  const i = html.indexOf(fromMarker);
  if (i < 0) { console.log('  [skip] not found:', fromMarker.slice(0, 40)); return; }
  const j = toMarker ? html.indexOf(toMarker, i + fromMarker.length) : html.length;
  if (j < 0) { console.log('  [skip] end marker not found for:', fromMarker.slice(0, 40)); return; }
  const end = j + (toMarker ? toMarker.length : 0);
  html = html.slice(0, i) + html.slice(end);
  console.log('  [cut]', fromMarker.slice(0, 40), '->', toMarker ? toMarker.slice(0, 40) : 'EOF');
}

// Remove 5-theme control bar + top volume/transparency controls
cut('<div class="controls">', '</div>');
cut('<!-- 2) full-width header', '<!-- ');
// Be explicit about each piece instead of brittle markers:
cut('<div class="top-controls">', '</div>');

fs.writeFileSync(htmlPath, html);
console.log('html:', origLen, '->', html.length, 'removed', origLen - html.length);

let js = fs.readFileSync(jsPath, 'utf8');
const jOrig = js.length;
// Removing listeners that reference removed DOM elements would throw; the
// rest of init logic is fine. Guard only the removed pieces.
js = js
  .replace(/\s+volumeIcon\.addEventListener[\s\S]*?volumeIcon\.addEventListener\('touchstart',\s*\(e\)\s*=>\s*\{[^}]*?\);/, '')
  .replace(/\s+volumeSlider\.addEventListener[\s\S]*?\}\);\n/, '')
  .replace(/\s+transparencySlider\.addEventListener[\s\S]*?\n  }\);\n\n\n  function switchTheme/, '\n\n  function switchTheme');
fs.writeFileSync(jsPath, js);
console.log('js:', jOrig, '->', js.length);