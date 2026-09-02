// Clean admin.html: remove Media theo theme + Mac dinh cards (single-style).
const fs = require('fs');
const P = 'C:/Users/Admin/Desktop/Profile-web-main/admin.html';
let s = fs.readFileSync(P, 'utf8');
const before = s.length;
const hadCRLF = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');

function removeBlock(open, close) {
  let f = false;
  for (let g = 0; g < 10; g++) {
    const i = s.indexOf(open);
    if (i < 0) break;
    const j = s.indexOf(close, i + open.length);
    if (j < 0) break;
    s = s.slice(0, i) + s.slice(j + close.length);
    f = true;
  }
  return f;
}

const media = removeBlock('<div class="card">\n      <h2>Media theo theme</h2>', '<div class="card">\n      <h2>Mặc định</h2>');
const defaults = removeBlock('<div class="card">\n      <h2>Mặc định</h2>', '<div class="card">\n      <h2>Nâng cao</h2>');

if (hadCRLF) s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(P, s);
console.log({ media, defaults }, 'html', before, '->', s.length);