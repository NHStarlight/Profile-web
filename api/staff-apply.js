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

    // Tính điểm đơn giản 0-5
    let score = 0;
    const reasons = [];
    if (fullName && fullName.trim()) { score += 1; reasons.push('Họ tên'); }
    if (discordTag && discordTag.trim()) { score += 1; reasons.push('Discord'); }
    if (why && why.trim().length > 20) { score += 1; reasons.push('Lý do'); }
    if (skills && skills.trim().length > 10) { score += 1; reasons.push('Kỹ năng'); }
    if (portfolio && portfolio.trim()) { score += 1; reasons.push('Portfolio'); }

    // Gửi webhook đã chuyển sang api/test-result.js (gửi 1 lần duy nhất khi nộp test)
    return res.status(200).json({
      ok: true,
      score: score,
      maxScore: 5,
      reasons: reasons,
      message: 'Đã nhận đơn ứng viên. Vui lòng làm tiếp bài test.'
    });

  } catch (err) {
    console.error('[staff-apply] Error:', err?.message || err);
    return res.status(200).json({
      ok: true,
      score: 0,
      maxScore: 5,
      reasons: [],
      message: 'Đã nhận đơn ứng viên.'
    });
  }
};