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

    // Gửi đến Discord webhook
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1566047272129531935/QPIns9D_4UK5OZsOuDiu7kcgSnr9fA4lw19nXTqeccXMEe_zmjOp-ou_teQeC2Gemrfk';

    const embed = {
      title: '📝 Đơn ứng viên Staff mới',
      color: 0x00ff00,
      fields: [
        { name: 'Họ tên', value: fullName || '—', inline: true },
        { name: 'Discord', value: discordTag || '—', inline: true },
        { name: 'Điểm', value: `${score}/5`, inline: true },
        { name: 'Lý do', value: why || '—', inline: false },
        { name: 'Kỹ năng', value: skills || '—', inline: false },
        { name: 'Portfolio', value: portfolio || '—', inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });
    } catch (webhookErr) {
      console.error('[webhook] Error:', webhookErr?.message || webhookErr);
    }

    return res.status(200).json({
      ok: true,
      score: score,
      maxScore: 5,
      reasons: reasons,
      message: 'Đơn ứng viên đã gửi đến Discord!'
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