const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Robustly extract a JSON array from Claude's response.
// If the array is truncated (token limit), salvage all complete objects.
function extractJsonArray(text) {
  // First try clean parse
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      // Fall through to salvage mode
    }
  }

  // Salvage mode: extract complete {...} objects one by one
  const results = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          results.push(JSON.parse(text.slice(start, i + 1)));
        } catch (_) { /* skip malformed object */ }
        start = -1;
      }
    }
  }
  return results;
}

async function analyzeFeedback(rawItems) {
  const anthropic = getClient();

  // Process in batches of 5 — smaller batches reduce token pressure and JSON truncation risk
  const batchSize = 5;
  const allResults = [];

  for (let i = 0; i < rawItems.length; i += batchSize) {
    const batch = rawItems.slice(i, i + batchSize);
    const numbered = batch.map((text, idx) => `[${i + idx + 1}] ${text}`).join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8096,
      messages: [{
        role: 'user',
        content: `You are a senior product analyst at a mobile banking and investment app (similar to a Dutch retail bank offering savings, payments, and stock portfolio features). Analyze these raw customer feedback items and return structured data.

## Product context
The app lets users: view bank account balances and transactions, make payments, manage a stock/ETF investment portfolio, track performance, receive notifications for payments and portfolio events, and contact customer support. Clients are retail investors and everyday banking customers, often Dutch-speaking.

## Categories and Department Routing

Classify each item into exactly one CATEGORY, then apply the routing rules below:

**UX** — Interface, usability, navigation, layout, flows, accessibility
  Examples: "I can't find the payment history", "the logout button is hidden", "the overview screen is confusing"
  - Problem is clear, solution obvious → DEPARTMENT: "Design", SUB_TYPE: "Clear solution"
  - Problem is vague, needs research → DEPARTMENT: "Research", SUB_TYPE: "Unclear issue"

**Communication** — Notifications, messaging clarity, statements, transaction confirmations, pricing transparency, in-app copy
  Examples: "I don't understand what the notification means", "no annual statement was sent", "unclear error messages"
  → DEPARTMENT: "Customer Service", SUB_TYPE: ""

**Engineering** — Bugs, crashes, login failures, data errors, performance problems, sync issues, broken buttons
  Examples: "the app crashes on login", "stock prices are 2 days delayed", "payment button doesn't work", "face ID stopped working"
  → DEPARTMENT: "Engineering", SUB_TYPE: ""

**Feature** — Requests for new or improved capabilities
  Examples: "I want push notifications for deposits", "add a glossary of financial terms", "show average annual return"
  - Improving something that exists → DEPARTMENT: "Product", SUB_TYPE: "Feature improvement"
  - New well-defined capability → DEPARTMENT: "Product", SUB_TYPE: "New feature request"
  - Vague idea needing validation → DEPARTMENT: "Research", SUB_TYPE: "Needs validation"

## Fields to return

1. ORIGINAL_QUOTE: raw text as provided (strip any [Rating: X/5] prefix)
2. TRANSLATION: English translation if not already English; empty string if already English
3. CATEGORY: UX | Communication | Engineering | Feature
4. SUB_TYPE: sub-classification from routing rules, or empty string
5. DEPARTMENT: Design | Research | Customer Service | Engineering | Product
6. SENTIMENT: Negative | Neutral | Positive — use [Rating: X/5] as primary signal if present (1-2=Negative, 3=Neutral, 4-5=Positive), otherwise infer from tone
7. PRIORITY: High (blocking/critical) | Medium (important, affects many users) | Low (nice-to-have)
8. THEMATIC_CODE: short uppercase slug, e.g. AUTH-LOGOUT, PAY-NOTIF, PORT-PERF
9. ANALYSIS: 1-2 sentences — what this reveals about user needs and why it matters for the product
10. SUGGESTED_THEME: 2-4 word cluster name grouping this with similar issues, e.g. "Authentication & Login", "Portfolio Performance", "Payment Notifications"

Return ONLY a valid JSON array. Use consistent SUGGESTED_THEME names across items in the same batch.

Feedback items:
${numbered}`
      }]
    });

    const text = response.content[0].text;
    const parsed = extractJsonArray(text);
    if (parsed.length > 0) allResults.push(...parsed);
  }

  return allResults;
}

