// ===== State =====
let activeCategory = '';
let sortMode = 'mentions-desc';
let allThemes = [];
let allFeedback = [];

// ===== DOM =====
const filterPills = document.getElementById('filter-pills');
const sortSelect = document.getElementById('sort-select');
const themeCards = document.getElementById('theme-cards');
const themeSubtitle = document.getElementById('theme-subtitle');
const dialogOverlay = document.getElementById('dialog-overlay');
const dialogBody = document.getElementById('dialog-body');
const dialogTitle = document.getElementById('dialog-title');
const dialogClose = document.getElementById('dialog-close');

// ===== Load Data =====
async function loadData() {
  try {
    const [themes, feedbackRes] = await Promise.all([
      API.getThemes(),
      API.getFeedback({ limit: 5000 }),
    ]);
    allThemes = themes;
    allFeedback = feedbackRes.items;
  } catch (e) {
    allThemes = typeof THEMES !== 'undefined' ? THEMES : [];
    allFeedback = (typeof FEEDBACK !== 'undefined' ? FEEDBACK : []).map(f => ({
      ...f, themeName: allThemes.find(t => t.id === f.themeId)?.name || 'Unknown'
    }));
  }
  document.getElementById('total-count').textContent = allFeedback.length + ' total feedback items';
  buildPills();
  render();
}

// ===== Helpers =====
function getMentions(themeId) {
  return allFeedback.filter(f => f.themeId === themeId).length;
}

function getThemeStatus(themeId) {
  const items = allFeedback.filter(f => f.themeId === themeId);
  if (!items.length) return 'New';
  const priority = ['In Progress', 'Assigned', 'In Review', 'New', 'Resolved'];
  for (const s of priority) {
    if (items.some(f => f.status === s)) return s;
  }
  return 'New';
}

// formatDate, statusClass, categoryClass, trendArrow, trendLabel come from utils.js

// ===== Build Filter Pills =====
function buildPills() {
  const categories = ['', 'UX', 'Performance', 'Navigation', 'Business', 'Accessibility', 'Data'];
  const labels = ['All Themes', 'UX Issues', 'Performance', 'Navigation', 'Business', 'Accessibility', 'Data'];
  filterPills.innerHTML = categories.map((cat, i) => `
    <button class="filter-pill ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">${labels[i]}</button>
  `).join('');
}

// ===== Get sorted/filtered themes =====
function getThemes() {
  let list = allThemes.map(t => ({
    ...t,
    mentions: t.mentions !== undefined ? t.mentions : getMentions(t.id),
    feedbackStatus: getThemeStatus(t.id),
  }));

  if (activeCategory) {
    list = list.filter(t => t.category === activeCategory);
  }

  switch (sortMode) {
    case 'mentions-desc': list.sort((a, b) => b.mentions - a.mentions); break;
    case 'mentions-asc': list.sort((a, b) => a.mentions - b.mentions); break;
    case 'name-asc': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'name-desc': list.sort((a, b) => b.name.localeCompare(a.name)); break;
    case 'trend': list.sort((a, b) => { const o = { Up: 0, Stable: 1, Down: 2 }; return (o[a.trend] ?? 1) - (o[b.trend] ?? 1); }); break;
  }

  return list;
}

// ===== Render =====
function render() {
  const themes = getThemes();
  themeSubtitle.textContent = themes.length + ' themes identified across all feedback';

  themeCards.innerHTML = themes.map(t => `
    <div class="theme-card" data-id="${t.id}">
      <div class="theme-card-top">
        <div class="theme-card-info">
          <div class="theme-card-name">${t.name}</div>
          <div class="theme-card-desc">${t.description}</div>
        </div>
        <div class="theme-card-count">
          ${trendArrow(t.trend)}
          <span class="count-number">${t.mentions}</span>
        </div>
      </div>
      <div class="theme-card-divider"></div>
      <div class="theme-card-bottom">
        <div class="theme-card-tags">
          <span class="tag-category ${categoryClass(t.category)}">${t.category.toUpperCase()}</span>
          <span class="badge ${statusClass(t.feedbackStatus)}">${t.feedbackStatus}</span>
          <span class="theme-card-feedback-count">${t.mentions} feedback items</span>
        </div>
        <button class="theme-card-btn" data-id="${t.id}">View Details</button>
      </div>
    </div>
  `).join('');
}

// ===== Detail Dialog =====
function openDetail(themeId) {
  const theme = allThemes.find(t => t.id === themeId);
  if (!theme) return;

  const mentions = theme.mentions !== undefined ? theme.mentions : getMentions(themeId);
  const feedbackItems = allFeedback.filter(f => f.themeId === themeId).sort((a, b) => b.date.localeCompare(a.date));
  const status = getThemeStatus(themeId);

  dialogTitle.textContent = theme.name;

  dialogBody.innerHTML = `
    <div class="detail-section">
      <div class="detail-label">Description</div>
      <div style="font-size:14px; color:var(--text-primary); line-height:1.6; margin-top:4px;">${theme.description}</div>
    </div>

    <div class="detail-metrics-bar">
      <div class="detail-metric">
        <div class="detail-metric-value">${mentions}</div>
        <div class="detail-metric-label">Total Mentions</div>
      </div>
      <div class="detail-metric">
        <div class="detail-metric-value">${feedbackItems.length}</div>
        <div class="detail-metric-label">Feedback Items</div>
      </div>
      <div class="detail-metric">
        <div class="detail-metric-value">${trendArrow(theme.trend)} ${trendLabel(theme.trend)}</div>
        <div class="detail-metric-label">Trend</div>
      </div>
    </div>

    <div class="linked-feedback-title">All Linked Feedback</div>
    ${feedbackItems.map(f => `
      <div class="linked-feedback-item">
        <div class="linked-feedback-meta">
          <span>${formatDate(f.date)}</span>
          <span class="dot">&middot;</span>
          <span>${f.source}</span>
          <span class="dot">&middot;</span>
          <span class="tag-category ${categoryClass(f.category)}">${f.category.toUpperCase()}</span>
          <span class="dot">&middot;</span>
          <span class="badge ${statusClass(f.status)}">${f.status}</span>
          ${f.translation ? '<span class="dot">&middot;</span><span class="badge" style="background:#e3f2fd;color:#1565c0;font-size:10px;">Translated</span>' : ''}
        </div>
        <div class="linked-feedback-quote">${f.translation || f.quote}</div>
      </div>
    `).join('')}

    <div class="detail-actions-bar">
      <button class="btn-primary">Create New Action</button>
      <button class="btn-outline">View Related Themes</button>
      <button class="btn-outline">Export Data</button>
    </div>
  `;

  dialogOverlay.classList.add('open');
}

function closeDetail() {
  dialogOverlay.classList.remove('open');
}

// ===== Events =====
filterPills.addEventListener('click', (e) => {
  const pill = e.target.closest('.filter-pill');
  if (!pill) return;
  activeCategory = pill.dataset.category;
  buildPills();
  render();
});

sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  render();
});

themeCards.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-card-btn');
  if (btn) {
    openDetail(btn.dataset.id);
    return;
  }
  const card = e.target.closest('.theme-card');
  if (card) openDetail(card.dataset.id);
});

dialogClose.addEventListener('click', closeDetail);
dialogOverlay.addEventListener('click', (e) => {
  if (e.target === dialogOverlay) closeDetail();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDetail();
});

// ===== Init =====
loadData();
