// Neon Postgres over HTTPS (works in Vercel serverless + local Node).
// Table holds exactly one config row (id = 1). If DATABASE_URL is missing the
// site still works with DEFAULT_CONFIG — only the admin editor needs the DB.
const { DEFAULT_CONFIG } = require('./defaults');

let _sql = null;
function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) {
    const { neon } = require('@neondatabase/serverless');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS web_profile (
      id INT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getConfig() {
  const sql = getSql();
  if (!sql) return { ...DEFAULT_CONFIG, _source: 'defaults-no-db' };
  try {
    await ensureTable(sql);
    const rows = await sql`SELECT data FROM web_profile WHERE id = 1 LIMIT 1`;
    if (rows.length === 0) {
      await sql`
        INSERT INTO web_profile (id, data) VALUES (1, ${JSON.stringify(DEFAULT_CONFIG)}::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
      return { ...DEFAULT_CONFIG, _source: 'defaults-seeded' };
    }
    return { ...DEFAULT_CONFIG, ...rows[0].data, _source: 'db' };
  } catch (err) {
    console.error('[db] getConfig failed:', err?.message || err);
    return { ...DEFAULT_CONFIG, _source: 'defaults-db-error' };
  }
}

async function saveConfig(data) {
  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureTable(sql);
  // Never trust _source or nested junk from the client merge.
  const clean = JSON.parse(JSON.stringify(data));
  delete clean._source;
  await sql`
    INSERT INTO web_profile (id, data, updated_at)
    VALUES (1, ${JSON.stringify(clean)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
  return clean;
}

// ---------- Media assets (uploaded music / images) ----------
// Files are stored as bytea and served via /api/media/:id with immutable
// caching. Vercel Hobby caps request bodies at ~4.5MB — larger media should
// use an external URL (e.g. catbox.moe) instead.
async function ensureMediaTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS media_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      mime TEXT NOT NULL,
      size INT NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function saveMedia(name, mime, buffer) {
  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureMediaTable(sql);
  const rows = await sql`
    INSERT INTO media_assets (name, mime, size, data)
    VALUES (${name || null}, ${mime}, ${buffer.length}, ${buffer})
    RETURNING id
  `;
  return rows[0].id;
}

async function getMedia(id) {
  const sql = getSql();
  if (!sql) return null;
  // Validate UUID shape — an invalid cast throws in postgres.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  try {
    const rows = await sql`SELECT mime, data FROM media_assets WHERE id = ${id} LIMIT 1`;
    return rows[0] || null;
  } catch (err) {
    console.error('[db] getMedia failed:', err?.message || err);
    return null;
  }
}

// ---------- Real visitor counter (server-side) ----------
// Counts unique browsers (deduped by a client-generated visitor id) so the
// number reflects real people who opened the profile, not a hardcoded base.
async function ensureViewsTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS profile_views (
      id INT PRIMARY KEY,
      count BIGINT NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS profile_visitors (
      vid TEXT PRIMARY KEY,
      visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getViewCount() {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureViewsTables(sql);
    const rows = await sql`SELECT count FROM profile_views WHERE id = 1 LIMIT 1`;
    return rows.length ? Number(rows[0].count) : 0;
  } catch (err) {
    console.error('[db] getViewCount failed:', err?.message || err);
    return null;
  }
}

async function registerView(vid) {
  const sql = getSql();
  if (!sql) return null;
  try {
    await ensureViewsTables(sql);
    // Only the FIRST time this visitor id appears does the counter go up —
    // reloads from the same browser are ignored.
    const ins = await sql`
      INSERT INTO profile_visitors (vid) VALUES (${vid})
      ON CONFLICT (vid) DO NOTHING
      RETURNING vid
    `;
    if (ins.length === 0) {
      const rows = await sql`SELECT count FROM profile_views WHERE id = 1 LIMIT 1`;
      return rows.length ? Number(rows[0].count) : 0;
    }
    const rows = await sql`
      INSERT INTO profile_views (id, count) VALUES (1, 1)
      ON CONFLICT (id) DO UPDATE SET count = profile_views.count + 1
      RETURNING count
    `;
    return rows.length ? Number(rows[0].count) : 1;
  } catch (err) {
    console.error('[db] registerView failed:', err?.message || err);
    return null;
  }
}

module.exports = { getConfig, saveConfig, saveMedia, getMedia, getViewCount, registerView };
