// ===== Color Maps =====
const categoryColors = {
  'UX': '#00695c',
  'Performance': '#c62828',
  'Navigation': '#1565c0',
  'Business': '#e65100',
  'Accessibility': '#6a1b9a',
  'Data': '#00838f',
};

// ===== Load Data from API (fallback to globals) =====
async function loadOverview() {
  let feedbackData, themesData;

  try {
    const feedbackRes = await API.getFeedback({ limit: 1000 });
    feedbackData = feedbackRes.items;
    themesData = await API.getThemes();
  } catch (e) {
    // Fallback to globals if API unavailable
    feedbackData = typeof FEEDBACK !== 'undefined' ? FEEDBACK : [];
    themesData = typeof THEMES !== 'undefined' ? THEMES : [];
  }

  renderMetrics(feedbackData);
  renderTopThemes(feedbackData, themesData);
  renderStatusBreakdown(feedbackData);
  renderCategoryBreakdown(feedbackData);
  renderRecentFeedback(feedbackData);
  document.getElementById('total-count').textContent = feedbackData.length + ' total feedback items';
}

function renderMetrics(feedback) {
  const totalFeedback = feedback.length;
  const newCount = feedback.filter(f => f.status === 'New').length;
  const inProgressCount = feedback.filter(f => f.status === 'In Progress').length;
  // themes count from unique themeIds
  const activeThemeIds = new Set(feedback.map(f => f.themeId).filter(Boolean));

  document.getElementById('metrics-row').innerHTML = [
    { value: totalFeedback, label: 'Total Feedback', icon: 'chat_bubble_outline', color: 'teal' },
    { value: newCount, label: 'New This Week', icon: 'fiber_new', color: 'blue' },
    { value: inProgressCount, label: 'In Progress', icon: 'autorenew', color: 'amber' },
    { value: activeThemeIds.size, label: 'Active Themes', icon: 'label_outline', color: 'green' },
  ].map(m => `
    <div class="metric-card">
      <div class="metric-icon ${m.color}">
        <span class="material-icons-outlined">${m.icon}</span>
      </div>
      <div class="metric-text">
        <div class="metric-value">${m.value}</div>
        <div class="metric-label">${m.label}</div>
      </div>
    </div>
  `).join('');
}

function renderTopThemes(feedback, themes) {
  // If themes come from API, they already have mentions
  const themesWithCount = themes.map(t => ({
    ...t,
    mentions: t.mentions !== undefined ? t.mentions : feedback.filter(f => f.themeId === t.id).length,
  })).sort((a, b) => b.mentions - a.mentions);

  const top10 = themesWithCount.slice(0, 10);
  const maxMentions = top10[0]?.mentions || 1;

  function themeStatusBadge(themeId) {
    const items = feedback.filter(f => f.themeId === themeId);
    if (!items.length) return '<span class="badge badge-status-new">New</span>';
    const priority = ['In Progress', 'Assigned', 'In Review', 'New', 'Resolved'];
    for (const s of priority) {
      if (items.some(f => f.status === s)) {
        return `<span class="badge badge-status-${s.toLowerCase().replace(/\s+/g, '-')}">${s}</span>`;
      }
    }
    return '';
  }

  document.getElementById('top-themes-list').innerHTML = top10.map((t) => `
    <div class="theme-item">
      <div class="theme-row">
        <div class="theme-label">${t.name}</div>
        <div class="theme-bar-area">
          <div class="theme-bar-container">
            <div class="theme-bar-fill" style="width: ${(t.mentions / maxMentions * 100).toFixed(1)}%; background: ${categoryColors[t.category] || '#9e9e9e'}"></div>
          </div>
          <div class="theme-count">${t.mentions}</div>
        </div>
        <div class="theme-status">${themeStatusBadge(t.id)}</div>
      </div>
    </div>
  `).join('');
}

function renderStatusBreakdown(feedback) {
  const statusColors = {
    'New': '#1565c0', 'In Review': '#6a1b9a', 'Assigned': '#e65100',
    'In Progress': '#00695c', 'Resolved': '#2e7d32',
  };
  const statuses = ['New', 'In Review', 'Assigned', 'In Progress', 'Resolved'];
  const statusCounts = statuses.map(s => ({
    label: s,
    count: feedback.filter(f => f.status === s).length,
    color: statusColors[s],
  }));
  const max = Math.max(...statusCounts.map(s => s.count), 1);

  document.getElementById('status-breakdown').innerHTML = statusCounts.map(s => `
    <div class="breakdown-row">
      <div class="breakdown-left">
        <div class="breakdown-dot" style="background: ${s.color}"></div>
        <div class="breakdown-label">${s.label}</div>
      </div>
      <div class="breakdown-right">
        <div class="breakdown-bar">
          <div class="breakdown-bar-fill" style="width: ${(s.count / max * 100).toFixed(1)}%; background: ${s.color}"></div>
        </div>
        <div class="breakdown-count">${s.count}</div>
      </div>
    </div>
  `).join('');
}

function renderCategoryBreakdown(feedback) {
  const categories = Object.keys(categoryColors);
  const categoryCounts = categories.map(c => ({
    label: c,
    count: feedback.filter(f => f.category === c).length,
    color: categoryColors[c],
  })).sort((a, b) => b.count - a.count);
  const max = Math.max(...categoryCounts.map(c => c.count), 1);

  document.getElementById('category-breakdown').innerHTML = categoryCounts.map(c => `
    <div class="breakdown-row">
      <div class="breakdown-left">
        <div class="breakdown-dot" style="background: ${c.color}"></div>
        <div class="breakdown-label">${c.label}</div>
      </div>
      <div class="breakdown-right">
        <div class="breakdown-bar">
          <div class="breakdown-bar-fill" style="width: ${(c.count / max * 100).toFixed(1)}%; background: ${c.color}"></div>
        </div>
        <div class="breakdown-count">${c.count}</div>
      </div>
    </div>
  `).join('');
}

function renderRecentFeedback(feedback) {
  const recent = [...feedback].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  document.getElementById('recent-feedback').innerHTML = recent.map(f => {
    const d = new Date(f.date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `
      <div class="recent-item">
        <div class="recent-meta">
          <span>${dateStr}</span>
          <span>&middot;</span>
          <span>${f.source}</span>
          <span>&middot;</span>
          <span class="badge ${statusClass(f.status)}">${f.status}</span>
        </div>
        <div class="recent-quote">"${f.quote}"</div>
      </div>
    `;
  }).join('');
}

// ===== Init =====
loadOverview();
