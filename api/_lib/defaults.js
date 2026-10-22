// Default profile config — used when the DB has no row yet.
// The admin panel edits the stored copy; this is the fallback.
const DEFAULT_CONFIG = {
  title: 'NH Hana Profile',
  displayName: 'Hana',
  startMessage: 'click to enter',
  bioLines: [
    "hello, i'm Hana just a javascripts developer nice to meet you!",
  ],
  location: 'Vietnam',
  profileImage: '', // empty = use Discord avatar when sync is on
  discordUserId: '1198136184526864475',
  discordSync: true,      // pull avatar/banner/badges from Discord API
  lanyard: true,          // live presence via lanyard.rest (user must join their Discord)
  decorationScale: 1.2,   // decor size around PFP (1.2 = 120%)
  badges: [],             // Discord sync adds badges; manual ones via admin
  socials: [
    {
      url: 'https://discord.com/users/1198136184526864475',
      image: '/api/media/e41961ec-297c-44d8-a521-c293488494df',
      label: 'link',
    },
    {
      url: 'https://github.com/NHStarlight',
      image: '/api/media/7af93cb5-7bec-45c5-8560-7d612b5254c7',
      label: 'link',
    },
    {
      url: 'https://justcloudyy.onrender.com/',
      image: '/api/media/d90e9093-34a2-4db5-88bc-fde2e3b8fad8',
      label: 'link',
    },
  ],
  skills: [
    { name: 'JavaScript', percent: 85, icon: '' },
    { name: 'Python', percent: 80, icon: '' },
    { name: 'HTML', percent: 90, icon: '' },
    { name: 'CSS', percent: 85, icon: '' },
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
  backgroundVideo: 'https://files.catbox.moe/u8z6xk.mp4',
  audioUrl: 'https://dn720301.ca.archive.org/0/items/Bandcamp-2524848285/2524848285.mp3',
  playerTitle: 'crystallized - かめりあ(Camellia)',
  defaults: { volume: 0.3 },
  themes: {
    car: { music: '', video: '' },
    home: { music: '', video: '' },
    rain: { music: '', video: '' },
    anime: { music: '', video: '' },
    hacker: { music: '', video: '' },
  },
  showSkills: true,
  visitorBase: 3667,
};

module.exports = { DEFAULT_CONFIG };
