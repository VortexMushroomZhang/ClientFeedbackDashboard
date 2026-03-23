// ===== Shared Utility Helpers =====
// Loaded before page JS files. All functions are globals (no ES modules).

/**
 * Format a date string as "Mon DD, YYYY" (e.g. "Feb 12, 2026")
 * Used in: feedback.js, themes.js
 */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Return the CSS class suffix for a feedback status badge.
 * e.g. "In Progress" → "badge-status-in-progress"
 * Used in: feedback.js, themes.js
 */
function statusClass(status) {
  return 'badge-status-' + status.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Return the CSS class suffix for a sentiment badge.
 * e.g. "Negative" → "badge-sentiment-negative"
 * Used in: feedback.js
 */
function sentimentClass(sentiment) {
  return 'badge-sentiment-' + sentiment.toLowerCase();
}

/**
 * Return the CSS class suffix for a category tag.
 * e.g. "UX" → "tag-ux"
 * Used in: feedback.js, themes.js
 */
function categoryClass(category) {
  return 'tag-' + category.toLowerCase();
}

/**
 * Return HTML for a trend arrow span.
 * Used in: actions.js, themes.js
 */
function trendArrow(trend) {
  if (trend === 'Up') return '<span class="trend-arrow up">&#8599;</span>';
  if (trend === 'Down') return '<span class="trend-arrow down">&#8600;</span>';
  return '<span class="trend-arrow stable">&#8594;</span>';
}

/**
 * Return HTML for a trend label (used in themes detail dialog).
 * Used in: themes.js
 */
function trendLabel(trend) {
  if (trend === 'Up') return 'Increasing';
  if (trend === 'Down') return 'Decreasing';
  return 'Stable';
}
