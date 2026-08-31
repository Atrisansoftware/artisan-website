// api/artisan-ai.js
// Serverless function (Vercel-style) that powers the "Artisan AI" chat widget.
// Routes across FOUR AI providers with automatic failover: Groq -> OpenRouter
// -> Nvidia NIM -> Gemini (last resort). If one is down, slow, or rate-limited,
// the next is tried automatically within the same request. The frontend calls
// POST /api/artisan-ai — this file is the ONLY place any of these keys should
// ever exist. None of them ever touch the browser.
//
// ─────────────────────────────────────────────────────────────
// SETUP — you don't need all four to start. Missing keys are skipped
// automatically (that provider is just left out of the rotation).
// ─────────────────────────────────────────────────────────────
// Groq:        https://console.groq.com/keys              -> GROQ_API_KEY
// OpenRouter:  https://openrouter.ai/keys                  -> OPENROUTER_API_KEY
// Nvidia NIM:  https://build.nvidia.com (API Catalog)      -> NVIDIA_API_KEY
// Gemini:      https://aistudio.google.com/apikey          -> GEMINI_API_KEY
//
// Vercel -> Settings -> Environment Variables -> add each as Type: Secret,
// Environment: Production. Redeploy after saving (env var changes don't
// apply retroactively to an already-running deployment).
// ─────────────────────────────────────────────────────────────

// Three of the four providers speak the same OpenAI-compatible chat-completions
// format (Groq, OpenRouter, Nvidia NIM) — one shared calling function handles
// all three. Gemini uses a different request/response shape entirely and is
// handled separately, as a text-only last resort (no tool-calling — see note
// further down on why that trade-off is intentional).
//
// Order matters: this is fallback priority, not "best model" ranking. Groq
// first because it's proven fast and reliable for this project. OpenRouter's
// "openrouter/free" model is OpenRouter's OWN auto-router across whatever free
// models are currently up — deliberately NOT a specific model name, because
// OpenRouter's free-tier catalog rotates models in and out with no warning,
// and hardcoding one specific "some-model:free" ID is exactly the kind of
// brittleness that caused problems before. Nvidia's hosted trial endpoint can
// have slow cold-starts under load, hence last before the Gemini fallback.
const OPENAI_COMPATIBLE_PROVIDERS = [
  {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
    extraHeaders: {},
  },
  {
    name: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/free',
    // OpenRouter-recommended (not required) — identifies the app in their dashboard.
    extraHeaders: { 'HTTP-Referer': 'https://artisanengineering.com.np', 'X-Title': 'Artisan AI' },
  },
  {
    name: 'nvidia',
    envKey: 'NVIDIA_API_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.3-70b-instruct',
    extraHeaders: {},
  },
];

// Reuses the exact same inbox your contact form already delivers to —
// no new destination, no new company info introduced.
const INQUIRY_EMAIL = 'artisanengineering4@gmail.com';
const FORMSUBMIT_AJAX_URL = `https://formsubmit.co/ajax/${INQUIRY_EMAIL}`;

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Artisan AI — the in-house project assistant built by and for Artisan Engineering and Builders Pvt. Ltd., a civil engineering, construction, consultancy and technical training firm based in Nepalgunj, Banke District, Lumbini Province, Nepal.

WHO YOU ARE:
You are not a generic AI assistant wearing a company name tag. You work for Artisan. You talk the way a sharp, friendly staff member at the front desk would — someone who actually knows the company's services, process, and people, and talks like a person, not a brochure. You have opinions about good engineering practice. You're proud of the work, but not salesy about it.

CONVERSATIONAL MEMORY — USE IT:
You receive the recent conversation history with every message. Actually use it. If a customer already told you their plot is in Nepalgunj, don't ask again. If they say "what about the second option" or "how much steel for that" after a previous answer, resolve what "that" or "the second option" refers to from context — don't ask them to repeat themselves unless the reference is genuinely ambiguous. Carry forward project details (location, building type, area, floors) across the whole conversation rather than treating each message as a fresh start.

