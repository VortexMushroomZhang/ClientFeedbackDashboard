// ===== State =====
const PAGE_SIZE = 12;
let currentPage = 1;
let sortField = 'date';
let sortDir = 'desc';
let filteredData = [];
let allFeedback = [];
let allThemes = [];
let allActions = [];

// Theme-scoped mode: ?theme=ID
const urlParams = new URLSearchParams(window.location.search);
const scopedThemeId = urlParams.get('theme') || '';

// ===== DOM =====
const tbody           = document.getElementById('feedback-tbody');
const pagination      = document.getElementById('pagination');
const feedbackCount   = document.getElementById('feedback-count');
const searchInput     = document.getElementById('search-input');
const filterSource    = document.getElementById('filter-source');
const filterCategory  = document.getElementById('filter-category');
const filterStatus    = document.getElementById('filter-status');
const filterSentiment = document.getElementById('filter-sentiment');
const filterDepartment= document.getElementById('filter-department');
const clearFiltersBtn = document.getElementById('clear-filters');
const dialogOverlay   = document.getElementById('dialog-overlay');
const dialogBody      = document.getElementById('dialog-body');
const dialogClose     = document.getElementById('dialog-close');

// ===== Load =====
async function loadData() {
  try {
    const [feedbackRes, themes, actionsGroups] = await Promise.all([
      API.getFeedback({ limit: 5000 }),
      API.getThemes(),
      API.getActions(),
    ]);
    allFeedback = feedbackRes.items;
    allThemes = themes;
    allActions = actionsGroups.flatMap(g => g.actions);
  } catch (e) {
    allFeedback = (typeof FEEDBACK !== 'undefined' ? FEEDBACK : []);
    allThemes = typeof THEMES !== 'undefined' ? THEMES : [];
    allActions = typeof ACTIONS !== 'undefined' ? ACTIONS : [];
  }

  // Show theme banner if scoped
  if (scopedThemeId) {
    const theme = allThemes.find(t => t.id === scopedThemeId);
    const themeName = theme ? theme.name : scopedThemeId;
    const banner = document.createElement('div');
    banner.style.cssText = 'display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--border-light);border-radius:var(--radius);padding:10px 16px;margin-bottom:16px;font-size:13px;';
    banner.innerHTML = `
      <span class="material-icons-outlined" style="font-size:16px;color:var(--primary)">label_outline</span>
      <span>Showing feedback for theme: <strong>${themeName}</strong></span>
      <a href="./feedback.html" style="margin-left:auto;font-size:12px;color:var(--text-secondary);">Show All</a>
    `;
    const filtersBar = document.querySelector('.filters-bar');
    filtersBar.parentNode.insertBefore(banner, filtersBar);

    document.getElementById('page-title').textContent = themeName + ' — Feedback';
  }

  applyFilters();
}

// ===== Helpers =====
function getTheme(themeId) {
  return allThemes.find(t => t.id === themeId) || { name: 'Unknown', category: '' };
}

function getActionsForTheme(themeId) {
  return allActions.filter(a => a.themeId === themeId);
}

function hasActiveFilters() {
  return searchInput.value.trim() ||
    filterSource.value || filterCategory.value ||
    filterStatus.value || filterSentiment.value || filterDepartment.value;
}

