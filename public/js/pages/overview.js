// ===== Color Maps =====
const categoryColors = {
  'UX': '#00695c',
  'Communication': '#1565c0',
  'Engineering': '#c62828',
  'Feature': '#e65100',
};

const sourceIcons = {
  'Interview': 'record_voice_over',
  'Survey': 'assignment',
  'Support': 'headset_mic',
  'Email': 'email',
  'Chat': 'chat_bubble_outline',
};

// ===== Load Data from API (fallback to globals) =====
async function loadOverview() {
  let feedbackData, themesData;

  try {
    const feedbackRes = await API.getFeedback({ limit: 1000 });
    feedbackData = feedbackRes.items;
    themesData = await API.getThemes();
  } catch (e) {
    feedbackData = typeof FEEDBACK !== 'undefined' ? FEEDBACK : [];
    themesData = typeof THEMES !== 'undefined' ? THEMES : [];
  }

  renderMetrics(feedbackData);
  renderTopThemes(feedbackData, themesData);
  renderRecentActivity(feedbackData, themesData);
  renderStatusBreakdown(feedbackData);
  renderCategoryBreakdown(feedbackData);
  document.getElementById('total-count').textContent = feedbackData.length + ' total feedback items';
}

function renderMetrics(feedback) {
  const totalFeedback = feedback.length;
  const newCount = feedback.filter(f => f.status === 'New').length;
  const inProgressCount = feedback.filter(f => f.status === 'In Progress').length;
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
  const themesWithCount = themes.map(t => ({
    ...t,
    mentions: t.mentions !== undefined ? t.mentions : feedback.filter(f => f.themeId === t.id).length,
  })).sort((a, b) => b.mentions - a.mentions);

  const top10 = themesWithCount
    .filter(t => (t.status || '').toLowerCase() !== 'archived')
    .slice(0, 10);
  const total = top10.reduce((sum, t) => sum + t.mentions, 0) || 1;

  document.getElementById('top-themes-list').innerHTML = top10.map((t, i) => {
    const color = categoryColors[t.category] || '#9e9e9e';
    const pct = ((t.mentions / total) * 100).toFixed(0);
    const barWidth = ((t.mentions / (top10[0]?.mentions || 1)) * 100).toFixed(1);

    return `
      <div class="theme-dist-row">
        <div class="theme-dist-left">
          <span class="theme-dist-rank">${i + 1}</span>
          <span class="theme-dist-dot" style="background:${color}"></span>
          <span class="theme-dist-name" title="${t.name}">${t.name}</span>
          <span class="theme-dist-cat" style="color:${color}">${t.category}</span>
        </div>
        <div class="theme-dist-right">
          <div class="theme-dist-bar-track">
            <div class="theme-dist-bar-fill" style="width:${barWidth}%; background:${color}"></div>
          </div>
          <span class="theme-dist-pct">${pct}%</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentActivity(feedback, themes) {
  const themeMap = {};
  (themes || []).forEach(t => { themeMap[t.id] = t.name; });

  const recent = [...feedback]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const now = new Date();

  document.getElementById('recent-activity').innerHTML = recent.map(f => {
    const d = new Date(f.date);
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    let timeStr;
    if (diffDays === 0) timeStr = 'Today';
    else if (diffDays === 1) timeStr = 'Yesterday';
    else if (diffDays < 7) timeStr = diffDays + 'd ago';
    else timeStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const themeName = f.themeId && themeMap[f.themeId] ? themeMap[f.themeId] : null;
    const icon = sourceIcons[f.source] || 'feedback';
    const color = categoryColors[f.category] || '#9e9e9e';
    const initials = (f.client || f.source || '?').slice(0, 2).toUpperCase();

    return `
      <div class="activity-item">
        <div class="activity-avatar" style="background:${color}20; color:${color}">
          <span class="material-icons-outlined">${icon}</span>
        </div>
        <div class="activity-body">
          <div class="activity-line">
            <span class="activity-client">${f.client || f.source}</span>
            <span class="activity-verb">submitted feedback</span>
            ${themeName ? `<span class="activity-theme" style="color:${color}">${themeName}</span>` : ''}
            <span class="activity-badge badge ${statusClass(f.status)}">${f.status}</span>
          </div>
          <div class="activity-quote">"${f.quote}"</div>
          <div class="activity-meta">
            <span class="material-icons-outlined" style="font-size:11px">schedule</span>
            ${timeStr} &middot; ${f.source}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStatusBreakdown(feedback) {
  // API returns lowercase derived statuses: 'new', 'ongoing', 'archived'
  // Mock data fallback uses: 'New', 'In Review', 'Assigned', 'In Progress', 'Resolved'
  // Normalize both to the 3-bucket model
  function normalizeStatus(s) {
    const v = (s || '').toLowerCase();
    if (v === 'new') return 'New';
    if (v === 'ongoing' || v === 'in progress' || v === 'in review' || v === 'assigned') return 'Ongoing';
    if (v === 'archived' || v === 'resolved') return 'Archived';
    return 'New';
  }

  const statusColors = { 'New': '#1565c0', 'Ongoing': '#00695c', 'Archived': '#757575' };
  const statuses = ['New', 'Ongoing', 'Archived'];
  const statusCounts = statuses.map(s => ({
    label: s,
    count: feedback.filter(f => normalizeStatus(f.status) === s).length,
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

// ===== Init =====
loadOverview();
