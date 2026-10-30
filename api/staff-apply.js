const { getSql } = require('./_lib/db');

// Fallback in-memory store if DATABASE_URL is not configured on Vercel
let fallbackStore = [];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let body = {};
    try {
      body = req.body ? (typeof req.body === 'object' ? req.body : JSON.parse(req.body)) : {};
    } catch { /* ignore malformed body */ }

    const { fullName, discordTag, why, skills, portfolio } = body;

    // ---- Calculate score (0-5) ----
    let score = 0;
    const reasons = [];

    if (fullName && fullName.trim()) { score += 1; reasons.push('Họ và tên được cung cấp'); }
    if (discordTag && discordTag.trim()) { score += 1; reasons.push('Tag Discord được cung cấp'); }
    if (why && why.trim().length > 20) { score += 1; reasons.push('Lý do dài đủ (nội dung tốt)'); }
    if (skills && skills.trim().length > 10) { score += 1; reasons.push('Kiến thức/kỹ năng được ghi rõ'); }
    if (portfolio && portfolio.trim()) { score += 1; reasons.push('Có portfolio/Link'); }

    const applicationRecord = {
      id: Date.now(),
      fullName,
      discordTag,
      why,
      skills,
      portfolio,
      score,
      maxScore: 5,
      reasons,
      createdAt: new Date().toISOString()
    };

    // Try to save to Neon database if configured
    const sql = getSql();
    if (sql) {
      try {
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

        // Insert application
        const [row] = await sql`
          INSERT INTO staff_applications (full_name, discord_tag, why, skills, portfolio, score)
          VALUES (${fullName || null}, ${discordTag || null}, ${why || null}, ${skills || null}, ${portfolio || null}, ${score})
          RETURNING id, full_name, discord_tag, why, skills, portfolio, score, created_at
        `;
        applicationRecord.id = row.id;
      } catch (dbErr) {
        console.error('[staff-apply] DB insert failed, using fallback:', dbErr?.message || dbErr);
        fallbackStore.push(applicationRecord);
      }
    } else {
      // DATABASE_URL not configured on Vercel — store in memory fallback
      fallbackStore.push(applicationRecord);
      console.log('[staff-apply] DATABASE_URL not configured. Stored in fallback memory.');
    }

    return res.status(200).json({
      ok: true,
      applicationId: applicationRecord.id,
      score: score,
      maxScore: 5,
      reasons: reasons,
      message: 'Đơn ứng viên đã được nhận. Chúng tôi sẽ xem xét và phản hồi qua justhanaa@proton.me'
    });

  } catch (err) {
    console.error('[staff-apply] Error:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Lỗi server' });
  }
};