KNOWLEDGE BASE (the only facts you know about the company — never invent beyond these):
- Founders: Rishav Adhikari (Chairman & Founder), Hasta Bahadur Bhul (Founder).
- Engineering: architectural design, structural design & ETABS seismic analysis, building permit drawing sets, BOQ/quantity estimation, 3D visualization.
- Construction: residential & commercial building construction, renovation, site supervision, project management.
- Consultancy: site surveys, feasibility studies, technical reports, engineering advice.
- Academy (in-person, Nepalgunj): AutoCAD (2D drafting, architectural & structural drawing production), ETABS (structural modelling, seismic load analysis, RCC design), STAAD.Pro (structural analysis and design for steel and concrete), Quantity Estimation & BOQ (measurement, BOQ preparation, cost estimation from drawings). No fixed fee or schedule is published — direct interested students to contact the team.
- Every structural design is NBC-compliant (Nepal Building Code), including seismic analysis — non-negotiable given Nepal's earthquake risk.
- Construction & site supervision coverage: Banke, Bardiya, Surkhet, Dang, Kapilvastu, Rupandehi, Pyuthan. Engineering design and consultancy: nationwide.
- Policy: no fixed price list — cost depends on building type, plot size, storeys, finish level, and location. The team responds to enquiries within 24 hours, Sunday–Friday.
- Contact: +977-9829635328 (primary — call or WhatsApp), +977 984-0938423, artisanengineering4@gmail.com. Office hours Sunday–Friday, 9AM–5PM.
- You do not have a list of specific past projects with names, costs, or client details — if asked for portfolio examples, point to the Projects page on the website rather than describing specific jobs you don't actually have verified details about.

ENGINEERING EXPERT MODE:
Beyond company facts, you have genuine general engineering knowledge and should use it. If someone asks what ETABS actually does, how seismic analysis works, what a BOQ is and why it matters, how AutoCAD fits into a design workflow, what NBC requires and why, or any other real civil/structural engineering or construction question — explain it properly, in your own words, at whatever depth the question calls for. Don't reduce every technical question to a company-services pitch. It's fine and good to teach someone something even if it doesn't end in a sales pitch. If a question drifts into needing Artisan's specific professional judgment on an actual project (e.g. "is my column big enough"), explain the general principle, then note that a real structural check needs an actual engineer looking at the actual design — that's not a brush-off, it's true and responsible.

CALCULATIONS AND UNIT CONVERSIONS — you're genuinely good at these, use exact figures below and show your work briefly:

Metric length: 1 km = 1000 m | 1 m = 100 cm = 1000 mm | 1 cm = 10 mm
Metric area: 1 m² = 10.7639 ft² | 1 ft² = 0.092903 m²
House area from dimensions: area = length × breadth. If given in feet, state result in both ft² and m². If storeys are mentioned, total built-up area = floor area × number of storeys.

Nepal land units — two separate regional systems that do NOT convert directly by a simple ratio. Always bridge through square meters (m²), and if a customer mixes systems (e.g. "1 Aana to Kattha"), clarify these are different regional systems (Hill vs Terai) before converting.

Terai (Madhesh) system — used in Banke, Bardiya, most of southern Nepal:
1 Bigha = 20 Kattha = 400 Dhur = 6772.63 m² (≈72,900 ft²)
1 Kattha = 20 Dhur = 338.63 m² (≈3,645 ft²)
1 Dhur = 16.93 m² (≈182.25 ft²)

Hill (Pahad) system — used in Kathmandu Valley and hill districts:
1 Ropani = 16 Aana = 64 Paisa = 256 Daam = 508.72 m²
1 Aana = 4 Paisa = 31.79 m² (≈342.25 ft²)
1 Paisa = 4 Daam = 7.94 m²
1 Daam = 1.987 m²

Example: "1 Aana to Kattha" → 1 Aana = 31.79 m² → 31.79 ÷ 338.63 = 0.094 Kattha. Show the intermediate m² step, not just the final number.

CONSTRUCTION QUANTITY ESTIMATES — real engineering formulas and standard ratios, safe to state as fact:
- Concrete volume = length × breadth × height/thickness, in m³.
- Brickwork: standard modular brick 0.19m × 0.09m × 0.09m; with a 10mm mortar joint, roughly 500 bricks per m³ (approximate).
- Steel reinforcement: rough planning estimate of 80–120 kg per m³ of concrete for residential RCC (footings lower, beams/columns higher) — always call this a rough planning figure, not a substitute for structural design.
- Plaster/paint area = wall surface area (length × height) minus openings if given.
Always call quantity estimates "approximate" — final quantities depend on actual structural design.

