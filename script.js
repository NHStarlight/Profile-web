let hasUserInteracted = false;

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

function initMedia() {
  console.log("initMedia called");
  const backgroundMusic = document.getElementById('background-music');
  const backgroundVideo = document.getElementById('background');
  if (!backgroundMusic || !backgroundVideo) {
    console.error("Media elements not found");
    return;
  }
  backgroundMusic.volume = (window.PF_CONFIG?.defaults?.volume) ?? 0.3;
  backgroundVideo.muted = true;

  // No video configured → show the animated gradient instead of black void.
  if (!backgroundVideo.querySelector('source')?.getAttribute('src')) {
    showBackgroundFallback();
    return;
  }
  backgroundVideo.play().catch(err => {
    console.error("Failed to play background video:", err);
  });
}

// Background fallback: animated gradient when a theme has no video or the
// video URL fails (404/hotlink-blocked). Never leave the page black.
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

// Set a theme's background video with graceful degradation.
function applyBackground(videoSrc) {
  const video = document.getElementById('background');
  if (!video) return;
  if (!videoSrc) {
    showBackgroundFallback();
    return;
  }
  video.onerror = () => {
    console.warn("Background video failed to load:", videoSrc);
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

  // Apply configured defaults before anything becomes interactive.
  if (CFG.defaults?.volume != null) {
    ['background-music', 'hacker-music', 'rain-music', 'anime-music', 'car-music']
      .forEach((id) => { const el = document.getElementById(id); if (el) el.volume = CFG.defaults.volume; });
  }
  if (CFG.defaults?.transparency != null) {
    transparencySlider.value = CFG.defaults.transparency;
  }

  const startScreen = document.getElementById('start-screen');
  const startText = document.getElementById('start-text');
  const profileName = document.getElementById('profile-name');
  const profileBio = document.getElementById('profile-bio');
  const visitorCount = document.getElementById('visitor-count');
  const backgroundMusic = document.getElementById('background-music');
  const hackerMusic = document.getElementById('hacker-music');
  const rainMusic = document.getElementById('rain-music');
  const animeMusic = document.getElementById('anime-music');
  const carMusic = document.getElementById('car-music');
  const homeButton = document.getElementById('home-theme');
  const hackerButton = document.getElementById('hacker-theme');
  const rainButton = document.getElementById('rain-theme');
  const animeButton = document.getElementById('anime-theme');
  const carButton = document.getElementById('car-theme');
  const resultsButtonContainer = document.getElementById('results-button-container');
  const resultsButton = document.getElementById('results-theme');
  const volumeIcon = document.getElementById('volume-icon');
  const volumeSlider = document.getElementById('volume-slider');
  const transparencySlider = document.getElementById('transparency-slider');
  const backgroundVideo = document.getElementById('background');
  const hackerOverlay = document.getElementById('hacker-overlay');
  const snowOverlay = document.getElementById('snow-overlay');
  const glitchOverlay = document.querySelector('.glitch-overlay');
  const profileBlock = document.getElementById('profile-block');
  const skillsBlock = document.getElementById('skills-block');
  const pythonBar = document.getElementById('python-bar');
  const cppBar = document.getElementById('cpp-bar');
  const csharpBar = document.getElementById('csharp-bar');
  const resultsHint = document.getElementById('results-hint');
  const profilePicture = document.querySelector('.profile-picture');
  const profileContainer = document.querySelector('.profile-container');
  let socialIcons = document.querySelectorAll('.social-icon');
  let badges = document.querySelectorAll('.badge');

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
    badges = badgeGroup.querySelectorAll('.badge');
  }

  function renderSocials(list) {
    if (!socialLinksEl) return;
    socialLinksEl.innerHTML = (list || []).map((s) => `
      <a href="${s.url}" target="_blank" rel="noopener" title="${s.label}">
        <img src="${s.image}" alt="${s.label}" class="social-icon">
      </a>
    `).join('');
    socialIcons = socialLinksEl.querySelectorAll('.social-icon');
  }

  function renderSkills(list) {
    const skillsBlock = document.getElementById('skills-block');
    if (!skillsBlock || !Array.isArray(list) || list.length === 0) return;
    skillsBlock.innerHTML = `
      <h2 class="skills-title">Programming Skills</h2>
      ${list.map((s) => `
        <div class="skill">
          <div class="skill-name">
            ${s.icon ? `<img src="${s.icon}" alt="${s.name}" class="skill-icon">` : ''}
            <span>${s.name}</span>
            <span>${s.percent}%</span>
          </div>
          <div class="skill-bar-container">
            <div id="${s.id}-bar" class="skill-bar"></div>
          </div>
        </div>
      `).join('')}
    `;
  }

  renderBadges(CFG.badges || []);
  renderSocials(CFG.socials || []);
  if (CFG.showSkills !== false) renderSkills(CFG.skills || []);
  if (CFG.profileImage) profilePicture.src = CFG.profileImage;

  // Discord sync: merge live badges + avatar over the configured ones.
  if (CFG.discordSync && CFG.discordUserId) {
    fetch('/api/discord')
      .then((r) => r.json())
      .then((j) => {
        const p = j?.ok ? j.profile : null;
        if (!p?.available) return;
        if (p.avatarUrl) { armAvatarFallback(profilePicture); profilePicture.src = p.avatarUrl; }
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

  // Theme media map from config (video + music per theme).
  const THEME_MEDIA = {
    home:   { video: CFG.themes?.home?.video   || 'assets/background.mp4',        music: CFG.themes?.home?.music   || 'assets/background_music.mp3' },
    hacker: { video: CFG.themes?.hacker?.video || 'assets/hacker_background.mp4', music: CFG.themes?.hacker?.music || 'assets/hacker_music.mp3' },
    rain:   { video: CFG.themes?.rain?.video   || 'assets/rain_background.mov',   music: CFG.themes?.rain?.music   || 'assets/rain_music.mp3' },
    anime:  { video: CFG.themes?.anime?.video  || 'assets/anime_background.mp4',  music: CFG.themes?.anime?.music  || 'assets/anime_music.mp3' },
    car:    { video: CFG.themes?.car?.video    || 'assets/car_background.mp4',    music: CFG.themes?.car?.music    || 'assets/car_music.mp3' },
  };
  // Initial background + per-theme audio sources.
  const initialTheme = THEME_MEDIA[CFG.defaults?.theme] || THEME_MEDIA.home;
  applyBackground(initialTheme.video);
  [['home', backgroundMusic], ['hacker', hackerMusic], ['rain', rainMusic], ['anime', animeMusic], ['car', carMusic]]
    .forEach(([key, audio]) => { if (audio && THEME_MEDIA[key].music) audio.src = THEME_MEDIA[key].music; });

  armAvatarFallback(profilePicture);


  
  const cursor = document.querySelector('.custom-cursor');
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  if (isTouchDevice) {
    document.body.classList.add('touch-device');
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      cursor.style.left = touch.clientX + 'px';
      cursor.style.top = touch.clientY + 'px';
      cursor.style.display = 'block';
    });

    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      cursor.style.left = touch.clientX + 'px';
      cursor.style.top = touch.clientY + 'px';
      cursor.style.display = 'block';
    });

    document.addEventListener('touchend', () => {
      cursor.style.display = 'none'; 
    });
  } else {

    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursor.style.display = 'block';
    });

    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'scale(0.8) translate(-50%, -50%)';
    });

    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'scale(1) translate(-50%, -50%)';
    });
  }


  const startMessage = CFG.startMessage || "Click here to see the motion baby";
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


  function initializeVisitorCounter() {
    let totalVisitors = localStorage.getItem('totalVisitorCount');
    if (!totalVisitors) {
      totalVisitors = CFG.visitorBase ?? 921234;
      localStorage.setItem('totalVisitorCount', totalVisitors);
    } else {
      totalVisitors = parseInt(totalVisitors);
    }

    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      totalVisitors++;
      localStorage.setItem('totalVisitorCount', totalVisitors);
      localStorage.setItem('hasVisited', 'true');
    }

    visitorCount.textContent = totalVisitors.toLocaleString();
  }


  initializeVisitorCounter();


  startScreen.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    backgroundMusic.muted = false;
    backgroundMusic.play().catch(err => {
      console.error("Failed to play music after start screen click:", err);
    });
    profileBlock.classList.remove('hidden');
    gsap.fromTo(profileBlock,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power2.out', onComplete: () => {
        profileBlock.classList.add('profile-appear');
        profileContainer.classList.add('orbit');
      }}
    );
    if (!isTouchDevice) {
      try {
        new cursorTrailEffect({
          length: 10,
          size: 8,
          speed: 0.2
        });
        console.log("Cursor trail initialized");
      } catch (err) {
        console.error("Failed to initialize cursor trail effect:", err);
      }
    }
    typeWriterName();
    typeWriterBio();
  });

  startScreen.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startScreen.classList.add('hidden');
    backgroundMusic.muted = false;
    backgroundMusic.play().catch(err => {
      console.error("Failed to play music after start screen touch:", err);
    });
    profileBlock.classList.remove('hidden');
    gsap.fromTo(profileBlock,
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power2.out', onComplete: () => {
        profileBlock.classList.add('profile-appear');
        profileContainer.classList.add('orbit');
      }}
    );
    if (!isTouchDevice) {
      try {
        new cursorTrailEffect({
          length: 10,
          size: 8,
          speed: 0.2
        });
        console.log("Cursor trail initialized");
      } catch (err) {
        console.error("Failed to initialize cursor trail effect:", err);
      }
    }
    typeWriterName();
    typeWriterBio();
  });


  const name = CFG.displayName || "JAQLIV";
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


  const bioMessages = (Array.isArray(CFG.bioLines) && CFG.bioLines.length)
    ? CFG.bioLines
    : [
        "Fu*k Guns.lol & Fakecrime.bio got banned too often, so I created my own.",
        "\"Hello, World!\""
      ];
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


  let currentAudio = backgroundMusic;
  let isMuted = false;

  volumeIcon.addEventListener('click', () => {
    isMuted = !isMuted;
    currentAudio.muted = isMuted;
    volumeIcon.innerHTML = isMuted
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
  });

  volumeIcon.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isMuted = !isMuted;
    currentAudio.muted = isMuted;
    volumeIcon.innerHTML = isMuted
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
  });

  volumeSlider.addEventListener('input', () => {
    currentAudio.volume = volumeSlider.value;
    isMuted = false;
    currentAudio.muted = false;
    volumeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>`;
  });


  transparencySlider.addEventListener('input', () => {
    const opacity = transparencySlider.value;
    if (opacity == 0) {
      profileBlock.style.background = 'rgba(0, 0, 0, 0)';
      profileBlock.style.borderOpacity = '0';
      profileBlock.style.borderColor = 'transparent';
      profileBlock.style.backdropFilter = 'none';
      skillsBlock.style.background = 'rgba(0, 0, 0, 0)';
      skillsBlock.style.borderOpacity = '0';
      skillsBlock.style.borderColor = 'transparent';
      skillsBlock.style.backdropFilter = 'none';
   
      profileBlock.style.pointerEvents = 'auto';
      socialIcons.forEach(icon => {
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '1';
      });
      badges.forEach(badge => {
        badge.style.pointerEvents = 'auto';
        badge.style.opacity = '1';
      });
      profilePicture.style.pointerEvents = 'auto';
      profilePicture.style.opacity = '1';
      profileName.style.opacity = '1';
      profileBio.style.opacity = '1';
      visitorCount.style.opacity = '1';
    } else {
      profileBlock.style.background = `rgba(0, 0, 0, ${opacity})`;
      profileBlock.style.borderOpacity = opacity;
      profileBlock.style.borderColor = '';
      profileBlock.style.backdropFilter = `blur(${10 * opacity}px)`;
      skillsBlock.style.background = `rgba(0, 0, 0, ${opacity})`;
      skillsBlock.style.borderOpacity = opacity;
      skillsBlock.style.borderColor = '';
      skillsBlock.style.backdropFilter = `blur(${10 * opacity}px)`;
      profileBlock.style.pointerEvents = 'auto';
      socialIcons.forEach(icon => {
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '1';
      });
      badges.forEach(badge => {
        badge.style.pointerEvents = 'auto';
        badge.style.opacity = '1';
      });
      profilePicture.style.pointerEvents = 'auto';
      profilePicture.style.opacity = '1';
      profileName.style.opacity = '1';
      profileBio.style.opacity = '1';
      visitorCount.style.opacity = '1';
    }
  });


  function switchTheme(videoSrc, audio, themeClass, overlay = null, overlayOverProfile = false) {
    let primaryColor;
    switch (themeClass) {
      case 'home-theme':
        primaryColor = '#00CED1';
        break;
      case 'hacker-theme':
        primaryColor = '#22C55E';
        break;
      case 'rain-theme':
        primaryColor = '#1E3A8A';
        break;
      case 'anime-theme':
        primaryColor = '#DC2626';
        break;
      case 'car-theme':
        primaryColor = '#EAB308';
        break;
      default:
        primaryColor = '#00CED1';
    }
    document.documentElement.style.setProperty('--primary-color', primaryColor);

    gsap.to(backgroundVideo, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        backgroundVideo.pause();
        applyBackground(videoSrc);

        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        currentAudio = audio;
        currentAudio.volume = volumeSlider.value;
        currentAudio.muted = isMuted;
        currentAudio.play().catch(err => console.error("Failed to play theme music:", err));

        document.body.classList.remove('home-theme', 'hacker-theme', 'rain-theme', 'anime-theme', 'car-theme');
        document.body.classList.add(themeClass);

        hackerOverlay.classList.add('hidden');
        snowOverlay.classList.add('hidden');
        profileBlock.style.zIndex = overlayOverProfile ? 10 : 20;
        skillsBlock.style.zIndex = overlayOverProfile ? 10 : 20;
        if (overlay) {
          overlay.classList.remove('hidden');
        }

        if (themeClass === 'hacker-theme') {
          resultsButtonContainer.classList.remove('hidden');
        } else {
          resultsButtonContainer.classList.add('hidden');
          skillsBlock.classList.add('hidden');
          resultsHint.classList.add('hidden');
          profileBlock.classList.remove('hidden');
          gsap.to(profileBlock, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
        }

        gsap.to(backgroundVideo, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            profileContainer.classList.remove('orbit');
            void profileContainer.offsetWidth;
            profileContainer.classList.add('orbit');
          }
        });
      }
    });
  }


  homeButton.addEventListener('click', () => {
    switchTheme(THEME_MEDIA.home.video, backgroundMusic, 'home-theme');
  });
  homeButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    switchTheme(THEME_MEDIA.home.video, backgroundMusic, 'home-theme');
  });

  hackerButton.addEventListener('click', () => {
    switchTheme(THEME_MEDIA.hacker.video, hackerMusic, 'hacker-theme', hackerOverlay, false);
  });
  hackerButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    switchTheme(THEME_MEDIA.hacker.video, hackerMusic, 'hacker-theme', hackerOverlay, false);
  });

  rainButton.addEventListener('click', () => {
    switchTheme(THEME_MEDIA.rain.video, rainMusic, 'rain-theme', snowOverlay, true);
  });
  rainButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    switchTheme(THEME_MEDIA.rain.video, rainMusic, 'rain-theme', snowOverlay, true);
  });

  animeButton.addEventListener('click', () => {
    switchTheme(THEME_MEDIA.anime.video, animeMusic, 'anime-theme');
  });
  animeButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    switchTheme(THEME_MEDIA.anime.video, animeMusic, 'anime-theme');
  });

  carButton.addEventListener('click', () => {
    switchTheme(THEME_MEDIA.car.video, carMusic, 'car-theme');
  });
  carButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    switchTheme(THEME_MEDIA.car.video, carMusic, 'car-theme');
  });

 
  function handleTilt(e, element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let clientX, clientY;

    if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const mouseX = clientX - centerX;
    const mouseY = clientY - centerY;

    const maxTilt = 15;
    const tiltX = (mouseY / rect.height) * maxTilt;
    const tiltY = -(mouseX / rect.width) * maxTilt;

    gsap.to(element, {
      rotationX: tiltX,
      rotationY: tiltY,
      duration: 0.3,
      ease: 'power2.out',
      transformPerspective: 1000
    });
  }

  profileBlock.addEventListener('mousemove', (e) => handleTilt(e, profileBlock));
  profileBlock.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleTilt(e, profileBlock);
  });

  skillsBlock.addEventListener('mousemove', (e) => handleTilt(e, skillsBlock));
  skillsBlock.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleTilt(e, skillsBlock);
  });

  profileBlock.addEventListener('mouseleave', () => {
    gsap.to(profileBlock, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  });
  profileBlock.addEventListener('touchend', () => {
    gsap.to(profileBlock, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  });

  skillsBlock.addEventListener('mouseleave', () => {
    gsap.to(skillsBlock, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  });
  skillsBlock.addEventListener('touchend', () => {
    gsap.to(skillsBlock, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  });


  profilePicture.addEventListener('mouseenter', () => {
    glitchOverlay.style.opacity = '1';
    setTimeout(() => {
      glitchOverlay.style.opacity = '0';
    }, 500);
  });


  profilePicture.addEventListener('click', () => {
    profileContainer.classList.remove('fast-orbit');
    profileContainer.classList.remove('orbit');
    void profileContainer.offsetWidth;
    profileContainer.classList.add('fast-orbit');
    setTimeout(() => {
      profileContainer.classList.remove('fast-orbit');
      void profileContainer.offsetWidth;
      profileContainer.classList.add('orbit');
    }, 500);
  });

  profilePicture.addEventListener('touchstart', (e) => {
    e.preventDefault();
    profileContainer.classList.remove('fast-orbit');
    profileContainer.classList.remove('orbit');
    void profileContainer.offsetWidth;
    profileContainer.classList.add('fast-orbit');
    setTimeout(() => {
      profileContainer.classList.remove('fast-orbit');
      void profileContainer.offsetWidth;
      profileContainer.classList.add('orbit');
    }, 500);
  });

 
  let isShowingSkills = false;
  resultsButton.addEventListener('click', () => {
    if (!isShowingSkills) {
      gsap.to(profileBlock, {
        x: -100,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          profileBlock.classList.add('hidden');
          skillsBlock.classList.remove('hidden');
          gsap.fromTo(skillsBlock,
            { x: 100, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
          );
          gsap.to(pythonBar, { width: '87%', duration: 2, ease: 'power2.out' });
          gsap.to(cppBar, { width: '75%', duration: 2, ease: 'power2.out' });
          gsap.to(csharpBar, { width: '80%', duration: 2, ease: 'power2.out' });
        }
      });
      resultsHint.classList.remove('hidden');
      isShowingSkills = true;
    } else {
      gsap.to(skillsBlock, {
        x: 100,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          skillsBlock.classList.add('hidden');
          profileBlock.classList.remove('hidden');
          gsap.fromTo(profileBlock,
            { x: -100, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
          );
        }
      });
      resultsHint.classList.add('hidden');
      isShowingSkills = false;
    }
  });

  resultsButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isShowingSkills) {
      gsap.to(profileBlock, {
        x: -100,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          profileBlock.classList.add('hidden');
          skillsBlock.classList.remove('hidden');
          gsap.fromTo(skillsBlock,
            { x: 100, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
          );
          gsap.to(pythonBar, { width: '87%', duration: 2, ease: 'power2.out' });
          gsap.to(cppBar, { width: '75%', duration: 2, ease: 'power2.out' });
          gsap.to(csharpBar, { width: '80%', duration: 2, ease: 'power2.out' });
        }
      });
      resultsHint.classList.remove('hidden');
      isShowingSkills = true;
    } else {
      gsap.to(skillsBlock, {
        x: 100,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          skillsBlock.classList.add('hidden');
          profileBlock.classList.remove('hidden');
          gsap.fromTo(profileBlock,
            { x: -100, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
          );
        }
      });
      resultsHint.classList.add('hidden');
      isShowingSkills = false;
    }
  });


  // Apply configured default transparency through the real handler.
  if (CFG.defaults?.transparency != null) {
    transparencySlider.dispatchEvent(new Event('input'));
  }

  typeWriterStart();
});