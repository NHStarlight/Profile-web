// Discord profile sync — 3 fallback paths, first available wins:
//   1. Bot token   → full data (avatar, banner, badges, decoration). Just a key, no running bot.
//   2. Lanyard     → free, keyless; user must have joined discord.gg/lanyard once.
//   3. Unavailable → frontend falls back to config.profileImage / manual badges.
const BADGES = [
  { bit: 1 << 0,  key: 'staff',            label: 'Discord Staff',             hash: '5e74e9b61934fc1f67c65515d1bb7d5a' },
  { bit: 1 << 1,  key: 'partner',          label: 'Partnered Server Owner',    hash: '3f9748e53446a137a052f3454e2de41e' },
  { bit: 1 << 2,  key: 'hypesquad_events', label: 'HypeSquad Events',          hash: 'bf01d1073931f921909045f3a39fd264' },
  { bit: 1 << 3,  key: 'bug_hunter_1',     label: 'Bug Hunter',                hash: '2717692c7dca7289b35297368a940dd0' },
  { bit: 1 << 6,  key: 'hypesquad_bravery',    label: 'HypeSquad Bravery',     hash: '8a88d63823d8a71cd5e390baa45efa02' },
  { bit: 1 << 7,  key: 'hypesquad_brilliance', label: 'HypeSquad Brilliance',  hash: '011940fd013da3f7fb926e4a1c2e3379' },
  { bit: 1 << 8,  key: 'hypesquad_balance',    label: 'HypeSquad Balance',     hash: '3aa41de486fa12454c3761e8e223442e' },
  { bit: 1 << 9,  key: 'early_supporter',  label: 'Early Supporter',           hash: '7060786766c9c840eb3019e725d2b358' },
  { bit: 1 << 14, key: 'bug_hunter_2',     label: 'Bug Hunter Level 2',        hash: '848f79194d4be5ff5f81505cbd0ce1e6' },
  { bit: 1 << 17, key: 'verified_bot_dev', label: 'Early Verified Bot Developer', hash: '6df5892e0f35b051f8b61eace34f4967' },
  { bit: 1 << 18, key: 'certified_moderator', label: 'Moderator Programs Alumni', hash: 'fee1624003e2fee35cb398e125dc4795' },
  { bit: 1 << 22, key: 'active_developer', label: 'Active Developer',          hash: '6bdc42827a38498929a4920da12695d9' },
];

function flagsToBadges(flags) {
  return BADGES.filter((b) => (flags & b.bit) !== 0).map((b) => ({
    key: b.key,
    label: b.label,
    image: `https://cdn.discordapp.com/badge-icons/${b.hash}.png`,
  }));
}

async function fetchJson(url, headers, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    return { error: err?.message || 'fetch failed' };
  } finally {
    clearTimeout(t);
  }
}

async function fetchViaBotToken(userId) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const user = await fetchJson(`https://discord.com/api/v10/users/${userId}`, {
    Authorization: `Bot ${token}`,
  });
  if (user.error || !user.id) return null;

  const badges = flagsToBadges(user.public_flags || 0);
  // Nitro-style extras that flags don't cover:
  if (user.premium_type === 2 || user.premium_type === 3) {
    badges.unshift({ key: 'nitro', label: 'Nitro', image: 'https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png' });
  }

  const ext = (user.avatar || '').startsWith('a_') ? 'gif' : 'png';
  return {
    source: 'bot-token',
    id: user.id,
    username: user.username,
    displayName: user.global_name || user.username,
    avatarUrl: user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`
      : null,
    bannerUrl: user.banner
      ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${user.banner.startsWith('a_') ? 'gif' : 'png'}?size=600`
      : null,
    // Avatar decoration is NOT a badge — it is an overlay PNG (transparent
    // center) that must sit ON TOP of the avatar, exactly like Discord shows.
    decorationUrl: user.avatar_decoration_data?.asset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=256&passthrough=true`
      : null,
    accentColor: user.accent_color ?? null,
    badges,
  };
}

async function fetchViaLanyard(userId) {
  const data = await fetchJson(`https://api.lanyard.rest/v1/users/${userId}`, {});
  if (data.error || !data.success) return null;
  const u = data.data.discord_user || {};
  const badges = flagsToBadges(u.public_flags || 0);
  const ext = (u.avatar || '').startsWith('a_') ? 'gif' : 'png';
  return {
    source: 'lanyard',
    id: u.id,
    username: u.username,
    displayName: u.global_name || u.username,
    avatarUrl: u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=256`
      : null,
    bannerUrl: data.data?.discord_user?.banner
      ? `https://cdn.discordapp.com/banners/${u.id}/${data.data.discord_user.banner}.png?size=600`
      : null,
    accentColor: u.accent_color ?? null,
    badges,
    presence: {
      status: data.data.discord_status || 'offline',
      activities: (data.data.activities || [])
        .filter((a) => a.type === 0 || a.type === 4)
        .slice(0, 2)
        .map((a) => a.state ? `${a.name}: ${a.state}` : a.name),
      spotify: data.data.spotify
        ? { song: data.data.spotify.song, artist: data.data.spotify.artist, albumArt: data.data.spotify.album_art_url }
        : null,
    },
  };
}

async function fetchDiscordProfile(userId) {
  if (!/^\d{17,20}$/.test(String(userId || ''))) {
    return { available: false, reason: 'invalid-user-id' };
  }
  const viaToken = await fetchViaBotToken(userId);
  if (viaToken) return { available: true, ...viaToken };
  const viaLanyard = await fetchViaLanyard(userId);
  if (viaLanyard) return { available: true, ...viaLanyard };
  return { available: false, reason: 'no-token-and-lanyard-unavailable' };
}

module.exports = { fetchDiscordProfile, flagsToBadges };