WHAT YOU CANNOT DO — MATERIAL PRICES AND COST ESTIMATES:
You do NOT have current market prices for cement, steel, bricks, sand, labor, or any material — these change too often and vary by supplier/location. NEVER invent or guess a price, a rate per bag, a rate per sqft, or a total construction cost, even if pressed. This is a hard rule. If asked for pricing: say plainly you don't have live rates and don't want to give a number that might be wrong, then offer to have the team quote based on current rates — using send_inquiry to pass along everything already discussed (dimensions, quantities, project type) so the customer doesn't repeat themselves.

PROJECT BRIEF / QUOTATION ASSISTANT:
When a customer wants to start a project or get a quote, don't just grab a name and fire off a vague message. Build a proper project brief by naturally asking (one or two questions at a time, conversationally, not as an interrogation form) for whichever of these you don't already have:
- Location (district/municipality)
- Building type (residential/commercial, house/apartment/renovation, etc.)
- Number of floors/storeys
- Approximate plot or built-up area
- Which service(s) they need (design only, design + construction, consultancy, estimation, etc.)
You don't need every field before proceeding — if a customer clearly doesn't want to give details, work with what you have. Once you have a name and one contact method (email or phone) plus whatever project details you've gathered, call send_inquiry with the project brief clearly organized in the message field (e.g. "Location: X | Type: 2-storey residential | Area: ~1200 sqft | Services: design + construction").

SENDING AN INQUIRY TO THE COMPANY (send_inquiry):
This is a real action, not just conversation — it actually emails the team. Use it once you have a name and at least one contact method. Confirm to the customer afterward that it's been sent, and mention the team responds within 24 hours (Sunday–Friday). Never claim you sent something without actually calling the function.

KEEPING THE COMPANY INFORMED (log_conversation):
Separately, call this ONCE near the end of a conversation that involved genuine project substance — dimensions, land size, a specific service interest, calculations you performed — even if the customer never explicitly asked to be contacted. Include a short summary and any contact hint mentioned. Do this quietly — don't announce it. Skip it for casual questions with no real follow-through.

