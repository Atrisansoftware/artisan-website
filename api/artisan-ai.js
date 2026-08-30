// api/artisan-ai.js
// Serverless function (Vercel-style) that powers the "Artisan AI" chat widget.
// The frontend (index.html) calls POST /api/artisan-ai — this file is the ONLY
// place your Groq API key should ever exist. It never touches the browser.
//
// ─────────────────────────────────────────────────────────────
// WHERE YOUR GROQ KEY GOES — step by step
// ─────────────────────────────────────────────────────────────
// 1. Get a key from https://console.groq.com/keys (free tier, no credit card
//    required to start).
// 2. Put this file at:  <your-repo-root>/api/artisan-ai.js
// 3. In your Vercel project dashboard:
//      Settings -> Environment Variables -> Add Environment Variable
//      Key:   GROQ_API_KEY
//      Value: <paste your key, no quotes, no extra spaces>
//      Type:  Secret
//      Environment: Production (and Preview/Development if you want those too)
// 4. Redeploy (Deployments tab -> "..." on the latest one -> Redeploy).
//    Adding/changing an environment variable does NOT apply to an
//    already-running deployment — you must redeploy after saving it.
//
// NEVER paste the key directly into this file and commit it to GitHub.
// ─────────────────────────────────────────────────────────────

// Groq periodically deprecates older models (e.g. the old llama-3.3-70b-versatile
// and llama-3.1-8b-instant chat models were retired). openai/gpt-oss-120b is the
// current recommended general-purpose model as of mid-2026. Keeping a short
// fallback list makes this resilient to the next such change without another
// full redeploy-and-debug cycle.
const GROQ_MODEL_CANDIDATES = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — this is what makes it sound like Artisan AI and not
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

  // Groq's chat completions API is OpenAI-compatible: a flat "messages" array
  // with role/content, system message included directly (no separate field
  // like Gemini requires) — simpler and less error-prone than what we had.
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmedHistory.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000),
    })),
    { role: 'user', content: message },
  ];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not set in the environment.');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  let lastStatus = null;
  let lastErrText = null;

  for (const model of GROQ_MODEL_CANDIDATES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.8,
          max_completion_tokens: 400,
        }),
      });
    } catch (err) {
      clearTimeout(timer);
      console.error(`Groq request failed on model "${model}":`, err);
      lastStatus = 'network_error';
      lastErrText = String(err);
      continue; // try next candidate on a network-level failure too
    }
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        console.error(`Groq (${model}) returned no usable text:`, JSON.stringify(data));
        return res.status(502).json({ error: 'Empty response from model' });
      }
      return res.status(200).json({ reply: reply.trim() });
    }

    lastStatus = response.status;
    lastErrText = await response.text();
    console.error(`Groq API error on model "${model}":`, lastStatus, lastErrText);

    // Only move to the next candidate if the model itself is the problem
    // (not found / decommissioned) or the service is briefly overloaded.
    // Auth (401/403) or bad-request (400) errors won't be fixed by trying
    // a different model, so fail fast instead.
    if (lastStatus !== 404 && lastStatus !== 503) {
      return res.status(502).json({ error: 'Upstream API error' });
    }
  }

  console.error('All Groq model candidates failed:', GROQ_MODEL_CANDIDATES, lastStatus, lastErrText);
  return res.status(502).json({ error: 'Upstream API error' });
};
