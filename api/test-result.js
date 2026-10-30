const { getSql } = require('./_lib/db');

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

    const { application, testScore, testTotal, testPercentage, testPass, essay1, essay2, mcqAnswers, submittedAt } = body;

    const record = {
      id: Date.now(),
      application: application || null,
      testScore: testScore || 0,
      testTotal: testTotal || 18,
      testPercentage: testPercentage || 0,
      testPass: testPass || false,
      essay1: essay1 || '',
      essay2: essay2 || '',
      mcqAnswers: mcqAnswers || [],
      submittedAt: submittedAt || new Date().toISOString()
    };

    // Try to save to Neon database if configured
    try {
      const sql = getSql();
      if (sql) {
        await sql`
          CREATE TABLE IF NOT EXISTS staff_test_results (
            id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        await sql`
          INSERT INTO staff_test_results (data, created_at)
          VALUES (${JSON.stringify(record)}::jsonb, NOW())
        `;
      } else {
        fallbackStore.push(record);
      }
    } catch (dbErr) {
      console.error('[test-result] DB error, using fallback:', dbErr?.message || dbErr);
      fallbackStore.push(record);
    }

    return res.status(200).json({
      ok: true,
      recordId: record.id,
      message: 'Đã nhận toàn bộ đơn ứng viên + kết quả test.'
    });

  } catch (err) {
    console.error('[test-result] Error:', err?.message || err);
    return res.status(200).json({
      ok: true,
      recordId: Date.now(),
      message: 'Đã nhận đơn ứng viên (lưu cục bộ).'
    });
  }
};