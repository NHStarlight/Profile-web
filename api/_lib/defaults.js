// Default profile config — used when the DB has no row yet.
// The admin panel edits the stored copy; this is the fallback.
const DEFAULT_CONFIG = {
  title: 'JAQLIV Profile',
  displayName: 'JAQLIV',
  startMessage: 'Click here to see the motion baby',
  bioLines: [
    'Fu*k Guns.lol & Fakecrime.bio got banned too often, so I created my own.',
    '"Hello, World!"',
  ],
  profileImage: '', // trống → dùng avatar Discord khi bật sync
  discordUserId: '1198136184526864475',
  discordSync: true,      // pull avatar/banner/badges from Discord API
  lanyard: false,         // live presence via lanyard.rest (user must join their Discord)
  badges: [],             // Discord sync tự thêm badges; thêm thủ công qua admin
  socials: [],
  skills: [
    { id: 'python', name: 'Python', icon: 'assets/python.png', percent: 87 },
    { id: 'cpp', name: 'C++', icon: 'assets/cpp.png', percent: 75 },
    { id: 'csharp', name: 'C#', icon: 'assets/csharp.png', percent: 80 },
  ],
  showSkills: true,
  themes: {
    home:   { video: '', music: '' },
    hacker: { video: '', music: '' },
    rain:   { video: '', music: '' },
    anime:  { video: '', music: '' },
    car:    { video: '', music: '' },
  },
  // video/music: URL trực tiếp (.mp4/.webm/.mp3 — ví dụ catbox.moe, không phải
  // link trang YouTube). Để trống → nền gradient động, không nhạc.
  defaults: { theme: 'home', volume: 0.3, transparency: 0.7 },
  visitorBase: 0, // legacy — real view counter is server-side via /api/visit
};

module.exports = { DEFAULT_CONFIG };
