const { getConfig } = require('./_lib/db');
const { fetchDiscordProfile } = require('./_lib/discord');

// Public endpoint: /api/discord?id=<userId> — but only the profile's own
// Discord ID is exposed (prevents using your deployment as a free lookup API).
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const config = await getConfig();
    const id = req.query?.id || config.discordUserId;
    if (String(id) !== String(config.discordUserId)) {
      return res.status(403).json({ ok: false, error: 'id not allowed' });
    }
    const profile = await fetchDiscordProfile(id);
    res.status(200).json({ ok: true, profile });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'failed' });
  }
};
