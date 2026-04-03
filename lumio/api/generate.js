export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { url, answers } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API-nyckel saknas på servern.' });

    // 1. Scrape site via Jina
    let siteContent = '[Kunde inte hämta webbplats]';
    let siteImages = [];
    try {
      const jinaRes = await fetch('https://r.jina.ai/' + url, {
        headers: { 'Accept': 'text/plain', 'X-Timeout': '10', 'X-Return-Format': 'markdown' }
      });
      if (jinaRes.ok) {
        const text = await jinaRes.text();
        siteContent = text.slice(0, 6000);
        // Extract image URLs from markdown
        const imgMatches = [...text.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)];
        siteImages = imgMatches
          .map(m => m[1])
          .filter(u => !u.includes('icon') && !u.includes('logo') && !u.includes('favicon'))
          .slice(0, 12);
      }
    } catch (e) { /* fallback to answers */ }

    // 2. Swedish calendar events
    const now = new Date();
    const yr = now.getFullYear();
    const events = [
      { d: `${yr}-04-17`, n: 'Påsk', t: 'Påskmeny, familjemiddag, bokningskampanj' },
      { d: `${yr}-04-30`, n: 'Valborg', t: 'Vårfirande, festmeny, uteservering öppnar' },
      { d: `${yr}-05-31`, n: 'Mors dag', t: 'Presentkort, specialmeny' },
      { d: `${yr}-06-06`, n: 'Nationaldagen', t: 'Svensk mat, lokalt tema' },
      { d: `${yr}-06-19`, n: 'Midsommar', t: 'Sommarmeny, terrass, husmanskost' },
      { d: `${yr}-08-01`, n: 'Kräftpremiären', t: 'Kräftskiva, säsongsspecial' },
      { d: `${yr}-10-31`, n: 'Halloween', t: 'Tematisk meny, säsongsmat' },
      { d: `${yr}-12-13`, n: 'Lucia', t: 'Julbord, glögg, tradition' },
      { d: `${yr+1}-02-14`, n: 'Alla hjärtans dag', t: 'Parmeny, romantik' },
    ].filter(e => new Date(e.d) >= now).slice(0, 5).map(e => `• ${e.n}: ${e.t}`).join('\n');

    const answersStr = [
      answers.q1 && `Namn/typ: ${answers.q1}`,
      answers.q2 && `Stoltaste rätt: ${answers.q2}`,
      answers.q3 && `Det unika: ${answers.q3}`,
      answers.q4 && `Historia: ${answers.q4}`,
      answers.q5 && `Atmosfär: ${answers.q5}`,
      answers.q6 && `Målgrupp: ${answers.q6}`,
      answers.q7 && `Events: ${answers.q7}`,
    ].filter(Boolean).join('\n') || '[Inga svar]';

    // 3. Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: `Du är Lumio, en AI specialiserad på strategiskt social media-innehåll för svenska restauranger. Generera personaliserat, autentiskt innehåll som låter mänskligt. Svara ENBART med giltig JSON utan markdown eller text utanför JSON-objektet.`,
        messages: [{
          role: 'user',
          content: `Analysera denna restaurang och generera ett komplett innehållspaket.

WEBBPLATSINNEHÅLL:
${siteContent}

RESTAURANGENS SVAR:
${answersStr}

KOMMANDE SVENSKA HÖGTIDER:
${events}

Svara med EXAKT detta JSON:
{
  "brand_profile": {
    "name": "Restaurangens namn",
    "cuisine": "Typ av kök",
    "tone": "Varumärkesröst 3-4 ord",
    "personality": "2-3 meningar om personlighet",
    "target_audience": "Primär målgrupp",
    "unique_points": ["USP 1","USP 2","USP 3"]
  },
  "competitor_analysis": {
    "positioning": "Hur restaurangen bör positionera sig",
    "gaps": ["Gap 1","Gap 2","Gap 3"]
  },
  "posts": [
    {
      "id": 1,
      "platform": "Instagram",
      "content_type": "mat",
      "text": "Inläggstext med emojis. Stark hook. Specifika detaljer. Naturlig ton.",
      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
      "image_prompt": "English Flux/DALL-E prompt for photorealistic food photography.",
      "strategy": "En mening om varför detta är strategiskt smart."
    }
  ]
}

Generera exakt 12 inlägg: 4 mat, 2 bakom_kulisserna, 2 personal, 2 event, 1 tips, 1 recensioner.
Plattformar: 5 Instagram, 3 Facebook, 2 LinkedIn, 2 TikTok.
KRAV: Varje inlägg måste ha specifika detaljer från JUST denna restaurang.`
        }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}));
      return res.status(500).json({ error: err.error?.message || 'Claude API-fel' });
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.map(b => b.text || '').join('') || '';
    let parsed;
    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else return res.status(500).json({ error: 'Kunde inte tolka AI-svaret.' });
    }

    return res.status(200).json({ ...parsed, site_images: siteImages });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Serverfel' });
  }
}
