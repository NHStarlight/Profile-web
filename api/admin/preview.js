const { isAdmin } = require('../_lib/auth');
const { fetchDiscordProfile } = require('../_lib/discord');

// Admin-only preview of what Discord sync will return for a given user ID.
module.exports = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const id = req.query?.id;
  const profile = await fetchDiscordProfile(id);
  return res.status(200).json({ ok: true, profile });
};
