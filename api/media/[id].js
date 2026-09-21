const { getMedia } = require('../_lib/db');

// Serves an uploaded media asset with immutable caching + Range support
// (Range/206 is required for audio seeking on Chrome/mobile).
module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  // Support /api/media?id=... and /api/media/<id> (Vercel maps [id] here).
  const id = (req.query?.id || req.url?.split('/media/')[1]?.split(/[?#]/)[0] || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'missing id' });

  const row = await getMedia(id);
  if (!row) return res.status(404).json({ ok: false, error: 'not found' });

  const data = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
  const mime = row.mime || 'application/octet-stream';
  const total = data.length;

  res.setHeader('Content-Type', mime);
  res.setHeader('Accept-Ranges', 'bytes');

  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', total);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).end();
  }

  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    if (m) {
      let start = m[1] === '' ? null : parseInt(m[1], 10);
      let end = m[2] === '' ? null : parseInt(m[2], 10);
      if (start === null && end !== null) start = Math.max(0, total - end), end = total - 1;
      if (start === null) start = 0;
      if (end === null || end >= total) end = total - 1;
      if (start >= 0 && start < total && end >= start) {
        const chunk = data.subarray(start, end + 1);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', chunk.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.status(206).send(chunk);
      }
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }
  }

  res.setHeader('Content-Length', total);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(data);
};
