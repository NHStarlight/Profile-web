// Local test harness: mounts the Vercel-style handlers on a plain Node http
// server so the whole flow (profile, discord sync, admin login/save) can be
// exercised locally before deploying. Run:
//   $env:DATABASE_URL=...; $env:ADMIN_PASSWORD=...; node local-test.mjs
import http from 'http';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const require = createRequire(import.meta.url);
const PORT = process.env.TEST_PORT || 8787;

const routes = {
  '/api/profile': require('./api/profile.js'),
  '/api/discord': require('./api/discord.js'),
  '/api/admin/login': require('./api/admin/login.js'),
  '/api/admin/save': require('./api/admin/save.js'),
  '/api/admin/preview': require('./api/admin/preview.js'),
};

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const handler = routes[url.pathname];
  if (handler) {
    // Vercel augments req/res; mirror that here.
    req.query = Object.fromEntries(url.searchParams);
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
      return res;
    };
    if (req.method === 'POST' || req.method === 'DELETE') {
      const body = await readBody(req);
      if (body) req.body = body; // handlers parse JSON themselves
    }
    return handler(req, res).catch((e) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    });
  }

  // Static files
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (path === '/admin') path = '/admin.html';
  const file = join(process.cwd(), path);
  if (!file.startsWith(process.cwd()) || !existsSync(file)) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(PORT, () => console.log(`[local-test] listening on http://localhost:${PORT}`));
