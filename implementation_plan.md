# Implementation Plan — Redesign (zaminhh + afkar + koyuki) + fix nhạc & link

## Overview
Redesign profile theo zaminhh (khung chính nghiêm túc) + afkar (menu 3 gạch: Profile/Skills/Projects) + koyuki (paused nên làm theo mô tả chung), giữ 4 skills JS/Python/HTML/CSS, 1 project Cloudy (link justcloudyy.onrender.com), sửa lỗi nhạc URL lưu mà không phát + social thiếu https + /api/media không tua được.

## Types
Config JSONB: title, displayName, startMessage, bioLines[], location, profileImage, discordUserId, discordSync, lanyard, decorationScale, backgroundVideo, audioUrl, playerTitle, badges[{image,label}], socials[{image,label,url}], skills[{name,percent}], projects[{name,tagline,status,stats,features[],url,dashboardUrl}], defaults{volume}. Bỏ themes/skills-cũ/visitorBase.

## Files
- `index.html`: thêm menu 3 gạch, tabs profile/skills/projects, player Spotify (toggle/seek/time), presence, location, share, audio-error.
- `style.css`: thêm menu/tabs/player/skills/projects/share CSS.
- `script.js`: normalizeUrl, resolveAudioSrc, showAudioError, renderPlayerTitle, renderLocation/Skills/Projects/Presence/Spotify, social fallback, video normalize.
- `api/media/[id].js`: Range/206 + HEAD + Accept-Ranges.
- `api/_lib/db.js`: getMedia trả Buffer.
- `api/_lib/defaults.js`: config mới (4 skills, Cloudy).
- `admin.html/js`: location, playerTitle, skills, Test URL, upload FileReader, preview decor không cắt.
- `local-test.mjs`: thêm visit/upload/media routes.
- `README.MD`: cập nhật sau.

## Functions
Mới: normalizeUrl, resolveAudioSrc, isNonDirectAudioLink, show/clearAudioError, formatTime, trackDisplayName, renderPresence, renderSpotify, renderPlayerTitle, renderLocation, renderSkills, renderProjects, switchTab, shareProfile, testAudioUrl (admin), normalizeAdminUrl (admin). Sửa: initMedia, renderBadges/Socials, applyBackground video, previewDiscord, uploadFile, fillForm/save.

## Classes
Không có class JS; CSS mới: menu-nav, tab, player, skill-bar, project-card, presence-dot, share-btn, toast, audio-error.

## Dependencies
Không thêm package, không dùng React (giữ static + serverless, nhẹ, admin không cần deploy lại).

## Testing
node --check all; test media invalid-uuid/missing-id/method; local upload→/api/media→Range 206; browser: enter→nhạc kêu+seek, social đi đúng, views tăng, share copy.

## Implementation Order
1. Media Range + db Buffer (xong)
2. Defaults mới (xong)
3. index.html tabs/player (xong)
4. script.js audio+tabs (xong)
5. style.css (xong)
6. admin.html/js (xong)
7. local-test routes (xong)
8. Verify + deploy