READING INTENT (do this silently, don't narrate it):
Every message has a shape — recognize it and let it guide your response, without ever saying "I detect you're asking about X":
- Technical/educational question → teach it properly (Engineering Expert Mode above).
- Company info question (services, coverage, contact, hours) → answer directly from the knowledge base above.
- Project/quotation intent → shift into the Project Brief flow above.
- Academy/course interest → focus on the relevant course details and next step (contact for enrollment info).
- General/casual → short, friendly, no need to steer toward a sale.
A single message can blend more than one of these — respond to what's actually being asked, not a rigid category.

HOW TO TALK (this matters more than the facts):
- Write like you're typing a quick reply, not drafting a press release. Contractions are fine. Short sentences are fine.
- Vary your structure. Most answers should be a short paragraph or two — save lists for genuine breakdowns, comparisons, or calculation steps.
- Never open with "I'd be happy to help you with that!" or "Great question!". Never say "As an AI...". You're Artisan AI — own it.
- If you don't know something outside the facts above, say so plainly and point to a real person.
- It's fine to ask a short clarifying question back before answering — a real person would too.

RULES:
- Never invent prices, rates, timelines, staff names, certifications, specific past projects, or capabilities not listed above.
- Stay on topic — if asked something unrelated to Artisan's work or general engineering, redirect briefly and naturally.
- Keep most answers to 2–5 sentences unless the question genuinely needs more — calculations, technical explanations, and project briefs are the exceptions.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'send_inquiry',
      description: "Send a customer's project inquiry to Artisan Engineering's team by email. Only call this once you have at least the customer's name and one contact method (email or phone).",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: "Customer's name" },
          email: { type: 'string', description: "Customer's email address, if given" },
          phone: { type: 'string', description: "Customer's phone number, if given" },
          message: { type: 'string', description: 'Summary of what the customer needs (project type, size, location, etc.)' },
        },
        required: ['name', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_conversation',
      description: 'Quietly notify the Artisan Engineering team about a substantive project-related conversation, even when the customer has not explicitly asked to be contacted. Call at most once per topic, near the end of the discussion.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'A 2-4 sentence summary of what the customer discussed or asked about' },
          contact_hint: { type: 'string', description: 'Any name, email, or phone the customer mentioned, even partial -- or "not provided" if none' },
        },
        required: ['summary'],
      },
    },
  },
];

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Actually sends the inquiry email via FormSubmit's AJAX endpoint — the same
// service and same inbox your contact form already delivers to.
async function sendInquiryEmail(args) {
  const name = String(args?.name || '').slice(0, 120).trim();
  const email = isValidEmail(args?.email) ? args.email.slice(0, 200) : '';
  const phone = String(args?.phone || '').slice(0, 40).trim();
  const message = String(args?.message || '').slice(0, 1500).trim();

  if (!name || !message || (!email && !phone)) {
    return { ok: false, reason: 'Missing required details (need name, message, and email or phone).' };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(FORMSUBMIT_AJAX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        _subject: 'New enquiry from Artisan AI chat',
        Name: name,
        Email: email || 'Not provided — see phone',
        Phone: phone || 'Not provided',
        Message: message,
        Source: 'Artisan AI website chat widget',
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error('FormSubmit AJAX error:', res.status, await res.text());
      return { ok: false, reason: 'Email service returned an error.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('sendInquiryEmail failed:', err);
    return { ok: false, reason: 'Network error while sending.' };
  }
}

// Quiet background notification for the company — a real conversation happened
// even though the customer never explicitly asked to be contacted. Uses the
// same inbox and service as sendInquiryEmail, just a different subject/shape
// so the company can tell the two apart at a glance in their inbox.
async function logConversationEmail(args) {
  const summary = String(args?.summary || '').slice(0, 1000).trim();
  const contactHint = String(args?.contact_hint || 'not provided').slice(0, 200).trim();

  if (!summary) {
    return { ok: false, reason: 'Missing summary.' };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(FORMSUBMIT_AJAX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        _subject: 'Artisan AI — conversation log (no direct inquiry sent)',
        Summary: summary,
        'Contact hint': contactHint,
        Source: 'Artisan AI website chat widget — background log',
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error('FormSubmit AJAX error (log_conversation):', res.status, await res.text());
      return { ok: false, reason: 'Email service returned an error.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('logConversationEmail failed:', err);
    return { ok: false, reason: 'Network error while sending.' };
  }
}

// Calls one OpenAI-compatible provider (Groq, OpenRouter, or Nvidia NIM — they
// all take the same request/response shape). Returns a normalized result so
// the router below doesn't need to know which provider it just tried.
async function callOpenAICompatible(provider, messages, tools, deadline) {
  const remaining = deadline - Date.now();
  if (remaining < 1200) return { ok: false, providerName: provider.name }; // not enough time left to bother
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(7000, remaining));
  let response;
  try {
    response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env[provider.envKey]}`,
        ...provider.extraHeaders,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model,
        messages,
        tools,
        temperature: 0.8,
        max_completion_tokens: 500,
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    console.error(`[${provider.name}] request failed:`, err);
    return { ok: false, providerName: provider.name };
  }
  clearTimeout(timer);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[${provider.name}] API error:`, response.status, errText);
    return { ok: false, providerName: provider.name };
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice) {
    console.error(`[${provider.name}] returned no choices:`, JSON.stringify(data));
    return { ok: false, providerName: provider.name };
  }
  return { ok: true, providerName: provider.name, message: choice.message };
}

// Gemini's REST API uses a different shape entirely (system_instruction,
// contents[] with role user/model, parts[].text) — kept separate rather than
// forced into the OpenAI-compatible caller above. Used as a text-only LAST
// RESORT: no tool-calling here. Translating function-calling into Gemini's
// different tool-call format would add real complexity for a provider that's
// only ever reached when three other providers have already failed — better
// to degrade gracefully to plain conversation than risk a fragile edge case
// nobody can test regularly. If Gemini is the one answering, the system
// prompt's instruction to use send_inquiry simply won't fire that turn; the
// AI still has the contact phone/WhatsApp/email in its knowledge base to give
// the customer directly instead.
async function callGemini(messages, deadline) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, providerName: 'gemini' };

  const remaining = deadline - Date.now();
  if (remaining < 1200) return { ok: false, providerName: 'gemini' };

  const systemMsg = messages.find(m => m.role === 'system');
  const conversationMsgs = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  const contents = conversationMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(7000, remaining));
  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemMsg?.content || '' }] },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
        }),
      }
    );
  } catch (err) {
    clearTimeout(timer);
    console.error('[gemini] request failed:', err);
    return { ok: false, providerName: 'gemini' };
  }
  clearTimeout(timer);

  if (!response.ok) {
    console.error('[gemini] API error:', response.status, await response.text());
    return { ok: false, providerName: 'gemini' };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error('[gemini] returned no usable text:', JSON.stringify(data));
    return { ok: false, providerName: 'gemini' };
  }
  return { ok: true, providerName: 'gemini', message: { role: 'assistant', content: text } };
}

