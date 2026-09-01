const { checkPassword, setAuthCookie, clearAuthCookie, isAdmin } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    let body = {};
    try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); }
    catch { /* handled below */ }
    if (!checkPassword(body?.password)) {
      return res.status(401).json({ ok: false, error: 'wrong password' });
    }
    setAuthCookie(res);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    clearAuthCookie(res);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, authenticated: isAdmin(req) });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ ok: false, error: 'method not allowed' });
};
