const { getSql } = require('./_lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  try {
    const sql = getSql();
    if (!sql) {
      // Database not configured on Vercel — return empty gracefully
      return res.status(200).json({
        ok: true,
        count: 0,
        applications: [],
        message: 'DATABASE_URL not configured on Vercel. Add it to Environment Variables to see submissions.'
      });
    }

    // Read from staff_submissions table (contains both application + test results)
    await sql`
      CREATE TABLE IF NOT EXISTS staff_submissions (
        id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const rows = await sql`
      SELECT id, data, created_at
      FROM staff_submissions
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      ok: true,
      count: rows.length,
      applications: rows.map(r => {
        const d = r.data || {};
        return {
          id: d.id || r.id,
          fullName: d.fullName || '',
          discordTag: d.discordTag || '',
          why: d.why || '',
          skills: d.skills || '',
          portfolio: d.portfolio || '',
          appScore: d.appScore || 0,
          appReasons: d.appReasons || [],
          appSubmittedAt: d.appSubmittedAt || '',
          testScore: d.testScore || 0,
          testTotal: d.testTotal || 18,
          testPercentage: d.testPercentage || 0,
          testPass: d.testPass || false,
          essay1: d.essay1 || '',
          essay2: d.essay2 || '',
          mcqAnswers: d.mcqAnswers || [],
          submittedAt: d.submittedAt || r.created_at,
          status: d.status || 'pending',
          createdAt: r.created_at
        };
      })
    });

  } catch (err) {
    console.error('[staff-apply-list] Error:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Lỗi server' });
  }
};