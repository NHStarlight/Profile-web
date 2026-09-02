const { getMedia } = require('../_lib/db');

// Serves an uploaded media asset with immutable caching.
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  // Support /api/media?id=... and /api/media/<id> (Vercel maps [id] here).
  const id = (req.query?.id || req.url?.split('/media/')[1]?.split(/[?#]/)[0] || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'missing id' });

  const row = await getMedia(id);
  if (!row) return res.status(404).json({ ok: false, error: 'not found' });

  res.setHeader('Content-Type', row.mime || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(Buffer.from(row.data));
};
