const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function analyzeFeedback(rawItems) {
  const anthropic = getClient();

  // Process in batches of 10 to avoid token limits
  const batchSize = 10;
  const allResults = [];

  for (let i = 0; i < rawItems.length; i += batchSize) {
    const batch = rawItems.slice(i, i + batchSize);
    const numbered = batch.map((text, idx) => `[${i + idx + 1}] ${text}`).join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a client feedback analyst. Analyze these raw customer feedback items and return structured data.

For each feedback item, determine:
1. ORIGINAL_QUOTE: the raw text as provided
2. TRANSLATION: If not in English, translate to English. If already English, leave as empty string.
3. CATEGORY: Classify into exactly one: UX, Performance, Navigation, Business, Accessibility, Data
4. DEPARTMENT: Which team should own this: Product, Engineering, Design, CX
5. SENTIMENT: Negative, Neutral, or Positive
6. PRIORITY: High (blocking/critical), Medium (important), Low (nice-to-have)
7. THEMATIC_CODE: A short uppercase code like SEARCH-REL or PAY-FAIL
8. ANALYSIS: 1-2 sentences of expert interpretation — why this matters and what it implies
9. SUGGESTED_THEME: A 2-4 word theme name this belongs to (e.g., "Search & Filtering")

Return ONLY a valid JSON array. Be consistent with theme naming across items.

Feedback items:
${numbered}`
      }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      allResults.push(...parsed);
    }
  }

  return allResults;
}

async function synthesizeThemes(suggestedThemes, existingThemes) {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are a feedback theme analyst. Given suggested theme names from new feedback and existing themes, merge and deduplicate into coherent themes.

Existing themes:
${existingThemes.map(t => `- "${t.name}" (${t.category}): ${t.description}`).join('\n')}

Suggested themes from new feedback:
${suggestedThemes.map((t, i) => `[${i}] "${t}"`).join('\n')}

For each suggested theme, either:
1. Map it to an existing theme by ID, OR
2. Create a new theme

Return ONLY valid JSON:
{
  "mappings": [
    { "index": 0, "existing_theme_id": "t1" },
    { "index": 1, "new_theme": { "name": "Theme Name", "category": "UX", "description": "Brief description" } }
  ]
}

Categories: UX, Performance, Navigation, Business, Accessibility, Data`
    }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { mappings: [] };
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
    "owner": "Product|Engineering|Design|CX"
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
