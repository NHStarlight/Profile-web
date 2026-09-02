const { isAdmin } = require('../_lib/auth');
const { saveMedia } = require('../_lib/db');

// Accepts JSON { name, mime, dataBase64 } and stores the bytes in Postgres.
// Returns { ok, url: "/api/media/<id>" } ready to paste into the config.
const MAX_BYTES = 5 * 1024 * 1024; // 5MB (lưu ý: Vercel Hobby có thể chặn body ~4.5MB — file >4.5MB hãy dùng catbox)
const ALLOWED_PREFIXES = ['audio/', 'image/', 'video/'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid json' });
  }

  const { name, mime, dataBase64 } = body || {};
  if (!mime || !ALLOWED_PREFIXES.some((p) => mime.startsWith(p))) {
    return res.status(400).json({ ok: false, error: 'mime must be audio/*, image/* or video/*' });
  }
  if (!dataBase64 || typeof dataBase64 !== 'string') {
    return res.status(400).json({ ok: false, error: 'dataBase64 is required' });
  }

  let buffer;
  try {
    buffer = Buffer.from(dataBase64, 'base64');
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid base64' });
  }
  if (buffer.length === 0) {
    return res.status(400).json({ ok: false, error: 'empty file' });
  }
  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: `file too large (max ${Math.floor(MAX_BYTES / 1024 / 1024)}MB) — use an external URL for bigger files` });
  }

  try {
    const id = await saveMedia(name, mime, buffer);
    console.log(`[upload] stored ${buffer.length} bytes as /api/media/${id} (${mime})`);
    return res.status(200).json({ ok: true, url: `/api/media/${id}` });
  } catch (err) {
    console.error('[upload] saveMedia failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'upload failed' });
  }
};
