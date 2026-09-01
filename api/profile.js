const { getConfig } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
  try {
    const config = await getConfig();
    res.status(200).json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
};
