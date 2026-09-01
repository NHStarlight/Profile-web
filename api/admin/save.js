const { isAdmin } = require('../_lib/auth');
const { getConfig, saveConfig } = require('../_lib/db');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const config = await getConfig();
    return res.status(200).json({ ok: true, config });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  let body;
  try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); }
  catch { return res.status(400).json({ ok: false, error: 'invalid json' }); }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'config must be an object' });
  }

  try {
    const saved = await saveConfig(body);
    return res.status(200).json({ ok: true, config: saved });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'save failed' });
  }
};

