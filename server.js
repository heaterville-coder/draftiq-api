const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// Debug endpoint — remove after testing
app.get('/debug', (_, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    key_present: !!key,
    key_length: key ? key.length : 0,
    key_start: key ? key.substring(0, 10) : 'none',
    node_env: process.env.NODE_ENV,
    all_env_keys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC'))
  });
});

app.post('/intel', async (req, res) => {
  const { name, team, pos } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('Intel request for:', name, team, pos);
  console.log('API Key present:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);

  if (!name) return res.status(400).json({ error: 'Missing player name' });
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'You are a fantasy football analyst. Search the web for current 2025 NFL information about the player. Return ONLY a valid JSON object with no markdown, no backticks, no extra text. Fields: outlook (2-3 sentence fantasy outlook), injury (current status e.g. Healthy or Questionable-knee), news (most recent relevant headline), recommendation (exactly one of: Strong Draft, Good Value, Risky Pick, Wait and See, Avoid), confidence (integer 1-100).',
        messages: [{
          role: 'user',
          content: `Search for latest 2025 NFL fantasy football news, injury status, and outlook for ${name} (${team}, ${pos}). Return only the JSON object.`
        }]
      })
    });

    const data = await response.json();
    console.log('Anthropic response status:', response.status);

    if (data.error) {
      console.error('Anthropic error:', JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
      .replace(/```json|```/g, '')
      .trim();

    const intel = JSON.parse(text);
    res.json(intel);

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok', key: !!process.env.ANTHROPIC_API_KEY }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`DraftIQ API on port ${PORT}`));
