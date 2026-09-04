const { getViewCount, registerView } = require('./_lib/db');

// Real profile view counter.
//   GET  /api/visit → { ok, count }  (read-only, no increment)
//   POST /api/visit → { ok, count }  body: { vid } increments once per visitor id
// The frontend keeps a stable vid in localStorage so the same browser only
// counts once; server-side dedup lives in the profile_visitors table.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const count = await getViewCount();
    if (count === null) return res.status(500).json({ ok: false, error: 'database unavailable' });
    return res.status(200).json({ ok: true, count });
  }

  if (req.method === 'POST') {
    let vid = '';
    try {
      const body = typeof req.body === 'object' ? (req.body || {}) : JSON.parse(req.body || '{}');
      vid = String(body.vid || '').trim().slice(0, 128);
    } catch { /* ignore malformed body */ }
    if (!vid) return res.status(400).json({ ok: false, error: 'missing vid' });
    const count = await registerView(vid);
    if (count === null) return res.status(500).json({ ok: false, error: 'database unavailable' });
    return res.status(200).json({ ok: true, count });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'method not allowed' });
};