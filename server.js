const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.ANTHROPIC_API_KEY;

app.post('/intel', async (req, res) => {
  const { name, team, pos } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing player name' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'You are a fantasy football analyst. Search the web for the most current 2025 NFL season information about the player. Return ONLY a valid JSON object — no markdown, no backticks, no extra text — with exactly these fields: outlook (string, 2-3 sentence fantasy outlook for 2025), injury (string, current status like Healthy or Questionable-knee or Out-hamstring), news (string, most recent relevant headline as one sentence), recommendation (string, exactly one of: Strong Draft or Good Value or Risky Pick or Wait and See or Avoid), confidence (integer 1 to 100).',
        messages: [{
          role: 'user',
          content: `Search for the latest 2025 NFL fantasy football news, injury status, and outlook for ${name} (${team}, ${pos}). Return only the JSON object.`
        }]
      })
    });

    const data = await response.json();

    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    const clean = text.replace(/```json|```/g, '').trim();
    const intel = JSON.parse(clean);
    res.json(intel);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch intel' });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`DraftIQ API running on port ${PORT}`));
