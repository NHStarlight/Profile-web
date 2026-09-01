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

module.exports = { getConfig, saveConfig };
