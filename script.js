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

function initMedia(pf) {
  const a = document.getElementById('background-music');
  if (!a) return;

  // Music source comes from the admin config (uploaded file or external URL).
  const musicSrc = pf?.audioUrl
    || pf?.musicUrl
    || pf?.defaults?.musicUrl
    || '';
  if (!musicSrc) return;

  a.src = musicSrc;
  a.volume = pf?.defaults?.volume ?? 0.3;
  a.loop = true;
  a.muted = true;   // always start muted until a user gesture unlocks audio
  a.preload = 'auto';
  a.load();

  // If the visitor already tapped "enter" while the source was missing, start
  // the same playback path as a gesture right away.
  if (audioArmed) playMusicNow();
}

// iOS/Android-safe playback: play muted inside the user gesture to "unlock"
// the audio session, then unmute a moment later. Also waits for the source to
// actually be ready so an early tap doesn't get dropped forever.
function playMusicNow() {
  const a = document.getElementById('background-music');
  if (!a || !a.src) { audioArmed = true; return; }

  const doPlay = () => {
    try {
      a.muted = true;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      // Unlock combo: after the browser accepts the (muted) play, unmute.
      setTimeout(() => {
        try {
          a.muted = false;
          a.volume = window.PF_CONFIG?.defaults?.volume ?? 0.3;
        } catch { /* noop */ }
      }, 60);
    } catch { /* still show the profile */ }
  };

  if (a.readyState > 0) { doPlay(); audioArmed = false; return; }
  const onData = () => { doPlay(); audioArmed = false; };
  a.addEventListener('loadeddata', onData, { once: true });
  // Safety: if the source never becomes ready, drop the pending arm.
  setTimeout(() => {
    if (audioArmed) { a.removeEventListener('loadeddata', onData); audioArmed = false; }
  }, 4000);
}

function tryPlayMusic() { playMusicNow(); }

// Very first interaction anywhere unlocks audio for iOS Safari too.
function globalUnlock() { playMusicNow(); }
document.addEventListener('touchstart', globalUnlock, { once: true, passive: true });
document.addEventListener('click', globalUnlock, { once: true, passive: true });

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

// Avatar fallback: a starry placeholder if the configured image 404s.
function armAvatarFallback(img) {
  if (!img) return;
  img.onerror = () => {
    img.onerror = null;
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<defs><radialGradient id="g" cx="50%" cy="35%">' +
      '<stop offset="0%" stop-color="#2a3a6e"/><stop offset="100%" stop-color="#0b1026"/>' +
      '</radialGradient></defs>' +
      '<rect width="100" height="100" fill="url(#g)"/>' +
      '<circle cx="50" cy="50" r="44" fill="none" stroke="#00CED1" stroke-width="2" opacity="0.6"/>' +
      '<text x="50" y="64" font-size="40" text-anchor="middle">\u2B50</text></svg>');
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
        <img src="${b.image}" alt="${b.label}" class="badge">
        <span class="tooltip">${b.label}</span>
      </div>
    `).join('');
  }

  function renderSocials(list) {
    if (!socialLinksEl) return;
    socialLinksEl.innerHTML = (list || []).map((s) => `
      <a href="${s.url}" target="_blank" rel="noopener" title="${s.label}">
        <img src="${s.image}" alt="${s.label}" class="social-icon">
      </a>
    `).join('');
  }
renderBadges(CFG.badges || []);
  renderSocials(CFG.socials || []);
  if (CFG.profileImage) profilePicture.src = CFG.profileImage;
  armAvatarFallback(profilePicture);

  // Discord sync: live badge merge + avatar + decoration overlay.
  if (CFG.discordSync && CFG.discordUserId) {
    fetch('/api/discord')
      .then((r) => r.json())
      .then((j) => {
        const p = j?.ok ? j.profile : null;
        if (!p?.available) return;
        if (p.avatarUrl && !CFG.profileImage) { armAvatarFallback(profilePicture); profilePicture.src = p.avatarUrl; }
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
        if (p.presence?.status) {
          const dot = document.createElement('div');
          dot.className = 'discord-status';
          dot.textContent = `● ${p.presence.status}`;
          dot.style.cssText = 'font-size:11px;opacity:.7;margin-top:4px;';
          profileBio.after(dot);
        }
      })
      .catch(() => {});
  }

  // Media: background music from config (admin URL or uploaded /api/media/...).
  initMedia(CFG);

  // Single background from config (uploaded/URL — set via /admin).
  const video = CFG.backgroundVideo
    || CFG.defaults?.backgroundVideo
    || CFG.themes?.home?.video
    || '';
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