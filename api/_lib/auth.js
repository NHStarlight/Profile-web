// Minimal stateless admin auth: password → HMAC-signed token in an HttpOnly
// cookie. No session store needed (serverless-friendly).
const crypto = require('crypto');

const COOKIE_NAME = 'pf_admin';
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret() {
  return process.env.ADMIN_SECRET || `${process.env.ADMIN_PASSWORD || 'dev'}::profile-web-fallback`;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function issueToken() {
  const exp = Date.now() + TTL_MS;
  const payload = exp.toString(36);
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const exp = parseInt(payload, 36);
  return Number.isFinite(exp) && exp > Date.now();
}

function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(String(password || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getTokenFromReq(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE_NAME) return v.join('=');
  }
  return null;
}

function isAdmin(req) {
  return verifyToken(getTokenFromReq(req));
}

function setAuthCookie(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${issueToken()}; HttpOnly; Path=/; Max-Age=${TTL_MS / 1000}; SameSite=Lax; Secure`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`);
}

module.exports = { checkPassword, isAdmin, setAuthCookie, clearAuthCookie };
