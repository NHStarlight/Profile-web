// Starlight profile — single-style, performance-first.
// No theme switcher / volume / transparency / skills / orbit / trail / tilt.
// Everything is driven by the admin-panel config (window.PF_CONFIG).

let hasUserInteracted = false;
// Set when the visitor taps "enter" before the config/src is ready. We then
// start playback the moment initMedia() has a source (fixes races on mobile).
let audioArmed = false;

// Wait (max 2s) for /api/profile config loaded by the inline script in
// index.html. Falls back to {} so the page still works offline/no-API.
function pfWaitConfig() {
  return new Promise((resolve) => {
    const started = Date.now();
    (function poll() {
      if (window.PF_CONFIG !== undefined || Date.now() - started > 2000) {
        resolve(window.PF_CONFIG || {});
      } else {
        setTimeout(poll, 50);
      }
    })();
  });
}

let _audioRetryTimer = null;
let _audioRetryCount = 0;

// Normalize a user-entered URL: trim, keep valid https:// or /api/media/...,
// auto-prepend https:// when the scheme is missing (e.g. discord.gg/abc).
// Existing correct URLs pass through untouched.
function normalizeUrl(u) {
  let s = String(u || '').trim();
  if (!s) return '';
  if (s.startsWith('/') || s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s; // already has scheme
  return 'https://' + s;
}

// Page links (watch pages, Spotify/ SoundCloud pages) are NOT direct audio
// files — <audio> can never play them. Detect and explain instead of silence.
function isNonDirectAudioLink(s) {
  return /(youtube\.com\/watch|youtu\.be\/|spotify\.com|soundcloud\.com(?!\/.*stream)|music\.apple\.com)/i.test(s || '');
}

function resolveAudioSrc(pf) {
  const raw = String(pf?.audioUrl || pf?.musicUrl || pf?.defaults?.musicUrl || '').trim();
  if (!raw) return { src: '', error: '' };
  const src = normalizeUrl(raw);
  if (isNonDirectAudioLink(src)) {
    return { src: '', error: 'This is a music page link (YouTube/Spotify), not a direct MP3 file — use a direct .mp3 link or Upload a file.' };
  }
  return { src, error: '' };
}

function showAudioError(msg) {
  const el = document.getElementById('audio-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  const p = document.getElementById('player');
  if (p) p.classList.remove('hidden');
}
function clearAudioError() {
  const el = document.getElementById('audio-error');
  if (el) { el.textContent = ''; el.classList.add('hidden'); }
}
function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
function trackDisplayName(pf, fallbackFile) {
  if (pf?.playerTitle) return pf.playerTitle;
  if (fallbackFile) return fallbackFile;
  try {
    const u = new URL(pf?.audioUrl || '', location.href);
    const base = u.pathname.split('/').pop();
    if (base && /\.(mp3|ogg|wav|m4a|webm)$/i.test(base)) return decodeURIComponent(base);
  } catch { /* noop */ }
  return 'Background music';
}

function initMedia(pf) {
  const a = document.getElementById('background-music');
  if (!a) return;

  // Music source comes from the admin config (uploaded file or external URL).
  const { src: musicSrc, error } = resolveAudioSrc(pf);
  if (error) { showAudioError(error); return; }
  if (!musicSrc) return;
  clearAudioError();

  a.src = musicSrc;
  a.volume = pf?.defaults?.volume ?? 0.3;
  a.loop = true;
  a.muted = true;   // always start muted until a user gesture unlocks audio
  a.preload = 'auto';
  a.load();

  // MAX AUTO-ON: muted autoplay is allowed by every browser. Start the music
  // muted immediately so it is already "running" — the first touch anywhere
  // (globalUnlock below) just flips unmute and sound comes out instantly.
  try {
    const p0 = a.play();
    if (p0 && p0.catch) p0.catch(() => { /* blocked — gesture will retry */ });
  } catch { /* noop */ }

  // Returning visitor: Chrome's Media Engagement Index (MEI) may allow FULL
  // unmuted autoplay for sites the user frequently hears media on. Try it —
  // if allowed, music starts with sound with zero taps.
  let wasUnlockedBefore = false;
  try { wasUnlockedBefore = localStorage.getItem('pf_audio_unlocked') === '1'; } catch { /* noop */ }
  if (wasUnlockedBefore) {
    try {
      const p1 = a.play();
      a.muted = false;
      a.volume = audibleVolume();
      if (p1 && p1.catch) p1.catch(() => { try { a.muted = true; } catch { /* noop */ } });
    } catch { /* noop */ }
  }

  // If the visitor already tapped "enter" while the source was missing, start
  // the same playback path as a gesture right away.
  if (audioArmed) playMusicNow();
}

function clearAudioRetry() {
  if (_audioRetryTimer) {
    clearInterval(_audioRetryTimer);
    _audioRetryTimer = null;
    _audioRetryCount = 0;
  }
}

// Phone speakers are tiny — 30% (config default) can sound like silence.
// Always play at least at a clearly-audible level, honoring a louder config.
function audibleVolume() {
  const cfg = (typeof window !== 'undefined' && window.PF_CONFIG) || {};
  const v = Number(cfg?.defaults?.volume) || 0.3;
  return Math.max(v, 0.6);
}

function playUnmuted(a) {
  try {
    a.muted = false;
    a.volume = audibleVolume();
    const p = a.play();               // unmuted play inside a real gesture works on Chrome/Android
    if (p && p.then) {
      p.then(() => { try { localStorage.setItem('pf_audio_unlocked', '1'); } catch { /* noop */ } });
      p.catch((e) => { console.warn('[audio] unmuted play blocked, falling back:', e); playMutedKick(a); });
    }
  } catch (e) { console.warn('[audio] play error:', e); playMutedKick(a); }
}

function playMutedKick(a) {
  // Muted autoplay is ALWAYS allowed; once playing, flipping muted is legal,
  // which is the iOS/Android-proof "unlock" pattern.
  try {
    a.muted = true;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    setTimeout(() => {
      try {
        a.muted = false;
        a.volume = audibleVolume();
      } catch { /* noop */ }
    }, 120);
  } catch { /* noop */ }
}

// Chrome Android / iOS: the only reliable way is a play() call inside a real
// user gesture (pointerdown/touchstart/click). This function tries the sound
// play first, falls back to muted-kick, and keeps retrying until the source
// actually becomes ready — a slow mobile network can't dead-end it.
function playMusicNow() {
  const a = document.getElementById('background-music');
  if (!a || !a.src) { audioArmed = true; return; }

  if (a.readyState >= 3) {  // HAVE_FUTURE_DATA — enough to actually play
    clearAudioRetry();
    audioArmed = false;
    playUnmuted(a);
    return;
  }

  // Source not ready yet: arm it and warm the media pipeline with a muted kick.
  audioArmed = true;

  const onReady = () => {
    clearAudioRetry();
    audioArmed = false;
    playUnmuted(a);
  };
  a.addEventListener('canplay', onReady, { once: true });
  a.addEventListener('loadeddata', onReady, { once: true });

  playMutedKick(a);

  if (!_audioRetryTimer) {
    _audioRetryTimer = setInterval(() => {
      const el = document.getElementById('background-music');
      _audioRetryCount++;
      if (!audioArmed || _audioRetryCount > 60) { clearAudioRetry(); return; }
      if (!el || !el.src) return;
      if (el.readyState >= 3) {
        clearAudioRetry();
        audioArmed = false;
        playUnmuted(el);
        return;
      }
      playMutedKick(el);   // keep the pipeline active on slow networks
    }, 700);
  }
}

function tryPlayMusic() { playMusicNow(); }

// Very first interaction anywhere unlocks audio — pointerdown fires BEFORE
// touchstart on Chrome, making it the most reliable activation trigger.
// Also remembered in localStorage so future visits can try full autoplay
// (Chrome's Media Engagement Index grants sound autoplay to trusted sites).
function globalUnlock() {
  try { localStorage.setItem('pf_audio_unlocked', '1'); } catch { /* noop */ }
  playMusicNow();
}
document.addEventListener('pointerdown', globalUnlock, { once: true, passive: true });
document.addEventListener('touchstart', globalUnlock, { once: true, passive: true });
document.addEventListener('click', globalUnlock, { once: true, passive: true });

/* ---------- Floating music toggle (guaranteed playback for visitors) ----------
   Autoplay policies vary by browser, but a tap on a real button is ALWAYS a
   valid user gesture — play() from this handler can never be blocked. */
function updateMusicBtn() {
  const btn = document.getElementById('music-toggle');
  const a = document.getElementById('background-music');
  if (!btn || !a) return;
  const playing = !!a.src && !a.paused && !a.muted;
  btn.classList.toggle('playing', playing);
  // pill hint "Tap for music" — visible until music is actually audible
  const hint = document.getElementById('music-hint');
  if (hint) hint.classList.toggle('hidden', playing);
}

function toggleMusic() {
  const a = document.getElementById('background-music');
  if (!a || !a.src) return;
  if (!a.paused && !a.muted) { a.pause(); updateMusicBtn(); return; }
  a.muted = false;
  a.volume = audibleVolume();
  const p = a.play();
  if (p && p.then) {
    p.then(() => { try { localStorage.setItem('pf_audio_unlocked', '1'); } catch { /* noop */ } });
    p.catch(() => playMutedKick(a));   // rare fallback
  }
  updateMusicBtn();
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('music-toggle');
  const a = document.getElementById('background-music');
  if (!btn || !a) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggleMusic(); });
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  a.addEventListener('play', updateMusicBtn);
  a.addEventListener('pause', updateMusicBtn);
  a.addEventListener('volumechange', updateMusicBtn);
  // Surface load failures instead of silent no-music (user-reported bug).
  a.addEventListener('error', () => {
    const src = a.getAttribute('src') || a.src || '';
    if (!src) return;
    showAudioError('Could not load the audio file — the link may be wrong, expired, or blocked. Try another .mp3 link or Upload a file.');
  });
  // Keep the Spotify-style player in sync with the real <audio>.
  const pt = document.getElementById('player-toggle');
  const seek = document.getElementById('player-seek');
  const cur = document.getElementById('player-cur');
  const dur = document.getElementById('player-dur');
  if (pt) pt.addEventListener('click', (e) => { e.stopPropagation(); toggleMusic(); });
  if (seek) {
    seek.addEventListener('input', () => {
      if (!a.duration || !isFinite(a.duration)) return;
      try { a.currentTime = (Number(seek.value) / 1000) * a.duration; } catch { /* noop */ }
    });
  }
  a.addEventListener('timeupdate', () => {
    if (seek && a.duration && isFinite(a.duration) && document.activeElement !== seek) {
      seek.value = String(Math.round((a.currentTime / a.duration) * 1000));
    }
    if (cur) cur.textContent = formatTime(a.currentTime);
    if (dur) dur.textContent = formatTime(a.duration);
  });
  a.addEventListener('loadedmetadata', () => {
    if (dur) dur.textContent = formatTime(a.duration);
    if (cur) cur.textContent = formatTime(a.currentTime || 0);
  });
  a.addEventListener('play', () => { if (pt) pt.textContent = '⏸'; });
  a.addEventListener('pause', () => { if (pt) pt.textContent = '▶'; });
  updateMusicBtn();

  // Hamburger menu → tabs
  const menuBtn = document.getElementById('menu-btn');
  const menuNav = document.getElementById('menu-nav');
  if (menuBtn && menuNav) {
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menuNav.classList.toggle('hidden'); });
    menuNav.querySelectorAll('button[data-tab]').forEach((b) => {
      b.addEventListener('click', () => {
        switchTab(b.dataset.tab);
        menuNav.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
        menuNav.classList.add('hidden');
      });
    });
    document.addEventListener('click', (e) => {
      if (!menuNav.classList.contains('hidden') && !menuNav.contains(e.target) && e.target !== menuBtn) {
        menuNav.classList.add('hidden');
      }
    });
  }
  // Single Share button: opens modal with QR + copy (zaminhh-style)
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) shareBtn.addEventListener('click', (e) => { e.stopPropagation(); openQr(); });
  const qrClose = document.getElementById('qr-close');
  if (qrClose) qrClose.addEventListener('click', (e) => { e.stopPropagation(); closeQr(); });
  const qrCopy = document.getElementById('qr-copy');
  if (qrCopy) qrCopy.addEventListener('click', (e) => { e.stopPropagation(); copyLink(); });
  const qrModal = document.getElementById('share-modal');
  if (qrModal) qrModal.addEventListener('click', (e) => { if (e.target === qrModal) closeQr(); });
});

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  const el = document.getElementById('tab-' + name);
  if (el) el.classList.add('active');
}

