// Admin panel logic: login → load config from DB → edit → save.
let CONFIG = null;

const $ = (id) => document.getElementById(id);

function setStatus(el, msg, ok) {
  el.textContent = msg;
  el.className = 'status ' + (ok ? 'ok' : 'err');
}

// ---------- auth ----------
async function checkAuth() {
  try {
    const r = await fetch('/api/admin/login');
    const j = await r.json();
    return !!j.authenticated;
  } catch { return false; }
}

async function login() {
  const status = $('login-status');
  try {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('password').value }),
    });
    const j = await r.json();
    if (j.ok) {
      setStatus(status, 'OK — đang mở editor…', true);
      await openEditor();
    } else {
      setStatus(status, 'Sai mật khẩu.', false);
    }
  } catch (e) {
    setStatus(status, 'Lỗi kết nối: ' + e.message, false);
  }
}

async function logout() {
  await fetch('/api/admin/login', { method: 'DELETE' });
  location.reload();
}

// ---------- list editors (badges / socials) ----------
function listItemRow(value, placeholder) {
  const div = document.createElement('div');
  div.className = 'list-item';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.placeholder = placeholder;
  const btn = document.createElement('button');
  btn.textContent = '✕';
  btn.className = 'danger';
  btn.onclick = () => div.remove();
  div.append(input, btn);
  return div;
}

function renderList(containerId, items, placeholder) {
  const box = $(containerId);
  box.innerHTML = '';
  (items || []).forEach((v) => box.appendChild(listItemRow(v, placeholder)));
}

function collectList(containerId) {
  return Array.from($(containerId).querySelectorAll('input'))
    .map((i) => i.value.trim())
    .filter(Boolean);
}

function parsePipe(value) {
  const idx = value.indexOf('|');
  if (idx === -1) return { image: value.trim(), label: value.trim() };
  return { image: value.slice(0, idx).trim(), label: value.slice(idx + 1).trim() };
}

function parseSocial(value) {
  const idx = value.indexOf('|');
  if (idx === -1) return { image: '', label: 'link', url: value.trim() };
  return { image: value.slice(0, idx).trim(), label: 'link', url: value.slice(idx + 1).trim() };
}

// ---------- load / save ----------
function fillForm(c) {
  $('f-title').value = c.title || '';
  $('f-displayName').value = c.displayName || '';
  $('f-startMessage').value = c.startMessage || '';
  $('f-bioLines').value = (c.bioLines || []).join('\n');
  $('f-profileImage').value = c.profileImage || '';
  $('f-visitorBase').value = c.visitorBase ?? 0;
  $('f-discordUserId').value = c.discordUserId || '';
  $('f-discordSync').checked = !!c.discordSync;
  $('f-lanyard').checked = !!c.lanyard;
  ['home', 'hacker', 'rain', 'anime', 'car'].forEach((k) => {
    $(`f-${k}-video`).value = c.themes?.[k]?.video || '';
    $(`f-${k}-music`).value = c.themes?.[k]?.music || '';
  });
  $('f-theme').value = c.defaults?.theme || 'home';
  $('f-volume').value = c.defaults?.volume ?? 0.3;
  $('f-transparency').value = c.defaults?.transparency ?? 0.7;
  renderList('badges-list', (c.badges || []).map((b) => `${b.image} | ${b.label}`), 'assets/icon.gif | Badge Name');
  renderList('socials-list', (c.socials || []).map((s) => `${s.image} | ${s.url}`), 'assets/icon.png | https://…');
  $('f-json').value = JSON.stringify(c, null, 2);
}

async function openEditor() {
  const r = await fetch('/api/admin/save');
  if (r.status === 401) return false;
  const j = await r.json();
  CONFIG = j.config;
  fillForm(CONFIG);
  $('login-view').classList.add('hidden');
  $('editor-view').classList.remove('hidden');
  return true;
}

