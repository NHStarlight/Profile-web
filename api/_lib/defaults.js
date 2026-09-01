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
  profileImage: 'assets/profile.gif',
  discordUserId: '1198136184526864475',
  discordSync: true,      // pull avatar/banner/badges from Discord API
  lanyard: false,         // live presence via lanyard.rest (user must join their Discord)
  badges: [
    { image: 'assets/staff.gif', label: 'Staff Member' },
    { image: 'assets/owner.gif', label: 'Owner' },
    { image: 'assets/partner.gif', label: 'Partner' },
    { image: 'assets/developer.png', label: 'Developer' },
  ],
  socials: [
    { image: 'assets/discord.png', label: 'Discord', url: 'https://discord.gg/motiongoats' },
    { image: 'assets/github.png', label: 'GitHub', url: 'https://github.com/JAQLIV' },
    { image: 'assets/youtube.png', label: 'YouTube', url: 'https://www.youtube.com/@jaqliv' },
    { image: 'assets/tiktok.png', label: 'TikTok', url: 'https://www.tiktok.com/@jaqliv' },
  ],
  skills: [
    { id: 'python', name: 'Python', icon: 'assets/python.png', percent: 87 },
    { id: 'cpp', name: 'C++', icon: 'assets/cpp.png', percent: 75 },
    { id: 'csharp', name: 'C#', icon: 'assets/csharp.png', percent: 80 },
  ],
  showSkills: true,
  themes: {
    home:   { video: 'assets/background.mp4',       music: 'assets/background_music.mp3' },
    hacker: { video: 'assets/hacker_background.mp4', music: 'assets/hacker_music.mp3' },
    rain:   { video: 'assets/rain_background.mov',   music: 'assets/rain_music.mp3' },
    anime:  { video: 'assets/anime_background.mp4',  music: 'assets/anime_music.mp3' },
    car:    { video: 'assets/car_background.mp4',    music: 'assets/car_music.mp3' },
  },
  defaults: { theme: 'home', volume: 0.3, transparency: 0.7 },
  visitorBase: 921234, // starting value for the localStorage view counter
};

module.exports = { DEFAULT_CONFIG };