function openQr() {
  const modal = document.getElementById('share-modal');
  const img = document.getElementById('qr-img');
  if (!modal || !img) return;
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(location.href);
  modal.classList.remove('hidden');
}

function closeQr() {
  const modal = document.getElementById('share-modal');
  if (modal) modal.classList.add('hidden');
}

function copyLink() {
  const toast = document.getElementById('toast');
  const done = () => { if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 1600); } };
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(location.href).then(done).catch(done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = location.href; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      ta.remove(); done();
    }
  } catch { done(); }
}

function renderPresence(p) {
  const row = document.getElementById('presence-row');
  const dot = document.getElementById('presence-dot');
  const txt = document.getElementById('presence-text');
  if (!row || !dot || !txt) return;
  if (!p || !p.presence || !p.presence.status) return;
  row.classList.remove('hidden');
  dot.className = 'presence-dot ' + String(p.presence.status).toLowerCase();
  txt.textContent = String(p.presence.status);
}

function renderSpotify(p, cfg) {
  try {
    const spot = p && p.presence && p.presence.spotify;
    const box = document.getElementById('spotify-now');
    if (!box) return;
    if (!spot) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const art = document.getElementById('spotify-art');
    const song = document.getElementById('spotify-song');
    const artist = document.getElementById('spotify-artist');
    if (art && spot.albumArt) art.src = spot.albumArt;
    if (song) song.textContent = spot.song || '';
    if (artist) artist.textContent = spot.artist || '';
    const pTitle = document.getElementById('player-title');
    if (pTitle && !(cfg && cfg.playerTitle)) pTitle.textContent = (spot.song || '') + ' - ' + (spot.artist || '');
  } catch { /* noop */ }
}

