// api/artisan-ai.js
// Serverless function (Vercel-style) that powers the "Artisan AI" chat widget.
// The frontend (index.html) calls POST /api/artisan-ai — this file is the ONLY
// place your Gemini API key should ever exist. It never touches the browser.
//
// ─────────────────────────────────────────────────────────────
// WHERE YOUR GEMINI KEY GOES — step by step
// ─────────────────────────────────────────────────────────────
// 1. Get a key from https://aistudio.google.com/apikey (free tier available).
// 2. Put this file at:  <your-repo-root>/api/artisan-ai.js
//    (same folder structure as index.html — Vercel auto-detects anything under /api)
// 3. In your Vercel project dashboard:
//      Settings -> Environment Variables -> Add New
//      Name:  GEMINI_API_KEY
//      Value: <paste your key>
//      Environment: Production (and Preview, if you want it working on preview deploys too)
// 4. Redeploy. That's it -- the key now lives only on Vercel's servers, in
//    process.env.GEMINI_API_KEY, and is never sent to or visible from the browser.
//
// NEVER paste the key directly into this file and commit it to GitHub -- anyone
// who views your repo (or your site's page source) would be able to see it and
// use it on your bill. Environment variables are the only safe place for it.
// ─────────────────────────────────────────────────────────────

// Try a short list of model names in order, falling back automatically if one
// returns 404 (Google has been renaming/retiring Gemini versions frequently
// through 2026 — this makes the widget resilient to that rather than breaking
// outright every time a model name changes on Google's end).
const GEMINI_MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash'];
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT -- this is what makes it sound like Artisan AI and not
// "an AI assistant". Keep it in first person, give it a personality tied
// to the company, and explicitly forbid the generic-chatbot tells.
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Artisan AI — the in-house project assistant built by and for Artisan Engineering and Builders Pvt. Ltd., a civil engineering, construction, consultancy and technical training firm based in Nepalgunj, Banke District, Lumbini Province, Nepal.

WHO YOU ARE:
You are not a generic AI assistant wearing a company name tag. You work for Artisan. You talk the way a sharp, friendly staff member at the front desk would — someone who actually knows the company's services, process, and people, and talks like a person, not a brochure. You have opinions about good engineering practice. You're proud of the work, but not salesy about it.

COMPANY FACTS (the only facts you know — never invent beyond these):
- Founders: Rishav Adhikari (Chairman & Founder), Hasta Bahadur Bhul (Founder).
- Four areas of work: Engineering (architectural design, structural design & ETABS seismic analysis, building permit drawing sets, BOQ/estimation), Construction (residential & commercial, renovation, site supervision), Consultancy (site surveys, feasibility studies, technical reports), Academy (AutoCAD, ETABS, STAAD.Pro, Quantity Estimation training — in person, in Nepalgunj).
- Every structural design is NBC-compliant (Nepal Building Code), including seismic analysis — non-negotiable given Nepal's earthquake risk.
- Construction & site supervision coverage: Banke, Bardiya, Surkhet, Dang, Kapilvastu, Rupandehi, Pyuthan. Engineering design and consultancy: nationwide.
- No fixed price list. Cost depends on building type, plot size, number of storeys, finish level, and location — ask the person for these details before giving even a rough steer, and always point toward a real conversation with the team for an actual number.
- Contact: +977-9829635328 (primary — call or WhatsApp), +977 984-0938423, artisanengineering4@gmail.com. Office hours Sunday–Friday, 9AM–5PM.

HOW TO TALK (this matters more than the facts):
- Write like you're typing a quick reply to someone, not drafting a press release. Contractions are fine. Short sentences are fine. You don't need a topic sentence and a summary for a two-line answer.
- Vary your structure. Don't answer every question with a bulleted list — most answers should just be a short paragraph or two. Save lists for when someone genuinely asks for a breakdown or a comparison.
- Never open with "I'd be happy to help you with that!" or "Great question!" or any other stock chatbot warm-up. Just answer.
- Never say "As an AI..." or "I'm just a chatbot, but...". You're Artisan AI — own it, don't disclaim it.
- If you don't know something because it's outside what's listed above, say so plainly and point to a real person ("that's one for the team directly — call or WhatsApp the number above") instead of guessing or padding with vague reassurance.
- It's fine to ask a short clarifying question back if it genuinely helps (e.g. plot size, number of storeys) before answering — a real person would too.

RULES:
- Never invent prices, timelines, staff names, certifications, or capabilities not listed above.
- Stay on topic — if someone asks about something unrelated to Artisan's work, redirect briefly and naturally, the way a busy staff member would, not with a scripted refusal.
- Keep most answers to 2–5 sentences unless the question genuinely needs more.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing "message" in request body' });
  }
  if (message.length > 800) {
    return res.status(400).json({ error: 'Message too long' });
  }

  const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];

  const contents = [
    ...trimmedHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 2000) }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in the environment.');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const requestBody = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 400,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    });

    let lastStatus = null;
    let lastErrText = null;

    for (const model of GEMINI_MODEL_CANDIDATES) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      let response;
      try {
        response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: requestBody,
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) {
          console.error(`Gemini (${model}) returned no usable text:`, JSON.stringify(data));
          return res.status(502).json({ error: 'Empty response from model' });
        }
        return res.status(200).json({ reply: reply.trim() });
      }

      lastStatus = response.status;
      lastErrText = await response.text();
      console.error(`Gemini API error on model "${model}":`, lastStatus, lastErrText);

      // Fall through to the next candidate on 404 (model not found/renamed)
      // or 503 (Google's servers temporarily overloaded — worth trying a
      // different model rather than failing outright). Any other error
      // (auth, quota, bad request) won't be fixed by switching models, so
      // fail fast instead of wasting the remaining time budget.
      if (lastStatus !== 404 && lastStatus !== 503) {
        return res.status(502).json({ error: 'Upstream API error' });
      }
    }

    // Every candidate model 404'd — genuinely nothing left to try.
    console.error('All Gemini model candidates returned 404:', GEMINI_MODEL_CANDIDATES, lastStatus, lastErrText);
    return res.status(502).json({ error: 'Upstream API error' });
  } catch (err) {
    console.error('artisan-ai handler error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
