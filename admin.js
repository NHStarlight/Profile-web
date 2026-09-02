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
  $('f-decorationScale').value = c.decorationScale ?? 1.2;
  $('f-backgroundVideo').value = c.backgroundVideo || '';
  $('f-audioUrl').value = c.audioUrl || '';
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
    merged.decorationScale = parseFloat($('f-decorationScale').value) || 1.2;
    merged.backgroundVideo = $('f-backgroundVideo').value.trim();
    merged.audioUrl = $('f-audioUrl').value.trim();
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
    const avatar = p.avatarUrl
      ? (p.decorationUrl
          ? `<div style="position:relative;display:inline-block;width:60px;height:60px;vertical-align:middle;margin-right:8px;">
               <img src="${p.avatarUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">
               <img src="${p.decorationUrl}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:92px;height:92px;border-radius:50%;object-fit:contain;pointer-events:none;">
             </div>`
          : `<img src="${p.avatarUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">`)
      : '(no avatar)';
    box.innerHTML = `
      ✅ Nguồn: <code>${p.source}</code><br>
      ${avatar} <strong>${p.displayName || p.username}</strong><br>
      Decoration: ${p.decorationUrl ? '✅' : '—'} · Banner: ${p.bannerUrl ? '✅' : '—'}<br>
      Badges (${(p.badges || []).length}): ${badges}
      ${p.presence ? `<br>Status: ${p.presence.status}${p.presence.spotify ? ` · 🎵 ${p.presence.spotify.song} — ${p.presence.spotify.artist}` : ''}` : ''}
    `;
  } catch (e) {
    box.innerHTML = 'Lỗi: ' + e.message;
  }
}

// ---------- Upload (music / video) ----------
async function uploadFile(fileInputId, urlInputId, statusId) {
  const status = $(statusId);
  const input = $(fileInputId);
  const file = input?.files?.[0];
  if (!file) {
    setStatus(status, 'Chưa chọn file.', false);
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    setStatus(status, `File ${(file.size / 1048576).toFixed(1)}MB vượt 4MB — hãy up lên catbox.moe rồi dán link.`, false);
    return;
  }
  setStatus(status, 'Đang upload…', true);
  try {
    const buf = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const dataBase64 = btoa(binary);
    const r = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, mime: file.type || 'application/octet-stream', dataBase64 }),
    });
    const j = await r.json();
    if (j.ok) {
      $(urlInputId).value = j.url;
      setStatus(status, `✅ Uploaded → ${j.url} (nhớ bấm Lưu)`, true);
    } else {
      setStatus(status, 'Lỗi: ' + (j.error || 'unknown'), false);
    }
  } catch (e) {
    setStatus(status, 'Lỗi: ' + e.message, false);
  }
}

// ---------- wire up ----------
$('login-btn').addEventListener('click', login);
$('password').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
$('save-btn').addEventListener('click', save);
$('logout-btn').addEventListener('click', logout);
$('reload-btn').addEventListener('click', openEditor);
$('preview-btn').addEventListener('click', previewDiscord);
$('upload-audio-btn').addEventListener('click', () => uploadFile('f-audio-file', 'f-audioUrl', 'upload-audio-status'));
$('upload-video-btn').addEventListener('click', () => uploadFile('f-video-file', 'f-backgroundVideo', 'upload-video-status'));
$('add-badge').addEventListener('click', () =>
  $('badges-list').appendChild(listItemRow('', 'assets/icon.gif | Badge Name')));
$('add-social').addEventListener('click', () =>
  $('socials-list').appendChild(listItemRow('', 'assets/icon.png | https://…')));

checkAuth().then((authed) => {
  if (authed) openEditor();
  else $('password').focus();
});


