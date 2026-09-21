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
  profileImage: '', // empty = use Discord avatar when sync is on
  discordUserId: '1198136184526864475',
  discordSync: true,      // pull avatar/banner/badges from Discord API
  lanyard: false,         // live presence via lanyard.rest (user must join their Discord)
  decorationScale: 1.2,   // decor size around PFP (1.2 = 120%)
  badges: [],             // Discord sync adds badges; manual ones via admin
  socials: [],
  skills: [
    { name: 'JavaScript', percent: 85, icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
    { name: 'Python', percent: 80, icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
    { name: 'HTML', percent: 90, icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' },
    { name: 'CSS', percent: 85, icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg' },
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
