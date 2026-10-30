const { getSql } = require('./_lib/db');

let fallbackStore = [];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const appId = parseInt(req.url.split('/').pop());
    let body = {};
    try {
      body = req.body ? (typeof req.body === 'object' ? req.body : JSON.parse(req.body)) : {};
    } catch { /* ignore */ }

    const { status } = body;

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    // Try to update in database
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
          UPDATE staff_submissions
          SET data = jsonb_set(data, '{status}', ${JSON.stringify(status)}::jsonb),
              created_at = NOW()
          WHERE (data->>'id')::int = ${appId}
        `;
        return res.status(200).json({ ok: true, message: `Đã cập nhật trạng thái thành ${status}` });
      }
    } catch (dbErr) {
      console.error('[update-status] DB error:', dbErr?.message || dbErr);
    }

    // Fallback: update in memory
    const idx = fallbackStore.findIndex(a => a.id === appId);
    if (idx !== -1) {
      fallbackStore[idx].status = status;
      return res.status(200).json({ ok: true, message: `Đã cập nhật trạng thái thành ${status}` });
    }

    return res.status(404).json({ ok: false, error: 'Application not found' });

  } catch (err) {
    console.error('[update-status] Error:', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Lỗi server' });
  }
};