function renderPlayerTitle(pf) {
  const wrap = document.getElementById('player');
  const title = document.getElementById('player-title');
  if (!wrap || !title) return;
  const raw = String((pf && (pf.audioUrl || pf.musicUrl)) || '').trim();
  if (!raw) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  title.textContent = trackDisplayName(pf, '');
}

function renderLocation(pf) {
  const el = document.getElementById('profile-location');
  if (!el) return;
  const loc = String(pf?.location || '').trim();
  if (!loc) { el.style.display = 'none'; return; }
  el.dataset.loc = loc;
}
setInterval(() => {
  const el = document.getElementById('profile-location');
  if (!el || !el.dataset.loc) return;
  try {
    el.textContent = el.dataset.loc + ' — ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { el.textContent = el.dataset.loc; }
}, 1000);

// Built-in logo map — skills get real logos automatically by name,
// no admin config needed. Sources: devicon CDN (jsDelivr).
const SKILL_LOGOS = {
  'javascript': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  'js': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  'typescript': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  'ts': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  'python': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  'html': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  'html5': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  'css': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  'css3': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  'c++': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
  'cpp': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
  'c#': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  'csharp': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  'java': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  'php': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  'go': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg',
  'rust': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg',
  'ruby': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg',
  'swift': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg',
  'kotlin': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',
  'node': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  'nodejs': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  'react': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  'vue': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
  'discord': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/discordjs/discordjs-original.svg',
  'docker': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
  'git': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
  'mysql': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  'mongodb': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
  'postgres': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
  'postgresql': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
  'linux': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg',
};
function skillLogo(sk) {
  if (sk.icon) return sk.icon;
  const key = String(sk.name || '').toLowerCase().trim();
  return SKILL_LOGOS[key] || '';
}

// Rotating logo orbit (afkar-style): real language logos revolve around the
// center. Each logo has an animated comet-trail that stretches out, then
// shrinks thinner and fades away. Logos stay upright; text fallback if the
// icon fails to load.
let orbitAngle = 0;
let orbitTimer = null;
function renderOrbit(list) {
  const orbit = document.getElementById('orbit');
  if (!orbit) return;
  orbit.innerHTML = '';
  const items = (list || []).slice(0, 8);
  const R = 82;
  const nodes = items.map((sk) => {
    const el = document.createElement('div');
    el.className = 'orbit-item';
    const logo = skillLogo(sk);
    if (logo) {
      const img = document.createElement('img');
      img.src = logo;
      img.alt = sk.name || '';
      img.draggable = false;
      img.onerror = () => {
        img.remove();
        el.textContent = String(sk.name || '').replace(/[^A-Za-z#+]/g, '').slice(0, 4).toUpperCase() || 'CODE';
      };
      el.appendChild(img);
    } else {
      el.textContent = String(sk.name || '').replace(/[^A-Za-z#+]/g, '').slice(0, 4).toUpperCase() || 'CODE';
    }
    el.title = sk.name || '';
    orbit.appendChild(el);
    return el;
  });
  if (orbitTimer) clearInterval(orbitTimer);

  // Single curved trail: an SVG arc drawn along the actual orbit circle,
  // ending at each logo. Glow layer (blurred, wide) + bright core line.
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 220 220');
  svg.classList.add('orbit-svg');
  const arcs = nodes.map(() => {
    const glow = document.createElementNS(svgNS, 'path');
    glow.classList.add('orbit-arc-glow');
    const core = document.createElementNS(svgNS, 'path');
    core.classList.add('orbit-arc');
    svg.appendChild(glow);
    svg.appendChild(core);
    return { glow, core };
  });
  orbit.insertBefore(svg, orbit.firstChild);

  const CX = 110, CY = 110, SWEEP = 0.55;
  const pt = (a) => [CX + Math.cos(a) * R, CY + Math.sin(a) * R];
  const layout = () => {
    const n = Math.max(nodes.length, 1);
    nodes.forEach((el, i) => {
      const ang = orbitAngle + (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(ang) * R;
      const y = Math.sin(ang) * R;
      el.style.left = 'calc(50% + ' + x.toFixed(1) + 'px)';
      el.style.top = 'calc(50% + ' + y.toFixed(1) + 'px)';
      // curved trail: real arc along the orbit, tail behind the logo
      const s = pt(ang - SWEEP);
      const e = pt(ang);
      const d = 'M ' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) +
        ' A ' + R + ' ' + R + ' 0 0 1 ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
      arcs[i].glow.setAttribute('d', d);
      arcs[i].core.setAttribute('d', d);
    });
  };
  layout();
  // Double speed: 30ms/frame
  orbitTimer = setInterval(() => {
    orbitAngle += Math.PI / 60;
    layout();
  }, 30);
}

function renderSkills(list) {
  const box = document.getElementById('skills-list');
  if (!box) return;
  box.innerHTML = '';
  renderOrbit(list);
  (list || []).forEach((sk) => {
    const pct = Math.max(0, Math.min(100, Number(sk.percent) || 0));
    const wrap = document.createElement('div');
    wrap.className = 'skill';
    const top = document.createElement('div');
    top.className = 'skill-top';
    const left = document.createElement('span');
    left.className = 'skill-left';
    const rowLogo = skillLogo(sk);
    if (rowLogo) {
      const ic = document.createElement('img');
      ic.src = rowLogo; ic.alt = sk.name || ''; ic.className = 'skill-icon';
      ic.onerror = () => ic.remove();
      left.appendChild(ic);
    }
    left.appendChild(document.createTextNode(sk.name));
    const right = document.createElement('span');
    right.textContent = pct + '%';
    top.appendChild(left);
    top.appendChild(right);
    const bar = document.createElement('div');
    bar.className = 'skill-bar';
    const fill = document.createElement('i');
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    wrap.appendChild(top);
    wrap.appendChild(bar);
    box.appendChild(wrap);
  });
}

function renderProjects(list) {
  const box = document.getElementById('projects-list');
  if (!box) return;
  box.innerHTML = '';
  (list || []).forEach((pp) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    const head = document.createElement('div');
    head.className = 'project-head';
    head.textContent = pp.name + (pp.status ? '  •  ' + pp.status : '');
    card.appendChild(head);
    if (pp.tagline) { const t = document.createElement('p'); t.className = 'project-tag'; t.textContent = pp.tagline; card.appendChild(t); }
    if (pp.stats) { const s = document.createElement('p'); s.className = 'project-stats'; s.textContent = pp.stats; card.appendChild(s); }
    if (Array.isArray(pp.features) && pp.features.length) {
      const f = document.createElement('div');
      f.className = 'project-feats';
      pp.features.forEach((x) => { const sp = document.createElement('span'); sp.textContent = x; f.appendChild(sp); });
      card.appendChild(f);
    }
    const links = document.createElement('div');
    links.className = 'project-links';
    if (pp.url) { const a = document.createElement('a'); a.href = normalizeUrl(pp.url); a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Visit'; links.appendChild(a); }
    if (pp.dashboardUrl && pp.dashboardUrl !== pp.url) { const a2 = document.createElement('a'); a2.href = normalizeUrl(pp.dashboardUrl); a2.target = '_blank'; a2.rel = 'noopener'; a2.textContent = 'Dashboard'; links.appendChild(a2); }
    card.appendChild(links);
    box.appendChild(card);
  });
}

function showBackgroundFallback() {
  const fb = document.getElementById('bg-fallback');
  const video = document.getElementById('background');
  if (fb) fb.classList.add('visible');
  if (video) {
    try { video.pause(); } catch { /* noop */ }
    video.style.display = 'none';
  }
}

function hideBackgroundFallback() {
  const fb = document.getElementById('bg-fallback');
  const video = document.getElementById('background');
  if (fb) fb.classList.remove('visible');
  if (video) video.style.display = '';
}

// Set the single background video with graceful degradation.
function applyBackground(videoSrc) {
  const video = document.getElementById('background');
  if (!video) return;
  if (!videoSrc) {
    showBackgroundFallback();
    return;
  }
  video.onerror = () => {
    console.warn('Background video failed to load:', videoSrc);
    showBackgroundFallback();
  };
  hideBackgroundFallback();
  video.style.display = '';
  video.src = videoSrc;
  video.play().catch(() => showBackgroundFallback());
}

// Avatar fallback: if the configured image 404s OR no avatar source exists
// at all, show a clean initial-based placeholder instead of a broken icon.
function avatarPlaceholderSrc(initial) {
  const ch = String(initial || '?').trim().charAt(0).toUpperCase().replace(/[<>&"]/g, '');
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#2a3a6e"/><stop offset="100%" stop-color="#0b1026"/>' +
    '</linearGradient></defs>' +
    '<rect width="100" height="100" fill="url(#g)"/>' +
    '<circle cx="50" cy="50" r="44" fill="none" stroke="#00CED1" stroke-width="2" opacity="0.6"/>' +
    '<text x="50" y="67" font-size="42" font-family="Arial, sans-serif" font-weight="bold" fill="#00CED1" text-anchor="middle">' + ch + '</text></svg>'
  );
}

function armAvatarFallback(img, initial) {
  if (!img) return;
  const fallback = avatarPlaceholderSrc(initial);
  img.onerror = () => {
    img.onerror = null;
    img.src = fallback;
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const CFG = await pfWaitConfig();
  document.title = CFG.title || document.title;

  const startScreen = document.getElementById('start-screen');
  const startText = document.getElementById('start-text');
  const profileName = document.getElementById('profile-name');
  const profileBio = document.getElementById('profile-bio');
  const visitorCount = document.getElementById('visitor-count');
  const backgroundMusic = document.getElementById('background-music');
  const profileBlock = document.getElementById('profile-block');
  const profileContainer = document.querySelector('.profile-container');
  const avatarWrap = document.querySelector('.avatar-wrap');
  const profilePicture = document.querySelector('.profile-picture');

  // ---- Dynamic content from the admin-panel config ----
  const badgeGroup = document.getElementById('badge-group');
  const socialLinksEl = document.getElementById('social-links');

  function renderBadges(list) {
    if (!badgeGroup) return;
    badgeGroup.innerHTML = (list || []).map((b) => `
      <div class="badge-container">
        <img src="${b.image}" alt="${b.label}" class="badge" loading="lazy" onerror="this.parentElement.style.display='none'">
        <span class="tooltip">${b.label}</span>
      </div>
    `).join('');
  }

  function iconFallbackLetter(label) {
    const ch = String(label || '').trim().charAt(0).toUpperCase();
    if (!ch) return 'L';
    return ch;
  }

  function renderSocials(list) {
    if (!socialLinksEl) return;
    socialLinksEl.innerHTML = (list || []).map((s) => {
      const href = normalizeUrl(s.url);
      const img = String(s.image || '').trim();
      if (!href) return '';
      const fb = iconFallbackLetter(s.label);
      const inner = img
        ? `<img src="${img}" alt="${s.label}" class="social-icon" loading="lazy" onerror="this.style.display='none'">`
        : `<span class="social-fallback">${fb}</span>`;
      return `<a href="${href}" target="_blank" rel="noopener" title="${s.label}">${inner}</a>`;
    }).join('');
  }
  renderLocation(CFG); renderSkills(CFG.skills || []); renderProjects(CFG.projects || []);
renderBadges(CFG.badges || []);
  renderSocials(CFG.socials || []);
  if (CFG.profileImage) profilePicture.src = CFG.profileImage;
  armAvatarFallback(profilePicture, CFG.displayName);

  // Discord sync: live badge merge + avatar + decoration overlay.
  if (CFG.discordSync && CFG.discordUserId) {
    fetch('/api/discord')
      .then((r) => r.json())
      .then((j) => {
        const p = j?.ok ? j.profile : null;
        if (!p?.available) return;
        if (p.avatarUrl && !CFG.profileImage) { armAvatarFallback(profilePicture, CFG.displayName); profilePicture.src = p.avatarUrl; }
        // Avatar decoration overlays the PFP — injected into .avatar-wrap so the
        // CSS (overflow visible, centered, 120% default) can render it around the border.
        if (p.decorationUrl && avatarWrap) {
          let deco = avatarWrap.querySelector('.profile-decoration');
          if (!deco) {
            deco = document.createElement('img');
            deco.className = 'profile-decoration';
            deco.alt = '';
            deco.draggable = false;
            avatarWrap.appendChild(deco);
          }
          deco.src = p.decorationUrl;
          // Admin-adjustable size (default 1.2 = 120% of the avatar).
          const scale = parseFloat(CFG.decorationScale) || 1.2;
          deco.style.width = (scale * 100) + '%';
          deco.style.height = (scale * 100) + '%';
        }
        if (Array.isArray(p.badges) && p.badges.length) {
          const manual = CFG.badges || [];
          renderBadges([...p.badges, ...manual]);
        }
        renderPresence(p);
        renderSpotify(p, CFG);
      })
      .catch(() => {});
  }

  // No avatar anywhere (profileImage empty AND Discord sync unavailable)?
  // Show an initial-based placeholder so the circle never looks broken.
  setTimeout(() => {
    if (!profilePicture.getAttribute('src')) {
      profilePicture.src = avatarPlaceholderSrc(CFG.displayName || '?');
    }
  }, 250);

  // Media: background music from config (admin URL or uploaded /api/media/...).
  initMedia(CFG);
  renderPlayerTitle(CFG);

  // Single background from config (uploaded/URL — set via /admin).
  const videoRaw = CFG.backgroundVideo
    || '';
  const video = normalizeUrl(videoRaw);
  applyBackground(video);

  // ---- Typewriter: start message ----
  const startMessage = CFG.startMessage || 'Click here to see the motion baby';
  let startTextContent = '';
  let startIndex = 0;
  let startCursorVisible = true;

  function typeWriterStart() {
    if (startIndex < startMessage.length) {
      startTextContent = startMessage.slice(0, startIndex + 1);
      startIndex++;
    }
    startText.textContent = startTextContent + (startCursorVisible ? '|' : ' ');
    setTimeout(typeWriterStart, 100);
  }
  setInterval(() => {
    startCursorVisible = !startCursorVisible;
    startText.textContent = startTextContent + (startCursorVisible ? '|' : ' ');
  }, 500);
  typeWriterStart();
// ---- Visitor counter: real server-side count (one per browser) ----
  (function initVisitorCounter() {
    const el = visitorCount;
    if (!el) return;
    // Stable id per browser → opening the profile several times counts once.
    let vid = localStorage.getItem('pv_vid');
    if (!vid) {
      vid = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('pv_vid', vid);
    }
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid }),
    })
      .then((r) => r.json())
      .then((j) => { if (j && typeof j.count === 'number') el.textContent = j.count.toLocaleString(); })
      .catch(() => {
        // Read-only fallback if the POST fails (still show the real number).
        fetch('/api/visit')
          .then((r) => r.json())
          .then((j) => { if (j && typeof j.count === 'number') el.textContent = j.count.toLocaleString(); })
          .catch(() => {});
      });
  })();

  // ---- Reveal profile on start-click ----
  function showProfile() {
    if (hasUserInteracted) return;
    hasUserInteracted = true;
    startScreen.classList.add('hidden');
    profileBlock.classList.remove('hidden');
    // Play music inside the real user gesture (click). On mobile this must be
    // a direct call — doing it after an awaiting /api/discord chain gets the
    // autoplay blocked, which is why music worked on desktop but not mobile.
    tryPlayMusic();
    if (window.gsap) {
      gsap.fromTo(profileBlock,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', onComplete: () => {
          profileBlock.classList.add('profile-appear');
        }}
      );
    } else {
      profileBlock.classList.add('profile-appear');
    }
    typeWriterName();
    typeWriterBio();
  }
  // Bind BOTH gestures (click can fire after touchstart on some devices).
  startScreen.addEventListener('click', () => { tryPlayMusic(); showProfile(); });
  startScreen.addEventListener('touchstart', (e) => { e.preventDefault(); tryPlayMusic(); showProfile(); });

  // ---- Typewriter: name ----
  const name = CFG.displayName || 'JAQLIV';
  let nameText = '';
  let nameIndex = 0;
  let isNameDeleting = false;
  let nameCursorVisible = true;

  function typeWriterName() {
    if (!isNameDeleting && nameIndex < name.length) {
      nameText = name.slice(0, nameIndex + 1);
      nameIndex++;
    } else if (isNameDeleting && nameIndex > 0) {
      nameText = name.slice(0, nameIndex - 1);
      nameIndex--;
    } else if (nameIndex === name.length) {
      isNameDeleting = true;
      setTimeout(typeWriterName, 10000);
      return;
    } else if (nameIndex === 0) {
      isNameDeleting = false;
    }
    profileName.textContent = nameText + (nameCursorVisible ? '|' : ' ');
    if (Math.random() < 0.1) {
      profileName.classList.add('glitch');
      setTimeout(() => profileName.classList.remove('glitch'), 200);
    }
    setTimeout(typeWriterName, isNameDeleting ? 150 : 300);
  }
  setInterval(() => {
    nameCursorVisible = !nameCursorVisible;
    profileName.textContent = nameText + (nameCursorVisible ? '|' : ' ');
  }, 500);

  // ---- Typewriter: bio rotation ----
  const bioMessages = (Array.isArray(CFG.bioLines) && CFG.bioLines.length)
    ? CFG.bioLines
    : ['"Hello, World!"'];
  let bioText = '';
  let bioIndex = 0;
  let bioMessageIndex = 0;
  let isBioDeleting = false;
  let bioCursorVisible = true;

  function typeWriterBio() {
    if (!isBioDeleting && bioIndex < bioMessages[bioMessageIndex].length) {
      bioText = bioMessages[bioMessageIndex].slice(0, bioIndex + 1);
      bioIndex++;
    } else if (isBioDeleting && bioIndex > 0) {
      bioText = bioMessages[bioMessageIndex].slice(0, bioIndex - 1);
      bioIndex--;
    } else if (bioIndex === bioMessages[bioMessageIndex].length) {
      isBioDeleting = true;
      setTimeout(typeWriterBio, 2000);
      return;
    } else if (bioIndex === 0 && isBioDeleting) {
      isBioDeleting = false;
      bioMessageIndex = (bioMessageIndex + 1) % bioMessages.length;
    }
    profileBio.textContent = bioText + (bioCursorVisible ? '|' : ' ');
    if (Math.random() < 0.1) {
      profileBio.classList.add('glitch');
      setTimeout(() => profileBio.classList.remove('glitch'), 200);
    }
    setTimeout(typeWriterBio, isBioDeleting ? 75 : 150);
  }
  setInterval(() => {
    bioCursorVisible = !bioCursorVisible;
    profileBio.textContent = bioText + (bioCursorVisible ? '|' : ' ');
  }, 500);
});