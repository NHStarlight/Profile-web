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

    // Combine application + test results into ONE record
    const record = {
      id: application?.id || Date.now(),
      fullName: application?.fullName || '',
      discordTag: application?.discordTag || '',
      why: application?.why || '',
      skills: application?.skills || '',
      portfolio: application?.portfolio || '',
      appScore: application?.appScore || 0,
      appReasons: application?.appReasons || [],
      appSubmittedAt: application?.submittedAt || '',
      testScore: testScore || 0,
      testTotal: testTotal || 18,
      testPercentage: testPercentage || 0,
      testPass: testPass || false,
      essay1: essay1 || '',
      essay2: essay2 || '',
      mcqAnswers: mcqAnswers || [],
      submittedAt: submittedAt || new Date().toISOString(),
      status: 'pending' // pending, approved, rejected
    };

    // Try to save to Neon database
    try {
      const sql = getSql();
      if (sql) {
        await sql`
          CREATE TABLE IF NOT EXISTS staff_submissions (
            id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        await sql`
          INSERT INTO staff_submissions (data, created_at)
          VALUES (${JSON.stringify(record)}::jsonb, NOW())
        `;
      } else {
        fallbackStore.push(record);
      }
    } catch (dbErr) {
      console.error('[test-result] DB error, using fallback:', dbErr?.message || dbErr);
      fallbackStore.push(record);
    }

    // Gửi toàn bộ hồ sơ lên Discord webhook (1 lần duy nhất khi nộp test)
    try {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1566047272129531935/QPIns9D_4UK5OZsOuDiu7kcgSnr9fA4lw19nXTqeccXMEe_zmjOp-ou_teQeC2Gemrfk';

      const passText = record.testPass ? 'ĐẠT' : 'KHÔNG ĐẠT';
      const passColor = record.testPass ? 0x2ecc71 : 0xe74c3c;

      const embed = {
        title: '📝 Hồ sơ ứng viên Staff (Đầy đủ)',
        color: passColor,
        fields: [
          { name: 'Họ tên', value: record.fullName || '—', inline: true },
          { name: 'Discord', value: record.discordTag || '—', inline: true },
          { name: 'Điểm form', value: `${record.appScore}/5`, inline: true },
          { name: 'Trắc nghiệm', value: `${record.testScore}/${record.testTotal} (${record.testPercentage}%)`, inline: true },
          { name: 'Kết quả test', value: passText, inline: true },
          { name: 'Lý do ứng tuyển', value: record.why || '—', inline: false },
          { name: 'Kỹ năng', value: record.skills || '—', inline: false },
          { name: 'Portfolio', value: record.portfolio || '—', inline: false },
          { name: 'Câu 19 (Tự luận)', value: record.essay1 || '—', inline: false },
          { name: 'Câu 20 (Tự luận)', value: record.essay2 || '—', inline: false }
        ],
        timestamp: new Date().toISOString()
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });
    } catch (webhookErr) {
      console.error('[test-result] Webhook error:', webhookErr?.message || webhookErr);
    }

    return res.status(200).json({
      ok: true,
      recordId: record.id,
      message: 'Đã gửi toàn bộ hồ sơ ứng viên + kết quả test lên Discord!'
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