// ===== Filtering =====
function applyFilters() {
  const search     = searchInput.value.toLowerCase().trim();
  const source     = filterSource.value;
  const category   = filterCategory.value;
  const status     = filterStatus.value;
  const sentiment  = filterSentiment.value;
  const department = filterDepartment.value;

  filteredData = allFeedback.filter(item => {
    if (scopedThemeId && item.themeId !== scopedThemeId) return false;
    if (source     && item.source     !== source)     return false;
    if (category   && item.category   !== category)   return false;
    if (status     && item.status     !== status)     return false;
    if (sentiment  && item.sentiment  !== sentiment)  return false;
    if (department && item.department !== department) return false;
    if (search) {
      const themeName = getTheme(item.themeId).name;
      const haystack = (item.quote + ' ' + themeName + ' ' + item.source + ' ' + item.category).toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  // Toggle clear button
  clearFiltersBtn.style.display = hasActiveFilters() ? '' : 'none';

  applySort();
  currentPage = 1;
  render();
}

// ===== Sorting =====
function applySort() {
  filteredData.sort((a, b) => {
    let va, vb;
    switch (sortField) {
      case 'date':      va = a.date;      vb = b.date;      break;
      case 'source':    va = a.source;    vb = b.source;    break;
      case 'category':  va = a.category;  vb = b.category;  break;
      case 'theme':     va = getTheme(a.themeId).name; vb = getTheme(b.themeId).name; break;
      case 'status':    va = a.status;    vb = b.status;    break;
      case 'sentiment': va = a.sentiment; vb = b.sentiment; break;
      default:          va = a.date;      vb = b.date;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });
}

function handleSort(field) {
  sortDir = (sortField === field && sortDir === 'desc') ? 'asc' : (field === 'date' ? 'desc' : 'asc');
  sortField = field;
  applySort();
  render();
}

// ===== Render =====
function render() {
  renderTable();
  renderPagination();
  feedbackCount.textContent = filteredData.length;
  renderSortIndicators();
  const pageTitle = document.getElementById('page-title');
  if (pageTitle && !scopedThemeId) pageTitle.textContent = 'All Feedback';
}

function renderSortIndicators() {
  document.querySelectorAll('.feedback-table th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === sortField) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredData.slice(start, start + PAGE_SIZE);

  if (page.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <span class="material-icons-outlined">search_off</span>
          <p>No feedback matches your filters.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = page.map(item => {
    const themeName = getTheme(item.themeId).name;
    return `
      <tr data-id="${item.id}">
        <td class="date-cell">${formatDate(item.date)}</td>
        <td>${item.source}</td>
        <td class="quote-cell" title="${item.quote.replace(/"/g, '&quot;')}">"${item.quote}"</td>
        <td class="quote-cell">${item.translation ? '"' + item.translation + '"' : '<span style="color:var(--text-hint)">—</span>'}</td>
        <td><span class="tag-category ${categoryClass(item.category)}">${item.category}</span></td>
        <td>${themeName}</td>
        <td>${item.department}</td>
        <td><span class="badge ${statusClass(item.status)}">${item.status}</span></td>
        <td><span class="badge ${sentimentClass(item.sentiment)}">${item.sentiment}</span></td>
      </tr>`;
  }).join('');
}

function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }

  let html = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&laquo; Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === totalPages - 2) html += '<button disabled>…</button>';
      continue;
    }
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next &raquo;</button>`;
  pagination.innerHTML = html;
}

// ===== Detail Dialog =====
function openDetail(id) {
  const item = allFeedback.find(f => f.id === id);
  if (!item) return;
  const themeName = getTheme(item.themeId).name;
  const actions = getActionsForTheme(item.themeId);

  dialogBody.innerHTML = `
    <div class="detail-section">
      <div class="detail-label">Original Quote</div>
      <div class="detail-quote">${item.quote}</div>
    </div>
    ${item.translation ? `
    <div class="detail-section">
      <div class="detail-label">Translation</div>
      <div class="detail-analysis">${item.translation}</div>
    </div>` : ''}
    <div class="detail-divider"></div>
    <div class="detail-section">
      <div class="detail-label">Information</div>
      <div class="detail-meta-grid">
        <div class="detail-meta-item"><div class="detail-label">Date</div><div class="detail-meta-value">${formatDate(item.date)}</div></div>
        <div class="detail-meta-item"><div class="detail-label">Source</div><div class="detail-meta-value">${item.source}</div></div>
        <div class="detail-meta-item"><div class="detail-label">Category</div><div class="detail-meta-value"><span class="tag-category ${categoryClass(item.category)}">${item.category}</span></div></div>
        <div class="detail-meta-item"><div class="detail-label">Theme</div><div class="detail-meta-value">${themeName}</div></div>
        <div class="detail-meta-item"><div class="detail-label">Department</div><div class="detail-meta-value">${item.department}</div></div>
        <div class="detail-meta-item"><div class="detail-label">Status</div><div class="detail-meta-value"><span class="badge ${statusClass(item.status)}">${item.status}</span></div></div>
        <div class="detail-meta-item"><div class="detail-label">Sentiment</div><div class="detail-meta-value"><span class="badge ${sentimentClass(item.sentiment)}">${item.sentiment}</span></div></div>
        <div class="detail-meta-item"><div class="detail-label">Priority</div><div class="detail-meta-value">${item.priority}</div></div>
      </div>
    </div>
    <div class="detail-divider"></div>
    <div class="detail-section">
      <div class="detail-label">Thematic Analysis</div>
      <div class="detail-analysis">${item.analysis}</div>
    </div>
    ${actions.length > 0 ? `
    <div class="detail-divider"></div>
    <div class="detail-section">
      <div class="detail-label">Related Actions</div>
      <ul class="detail-actions-list">
        ${actions.map(a => `
          <li>
            <span class="badge ${statusClass(a.status)}">${a.status}</span>
            <strong>${a.title}</strong>
            <span style="color:var(--text-hint);font-size:12px;margin-left:auto;">${a.owner} · Due ${formatDate(a.dueDate)}</span>
          </li>`).join('')}
      </ul>
    </div>` : ''}`;

  dialogOverlay.classList.add('open');
}

function closeDetail() { dialogOverlay.classList.remove('open'); }

// ===== Events =====
searchInput.addEventListener('input', applyFilters);
filterSource.addEventListener('change', applyFilters);
filterCategory.addEventListener('change', applyFilters);
filterStatus.addEventListener('change', applyFilters);
filterSentiment.addEventListener('change', applyFilters);
filterDepartment.addEventListener('change', applyFilters);

clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterSource.value = '';
  filterCategory.value = '';
  filterStatus.value = '';
  filterSentiment.value = '';
  filterDepartment.value = '';
  applyFilters();
  // If scoped to a theme, go to full list
  if (scopedThemeId) window.location.href = './feedback.html';
});

document.querySelectorAll('.feedback-table th.sortable').forEach(th => {
  th.addEventListener('click', () => handleSort(th.dataset.sort));
});

tbody.addEventListener('click', e => {
  const row = e.target.closest('tr[data-id]');
  if (row) openDetail(row.dataset.id);
});

pagination.addEventListener('click', e => {
  const btn = e.target.closest('button[data-page]');
  if (btn && !btn.disabled) {
    currentPage = parseInt(btn.dataset.page);
    render();
    document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

dialogClose.addEventListener('click', closeDetail);
dialogOverlay.addEventListener('click', e => { if (e.target === dialogOverlay) closeDetail(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

// ===== Init =====
loadData();
