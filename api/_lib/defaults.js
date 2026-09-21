// Default profile config — used when the DB has no row yet.
// The admin panel edits the stored copy; this is the fallback.
const DEFAULT_CONFIG = {
  title: 'JAQLIV Profile',
  displayName: 'JAQLIV',
  startMessage: 'Click to enter',
  bioLines: [
    'Discord bot developer.',
    '"Hello, World!"',
  ],
  location: 'Vietnam',
  profileImage: '', // trống → dùng avatar Discord khi bật sync
  discordUserId: '1198136184526864475',
  discordSync: true,      // pull avatar/banner/badges from Discord API
  lanyard: false,         // live presence via lanyard.rest (user must join their Discord)
  decorationScale: 1.2,   // kích thước decor quanh PFP (1.2 = 120%)
  badges: [],             // Discord sync tự thêm badges; thêm thủ công qua admin
  socials: [],
  skills: [
    { name: 'JavaScript', percent: 85 },
    { name: 'Python', percent: 80 },
    { name: 'HTML', percent: 90 },
    { name: 'CSS', percent: 85 },
  ],
  projects: [
    {
      name: 'Cloudy',
      tagline: 'Security • Moderation • Server Backup',
      status: 'ONLINE',
      stats: '3 Servers • 102ms ping • 7d 11h uptime',
      features: ['Anti-Nuke', 'Anti-Raid', 'Automod', 'Backup'],
      url: 'https://justcloudyy.onrender.com',
      dashboardUrl: 'https://justcloudyy.onrender.com',
    },
  ],
  // video/music: URL trực tiếp (.mp4/.webm/.mp3 — ví dụ catbox.moe, không phải
  // link trang YouTube). Để trống → nền gradient động, không nhạc.
  backgroundVideo: '',
  audioUrl: '',
  playerTitle: '',
  defaults: { volume: 0.3 },
};

module.exports = { DEFAULT_CONFIG };
