# Implementation Plan — Fix lệch decor, bỏ sạch theme-switch, thêm upload âm thanh

## Overview
Rewrite `index.html` + `style.css` thành bản single-style sạch (bản hiện tại là template gốc bị khôi phục nhầm — vẫn còn theme-switch, transparency, skills, audio hardcode), fix vị trí decoration (không bị vòng tròn avatar cắt mất), và thêm tính năng **upload file nhạc/ảnh trực tiếp từ admin panel** (không cần paste URL).

## Files

| File | Hành động |
|---|---|
| `index.html` | **Rewrite hoàn toàn** — xóa: theme-switch buttons (987-990), transparency/volume sliders, skill-bars block (955-979), custom-cursor, `<audio>` hardcode `assets/background_music.mp3` (1006-1008), GSAP CDN. Giữ: start-screen, profile card (avatar + decoration overlay + name + bio), badges, socials, visitor counter, config inline fetch |
| `style.css` | **Rewrite hoàn toàn** — xóa toàn bộ theme vars (home/hacker/rain/anime/car), orbit/glitch/shine keyframes, custom-cursor, skill-bar styles. Viết mới: layout 1 card giữa, decoration positioning đúng |
| `script.js` | **Giữ** logic dynamic hiện tại (config-driven, Discord sync, decoration, typewriter). Sửa: tạo `<audio>` động từ `CFG.audioUrl` (bỏ tìm element hardcode), bỏ reference tới element đã xóa |
| `admin.html` / `admin.js` | Thêm card "Background & Music": field URL video + **nút Upload file** cho nhạc/ảnh |
| `api/admin/upload.js` | **Mới** — POST multipart/base64, lưu vào bảng `media_assets` (Neon), trả về `/api/media/:id` |
| `api/media/[id].js` | **Mới** — GET serve bytea với Content-Type + `Cache-Control: public, max-age=31536000, immutable` |
| `api/_lib/db.js` | Thêm `ensureMediaTable()` + `saveMedia(buf, mime)` + `getMedia(id)` |
| `vercel.json` | Thêm rewrite `/api/media/:id` nếu route dynamic không tự match |

## Decoration positioning (fix "lệch + bị cắt")

```css
.avatar-wrap {
  position: relative;
  width: 160px; height: 160px;      /* bằng avatar */
  overflow: visible;                 /* QUAN TRỌNG: không clip decor */
}
.avatar-wrap img.avatar {
  width: 100%; height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.avatar-wrap img.decoration {
  position: absolute;
  inset: 0;
  width: 135%; height: 135%;        /* Discord decor ~1.35x avatar */
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  object-fit: contain;
  pointer-events: none;
  z-index: 2;
}
```
Không dùng `::after border-radius:50%` quanh container nữa (đây là thứ cắt decor).

## Upload nhạc (không cần paste URL)

- Admin: `<input type="file" accept="audio/*,image/*">` → đọc thành base64 → POST `/api/admin/upload` (auth cookie) → lưu bảng `media_assets(id uuid, mime text, data bytea, created_at)` → trả `{url: "/api/media/<id>"}` → tự điền vào field + lưu config.
- **Giới hạn 4MB** (body limit Vercel Hobby) — đủ cho mp3 ngắn/ảnh. Video background vẫn dùng URL (file video thường > limit, hint trong admin khuyên dùng catbox.moe).
- Serve qua `/api/media/:id` với cache 1 năm → load nhanh, không tốn bandwidth DB mỗi lần (edge cache).

## Testing
- `node --check` toàn bộ js mới
- Test upload: login → upload mp3 thật → nhận `/api/media/:id` → GET trả 200 + đúng content-type
- Test live sau deploy: trang không còn theme-switch/transparency/skills; decor nằm viền ngoài avatar đầy đủ; nhạc upload phát được

## Implementation Order
1. Rewrite `index.html` (clean structure + decoration markup)
2. Rewrite `style.css` (single style + decoration CSS)
3. Sửa `script.js` (audio từ config, bỏ ref element chết)
4. `db.js` media table + `api/admin/upload.js` + `api/media/[id].js`
5. Admin UI: upload buttons + video/music URL fields
6. Deploy → verify live từng điểm