async function save() {
  const status = $('save-status');
  try {
    // The Advanced JSON field wins if the user edited it; simple fields overlay on top.
    let merged;
    try {
      merged = JSON.parse($('f-json').value);
    } catch (e) {
      return setStatus(status, 'JSON nâng cao không hợp lệ: ' + e.message, false);
    }

    merged.title = $('f-title').value;
    merged.displayName = $('f-displayName').value;
    merged.startMessage = $('f-startMessage').value;
    merged.bioLines = $('f-bioLines').value.split('\n').map((s) => s.trim()).filter(Boolean);
    merged.profileImage = $('f-profileImage').value;
    merged.visitorBase = parseInt($('f-visitorBase').value, 10) || 0;
    merged.discordUserId = $('f-discordUserId').value.trim();
    merged.discordSync = $('f-discordSync').checked;
    merged.lanyard = $('f-lanyard').checked;
    merged.themes = {
      home:   { video: $('f-home-video').value,   music: $('f-home-music').value },
      hacker: { video: $('f-hacker-video').value, music: $('f-hacker-music').value },
      rain:   { video: $('f-rain-video').value,   music: $('f-rain-music').value },
      anime:  { video: $('f-anime-video').value,  music: $('f-anime-music').value },
      car:    { video: $('f-car-video').value,    music: $('f-car-music').value },
    };
    merged.defaults = {
      theme: $('f-theme').value,
      volume: parseFloat($('f-volume').value) || 0.3,
      transparency: parseFloat($('f-transparency').value ?? 0.7),
    };
    merged.badges = collectList('badges-list').map(parsePipe);
    merged.socials = collectList('socials-list').map(parseSocial);
    delete merged._source;

    const r = await fetch('/api/admin/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    const j = await r.json();
    if (j.ok) {
      CONFIG = j.config;
      fillForm(CONFIG);
      setStatus(status, '✅ Đã lưu — trang profile cập nhật ngay (cache 15s).', true);
    } else {
      setStatus(status, 'Lỗi: ' + (j.error || 'unknown'), false);
    }
  } catch (e) {
    setStatus(status, 'Lỗi: ' + e.message, false);
  }
}

async function previewDiscord() {
  const box = $('discord-preview');
  const id = $('f-discordUserId').value.trim();
  box.innerHTML = 'Đang tải…';
  try {
    const r = await fetch(`/api/admin/preview?id=${encodeURIComponent(id)}`);
    const j = await r.json();
    const p = j.profile;
    if (!p?.available) {
      box.innerHTML = `❌ Không lấy được dữ liệu (${p?.reason || 'unknown'}).<br>
        → Nếu chưa có <code>DISCORD_BOT_TOKEN</code> trên Vercel, user phải join <code>discord.gg/lanyard</code> để dùng Lanyard.`;
      return;
    }
    const badges = (p.badges || []).map((b) => `<img src="${b.image}" title="${b.label}">`).join(' ') || '(none)';
    box.innerHTML = `
      ✅ Nguồn: <code>${p.source}</code><br>
      <img src="${p.avatarUrl || ''}"> <strong>${p.displayName || p.username}</strong><br>
      Avatar: ${p.avatarUrl ? '✅' : '—'} · Banner: ${p.bannerUrl ? '✅' : '—'}<br>
      Badges (${(p.badges || []).length}): ${badges}
      ${p.presence ? `<br>Status: ${p.presence.status}${p.presence.spotify ? ` · 🎵 ${p.presence.spotify.song} — ${p.presence.spotify.artist}` : ''}` : ''}
    `;
  } catch (e) {
    box.innerHTML = 'Lỗi: ' + e.message;
  }
}

// ---------- wire up ----------
$('login-btn').addEventListener('click', login);
$('password').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
$('save-btn').addEventListener('click', save);
$('logout-btn').addEventListener('click', logout);
$('reload-btn').addEventListener('click', openEditor);
$('preview-btn').addEventListener('click', previewDiscord);
$('add-badge').addEventListener('click', () =>
  $('badges-list').appendChild(listItemRow('', 'assets/icon.gif | Badge Name')));
$('add-social').addEventListener('click', () =>
  $('socials-list').appendChild(listItemRow('', 'assets/icon.png | https://…')));

checkAuth().then((authed) => {
  if (authed) openEditor();
  else $('password').focus();
});


