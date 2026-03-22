module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { provider, phone, message, senderId } = req.body;
  const apiKey = process.env.SMS_API_KEY;

  if (!apiKey) return res.status(500).json({ ok: false, error: 'API key not configured in Vercel' });
  if (!phone || !message) return res.status(400).json({ ok: false, error: 'Missing phone or message' });

  const cleanPhone = phone.replace('+', '');
  let url = '';

  if (provider === 'smsnetbd') {
    const p = new URLSearchParams({ api_key: apiKey, msg: message, to: cleanPhone });
    if (senderId) p.set('from', senderId);
    url = `https://api.sms.net.bd/sendsms?${p}`;
  } else if (provider === 'bdbulksms') {
    const p = new URLSearchParams({ api_key: apiKey, type: 'text', number: cleanPhone, senderid: senderId || 'WebSMS', message });
    url = `https://api.bdbulksms.net/api.php?${p}`;
  } else if (provider === 'mimsms') {
    const p = new URLSearchParams({ api_token: apiKey, to: cleanPhone, message });
    if (senderId) p.set('from', senderId);
    url = `https://mimsms.com/smsapi?${p}`;
  } else {
    return res.status(400).json({ ok: false, error: 'Unknown provider' });
  }

  try {
    const response = await fetch(url);
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }

    if (parsed) {
      if (parsed.error === 0 || parsed.status === 'success' || parsed.code === 200) return res.json({ ok: true });
      return res.json({ ok: false, error: parsed.message || String(parsed.error) });
    }
    if (text.toLowerCase().includes('ok') || text.includes('success') || text.trim() === '0') return res.json({ ok: true });
    return res.json({ ok: false, error: text.substring(0, 80) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
