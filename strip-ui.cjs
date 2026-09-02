// Remove multi-theme UI blocks from index.html for a single-style page.
const fs = require('fs');
const HTML = 'C:/Users/Admin/Desktop/Profile-web-main/index.html';
let html = fs.readFileSync(HTML, 'utf8');
const before = html.length;

function removeBlock(open, close) {
  let found = false;
  for (let guard = 0; guard < 20; guard++) {
    const i = html.indexOf(open);
    if (i < 0) break;
    const j = html.indexOf(close, i + open.length);
    if (j < 0) break;
    html = html.slice(0, i) + html.slice(j + close.length);
    found = true;
  }
  return found;
}

const removed = {};

removed.controls = removeBlock('<div class="controls">', '</div>');
removed.topControls = removeBlock('<div class="top-controls">', '</div>');
removed.results = removeBlock('<div id="results-button-container"', '</div>');
removed.skills = removeBlock('<div id="skills-block"', '</div>');
removed.hackerOverlay = removeBlock('<div id="hacker-overlay"', '</div>');
removed.snowOverlay = removeBlock('<div id="snow-overlay"', '</div>');
removed.hackerAudio = removeBlock('<audio id="hacker-music"', '</audio>');
removed.rainAudio = removeBlock('<audio id="rain-music"', '</audio>');
removed.animeAudio = removeBlock('<audio id="anime-music"', '</audio>');
removed.carAudio = removeBlock('<audio id="car-music"', '</audio>');

fs.writeFileSync(HTML, html);
console.log('removed:', JSON.stringify(removed));
console.log('html:', before, '->', html.length);