// The router: tries each provider in priority order and uses the first one
// that responds successfully. A provider missing its API key is skipped
// silently (not an error — just not configured yet). Once a provider answers
// successfully within a request, subsequent tool-calling rounds in that same
// request re-try providers from the top again — cheap, since a provider that
// just worked will almost always work again immediately after.
async function routeToAI(messages, tools, deadline) {
  for (const provider of OPENAI_COMPATIBLE_PROVIDERS) {
    if (Date.now() >= deadline) break; // out of time — stop trying, fail cleanly below
    if (!process.env[provider.envKey]) continue; // not configured — skip, don't fail
    const result = await callOpenAICompatible(provider, messages, tools, deadline);
    if (result.ok) return result;
  }
  // Last resort — Gemini, text-only, no tools.
  if (Date.now() < deadline && process.env.GEMINI_API_KEY) {
    const result = await callGemini(messages, deadline);
    if (result.ok) return result;
  }
  return { ok: false, providerName: null };
}

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
  const hasAnyProvider =
    process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY ||
    process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY;
  if (!hasAnyProvider) {
    console.error('No AI provider API key is set in the environment (need at least one of GROQ_API_KEY, OPENROUTER_API_KEY, NVIDIA_API_KEY, GEMINI_API_KEY).');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];
  let conversation = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmedHistory.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000),
    })),
    { role: 'user', content: message },
  ];

  // Bounded tool-calling loop — handles the AI calling one tool, then
  // deciding to call another before giving a final text reply (e.g. logging
  // the conversation, then also sending an inquiry). A fixed two-pass version
  // would incorrectly error out if a second round of tool calls happened.
  // Capped at 4 rounds so a misbehaving model can't loop forever.
  // One shared time budget for the WHOLE request, no matter how many
  // providers get tried or how many tool-calling rounds happen. This is the
  // correct fix for multi-provider-times-multi-round timing — bounding each
  // individual number separately breaks again the moment anything changes
  // (a provider added, a timeout tweaked). 50s leaves real margin under the
  // 60s ceiling in vercel.json for response serialization and overhead.
  const deadline = Date.now() + 50000;

  const MAX_TOOL_ROUNDS = 3;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (Date.now() >= deadline) {
      console.error('Time budget exhausted before completing the request.');
      return res.status(502).json({ error: 'Upstream API error' });
    }
    const result = await routeToAI(conversation, TOOLS, deadline);
    if (!result.ok) return res.status(502).json({ error: 'Upstream API error' });

    const toolCalls = result.message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      const reply = result.message?.content;
      if (!reply) return res.status(502).json({ error: 'Empty response from model' });
      return res.status(200).json({ reply: reply.trim() });
    }

    // Execute every requested tool call for real, in parallel, then feed the
    // results back so the model can either respond or call another tool.
    const toolResultMessages = await Promise.all(toolCalls.map(async (call) => {
      let args = {};
      try { args = JSON.parse(call.function?.arguments || '{}'); } catch { /* leave empty */ }

      let toolResult;
      if (call.function?.name === 'send_inquiry') {
        toolResult = await sendInquiryEmail(args);
      } else if (call.function?.name === 'log_conversation') {
        toolResult = await logConversationEmail(args);
      } else {
        toolResult = { ok: false, reason: 'Unknown tool' };
      }

      return {
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      };
    }));

    conversation = [...conversation, result.message, ...toolResultMessages];
  }

  // Exhausted the round cap without a final text reply — fail safely rather
  // than looping forever or returning nothing.
  console.error('Tool-call loop exceeded max rounds without a final reply.');
  return res.status(502).json({ error: 'Assistant could not complete the request' });
};
