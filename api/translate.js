// Vercel serverless proxy for Sarvam translation.
// Runs server-side (no browser CORS). Deployed automatically by Vercel from /api.
// The web client calls same-origin /api/translate, which forwards to Sarvam.

export default async function handler(req, res) {
  // Allow same-origin + preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Vercel parses JSON bodies automatically; fall back to manual parse.
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    if (!payload || !payload.input) {
      res.status(400).json({ error: 'Missing "input" text.' });
      return;
    }

    const upstream = await fetch('https://www.sarvam.ai/api/playground/translation', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'origin': 'https://www.sarvam.ai',
        'referer': 'https://www.sarvam.ai/apis/translation/english-to-tamil',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        input: payload.input,
        source_language_code: payload.source_language_code || 'en-IN',
        target_language_code: payload.target_language_code || 'ta-IN',
        model: payload.model || 'mayura:v1',
        mode: payload.mode || 'formal',
        output_script: payload.output_script || 'fully-native',
        numerals_format: payload.numerals_format || 'international',
        speaker_gender: payload.speaker_gender || 'Female',
      }),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || 'Proxy error' });
  }
}
