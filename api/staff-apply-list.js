const { getSql } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  try {
    const sql = getSql();
    if (!sql) {
      return res.status(500).json({ ok: false, error: 'Database not configured' });
    }

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS staff_applications (
        id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        full_name TEXT,
        discord_tag TEXT,
        why TEXT,
        skills TEXT,
        portfolio TEXT,
        score INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const rows = await sql`
      SELECT id, full_name, discord_tag, why, skills, portfolio, score, created_at
      FROM staff_applications
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      ok: true,
      count: rows.length,
      applications: rows.map(r => ({
        id: r.id,
        fullName: r.full_name,
        discordTag: r.discord_tag,
        why: r.why,
        skills: r.skills,
        portfolio: r.portfolio,
        score: r.score,
        maxScore: 5,
        createdAt: r.created_at
      }))
    });

  } catch (err) {
    console.error('[staff-apply-list] Error:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Lỗi server' });
  }
};