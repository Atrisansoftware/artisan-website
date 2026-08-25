// api/artisan-ai.js
// Serverless function (Vercel-style) that powers the "Artisan AI" chat widget.
// The frontend calls POST /api/artisan-ai — this is the only place the API key lives.
//
// SETUP:
// 1. npm install (no extra packages needed — uses built-in fetch on Node 18+)
// 2. In your hosting dashboard (Vercel/Netlify/etc.), add an environment variable:
//      ANTHROPIC_API_KEY = sk-ant-...   (get this from https://console.anthropic.com)
// 3. Deploy. Vercel auto-detects files under /api as serverless functions.
//    (Netlify: put this in /netlify/functions/ instead and adjust the export.)

const SYSTEM_PROMPT = `You are "Artisan AI", the official website assistant for Artisan Engineering and Builders Pvt. Ltd., a civil engineering, construction and technical training firm in Nepalgunj, Banke District, Lumbini Province, Nepal.

Respond like a helpful, knowledgeable staff member — conversational and concise (2-5 sentences for most questions), not a wall of bullet points, unless the person asks for a full breakdown or list.

COMPANY FACTS (use only these — do not invent details):
- Four service areas: Engineering (architectural design, structural design/ETABS seismic analysis, building permit drawing sets, BOQ/estimation), Construction (residential & commercial, renovation, site supervision), Consultancy (site surveys, feasibility, technical reports), Academy (AutoCAD, ETABS, STAAD.Pro, Quantity Estimation training).
- Founders: Rishav Adhikari (Chairman & Founder), Pusp Raj Bhatt (Founder), Hasta Bahadur Bhul (Founder).
- 8-stage process: Initial Consultation -> Site Assessment & Survey -> Architectural Design -> Structural Engineering (ETABS) -> Estimation & BOQ -> Permit Approval -> Construction -> Supervision & Handover.
- All structural designs comply with Nepal Building Code (NBC), including seismic analysis, since Nepal is in an active earthquake zone.
- Service coverage: Construction & supervision across Banke, Bardiya, Surkhet, Dang, Kapilvastu, Rupandehi, Pyuthan. Engineering design/consultancy nationwide. Academy is in-person in Nepalgunj.
- No fixed price list — pricing depends on building type, area, storeys, finishing level, location and services required. Encourage the person to share these details, or contact the team, for an accurate quote.
- Contact: +977-9829635328 (primary, call or WhatsApp), +977-9840938423, +977-9861113521, artisanengineering4@gmail.com. Office hours: Sunday-Friday 9AM-5PM, Saturday by appointment.

RULES:
- If asked something outside these facts (e.g. unrelated topics, other companies, personal opinions), politely redirect to what you can help with.
- If someone wants to talk to a real person or get a firm quote, give the phone number and mention the Contact page form.
- Never make up prices, dates, or capabilities not listed above.
- Keep formatting light: short paragraphs or a few bullets max, no huge headers.`;

const MODEL = 'claude-haiku-4-5-20251001'; // fast/cheap model — swap if you want higher quality

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing "message" in request body' });
  }

  // Keep only the last few turns to control cost/latency
  const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          ...trimmedHistory.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I couldn't generate a response just now — please try again or contact us directly at +977-9829635328.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('artisan-ai handler error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