async function synthesizeThemes(suggestedThemes, existingThemes) {
  // If too many suggested themes, process in chunks of 20 to avoid token truncation.
  // Each chunk merges into a running set of "resolved themes" passed as existingThemes
  // to the next chunk, so cross-chunk deduplication still works.
  const CHUNK_SIZE = 20;
  if (suggestedThemes.length > CHUNK_SIZE) {
    let resolvedThemes = [...existingThemes];
    const allMappings = [];
    let offset = 0;

    for (let i = 0; i < suggestedThemes.length; i += CHUNK_SIZE) {
      const chunk = suggestedThemes.slice(i, i + CHUNK_SIZE);
      const result = await synthesizeThemes(chunk, resolvedThemes);

      // Re-index mappings to global indices
      for (const m of result.mappings || []) {
        allMappings.push({ ...m, index: m.index + i });
      }

      // Add newly created themes from this chunk into resolvedThemes for next chunk
      const chunkNewThemes = {};
      for (const m of result.mappings || []) {
        if (m.new_theme) {
          const norm = m.new_theme.name.toLowerCase().trim();
          if (!chunkNewThemes[norm]) {
            chunkNewThemes[norm] = { id: '_pending_' + norm, ...m.new_theme };
            resolvedThemes.push(chunkNewThemes[norm]);
          }
        }
      }
    }
    return { mappings: allMappings };
  }

  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a feedback theme analyst. Merge suggested theme names into coherent, deduplicated themes.

CRITICAL RULES:
1. If two suggested themes are the same concept (even slightly different wording), they MUST map to the same theme — do NOT create two separate entries.
2. If a suggested theme closely matches an existing theme by meaning, map it to that existing theme.
3. Never create duplicate theme names. Each unique concept = exactly one theme entry.
4. Use the same "new_theme" entry for multiple indices when they share the same concept.

Existing themes:
${existingThemes.map(t => `- ID:"${t.id}" Name:"${t.name}" (${t.category}): ${t.description}`).join('\n') || '(none yet)'}

Suggested themes from new feedback:
${suggestedThemes.map((t, i) => `[${i}] "${t}"`).join('\n')}

For each index, either:
1. Map to an existing theme using its exact ID, OR
2. Create a new theme — if multiple indices share the same concept, give them the same new_theme name so the system can merge them

Return ONLY valid JSON:
{
  "mappings": [
    { "index": 0, "existing_theme_id": "t_abc123" },
    { "index": 1, "new_theme": { "name": "Theme Name", "category": "UX", "description": "Brief description" } },
    { "index": 2, "new_theme": { "name": "Theme Name", "category": "UX", "description": "Brief description" } }
  ]
}

Categories: UX, Communication, Engineering, Feature`
    }]
  });

  const text = response.content[0].text;

  // Try clean parse first
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (_) { /* fall through to salvage */ }
  }

  // Salvage: extract complete mapping objects from truncated response
  const mappings = extractJsonArray(text.includes('"mappings"') ? text.replace(/^[\s\S]*?"mappings"\s*:\s*\[/, '[') : text);
  return { mappings };
}

async function suggestActions(themes, feedbackItems) {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Based on these feedback themes and items, suggest actionable improvements.

Themes with feedback:
${themes.map(t => `- "${t.name}" (${t.category}, ${t.mentionCount} mentions): ${t.description}`).join('\n')}

Return ONLY valid JSON array:
[
  {
    "title": "Short action title",
    "theme_name": "Matching theme name",
    "priority": "High|Medium|Low",
    "owner": "Design|Research|Customer Service|Engineering|Product"
  }
]

Suggest 1-2 actions per theme. Keep titles concise and actionable.`
    }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return [];
}

module.exports = { analyzeFeedback, synthesizeThemes, suggestActions };
