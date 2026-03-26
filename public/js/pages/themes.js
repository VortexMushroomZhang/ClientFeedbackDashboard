// ===== State =====
let activeCategory = '';
let sortMode = 'newest';
let allThemes = [];
let allFeedback = [];
let allActionGroups = [];
let archiveOpen = false;
let expandedThemeIds = new Set();

// ===== DOM =====
const filterPills    = document.getElementById('filter-pills');
const sortSelect     = document.getElementById('sort-select');
const themeRows      = document.getElementById('theme-rows');
const themeSubtitle  = document.getElementById('theme-subtitle');
const archiveSection = document.getElementById('archive-section');
const archiveToggle  = document.getElementById('archive-toggle');
const archiveRowsEl  = document.getElementById('archive-rows');
const archiveLabel   = document.getElementById('archive-label');
const archiveChevron = document.getElementById('archive-chevron');
const dialogOverlay  = document.getElementById('dialog-overlay');
const dialogBody     = document.getElementById('dialog-body');
const dialogTitle    = document.getElementById('dialog-title');
const dialogClose    = document.getElementById('dialog-close');

// ===== Load =====
async function loadData() {
  try {
    const [themes, feedbackRes, actionGroups] = await Promise.all([
      API.getThemes(),
      API.getFeedback({ limit: 5000 }),
      API.getActions(),
    ]);
    allThemes = themes;
    allFeedback = feedbackRes.items;
    allActionGroups = actionGroups;
  } catch (e) {
    allThemes = typeof THEMES !== 'undefined' ? THEMES : [];
    allFeedback = (typeof FEEDBACK !== 'undefined' ? FEEDBACK : []);
    allActionGroups = [];
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
  for (const s of ['In Progress', 'Assigned', 'In Review', 'New', 'Resolved']) {
    if (items.some(f => f.status === s)) return s;
  }
  return 'New';
}

function getActionsForTheme(themeId) {
  const group = allActionGroups.find(g => g.theme.id === themeId);
  return group ? group.actions : [];
}

// ===== Filter Pills =====
function buildPills() {
  const categories = ['', 'UX', 'Communication', 'Engineering', 'Feature'];
  const labels = ['All', 'UX', 'Communication', 'Engineering', 'Feature'];
  filterPills.innerHTML = categories.map((cat, i) =>
    `<button class="filter-pill ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">${labels[i]}</button>`
  ).join('');
}

// ===== Sort & Filter =====
function getActive() {
  let list = allThemes
    .filter(t => t.status !== 'archived')
    .map(t => ({ ...t, mentions: t.mentions ?? getMentions(t.id) }));

  if (activeCategory) list = list.filter(t => t.category === activeCategory);

  switch (sortMode) {
    case 'newest':        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); break;
    case 'mentions-desc': list.sort((a, b) => b.mentions - a.mentions); break;
    case 'importance': {
      const order = { High: 0, Medium: 1, Low: 2 };
      list.sort((a, b) => (order[a.importance] ?? 1) - (order[b.importance] ?? 1));
      break;
    }
    case 'name-asc': list.sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  return list;
}

function getArchived() {
  return allThemes.filter(t => t.status === 'archived');
}

// ===== Render =====
function render() {
  const active = getActive();
  const archived = getArchived();

  themeSubtitle.textContent = `${active.length} active theme${active.length !== 1 ? 's' : ''}${archived.length ? ` · ${archived.length} archived` : ''}`;

  if (active.length === 0) {
    themeRows.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">label_off</span><p>No themes yet. Import feedback to get started.</p></div>`;
  } else {
    themeRows.innerHTML = active.map(t => renderThemeRow(t, false)).join('');
  }

  // Archive section
  if (archived.length > 0) {
    archiveSection.style.display = '';
    archiveLabel.textContent = `Archived Themes (${archived.length})`;
    archiveRowsEl.innerHTML = archived.map(t => renderThemeRow(t, true)).join('');
  } else {
    archiveSection.style.display = 'none';
  }
}

// ===== Render theme row (card + parallel suggestions) =====
function renderThemeRow(t, isArchived) {
  const actions = getActionsForTheme(t.id).filter(a => a.suggestionStatus !== 'discarded');
  const suggestionsHtml = actions.length > 0
    ? actions.map(a => renderSuggestionCard(a, t.id)).join('')
    : `<div class="suggestion-empty"><span class="material-icons-outlined">tips_and_updates</span><span>No suggestions yet</span></div>`;

  return `
    <div class="theme-row ${isArchived ? 'theme-row-archived' : ''}">
      <div class="theme-row-card">
        ${renderThemeCard(t, isArchived)}
      </div>
      <div class="theme-row-suggestions">
        ${suggestionsHtml}
      </div>
    </div>`;
}

function renderThemeCard(t, isArchived) {
  const isExpanded = expandedThemeIds.has(t.id);
  const feedbackItems = allFeedback.filter(f => f.themeId === t.id).sort((a, b) => b.date.localeCompare(a.date));

  const expandedHtml = isExpanded ? `
    <div class="theme-card-expand-panel">
      <div class="theme-card-expand-divider"></div>
      <div class="detail-metrics-bar">
        <div class="detail-metric"><div class="detail-metric-value">${t.mentions}</div><div class="detail-metric-label">Mentions</div></div>
        <div class="detail-metric"><div class="detail-metric-value">${t.importance || 'Medium'}</div><div class="detail-metric-label">Importance</div></div>
        <div class="detail-metric"><div class="detail-metric-value">${trendArrow(t.trend)} ${trendLabel(t.trend)}</div><div class="detail-metric-label">Trend</div></div>
      </div>
      <div class="linked-feedback-title">Linked Feedback (${feedbackItems.length})</div>
      <div class="theme-quotes-list ${feedbackItems.length > 3 ? 'theme-quotes-scrollable' : ''}">
        ${feedbackItems.length === 0
          ? '<div style="font-size:13px;color:var(--text-hint);padding:8px 0;">No feedback linked to this theme yet.</div>'
          : feedbackItems.map(f => `
            <div class="linked-feedback-item">
              <div class="linked-feedback-meta">
                <span>${formatDate(f.date)}</span><span class="dot">&middot;</span>
                <span>${f.source}</span><span class="dot">&middot;</span>
                <span class="tag-category ${categoryClass(f.category)}">${f.category}</span><span class="dot">&middot;</span>
                <span class="badge ${statusClass(f.status)}">${f.status}</span>
                ${f.translation ? '<span class="dot">&middot;</span><span class="badge" style="background:#e3f2fd;color:#1565c0;font-size:10px;">Translated</span>' : ''}
              </div>
              <div class="linked-feedback-quote">${f.translation || f.quote}</div>
            </div>
          `).join('')}
      </div>
      <div class="detail-actions-bar">
        <a href="./feedback.html?theme=${t.id}" class="btn-outline">View All Feedback →</a>
      </div>
    </div>` : '';

  return `
    <div class="theme-card ${isArchived ? 'theme-card-archived' : ''} ${isExpanded ? 'theme-card-expanded' : ''}" data-id="${t.id}" style="cursor:pointer;">
      <div class="theme-card-top theme-card-header">
        <div class="theme-card-info">
          <div class="theme-card-name">${t.name}</div>
          <div class="theme-card-desc">${t.description || ''}</div>
        </div>
        <div class="theme-card-count">
          ${trendArrow(t.trend)}
          <span class="count-number">${t.mentions}</span>
          <span class="material-icons-outlined theme-expand-icon">${isExpanded ? 'expand_less' : 'expand_more'}</span>
        </div>
      </div>
      <div class="theme-card-divider"></div>
      <div class="theme-card-bottom">
        <div class="theme-card-tags">
          <span class="tag-category ${categoryClass(t.category)}">${t.category.toUpperCase()}</span>
          <span class="badge badge-theme-status-${(t.status || 'new')}">${(t.status || 'new').charAt(0).toUpperCase() + (t.status || 'new').slice(1)}</span>
          <span class="theme-card-feedback-count">${t.mentions} feedback items</span>
        </div>
        <div class="theme-card-controls">
          <div class="inline-edit-group">
            <label class="inline-label">Priority</label>
            <select class="inline-select" data-theme-id="${t.id}" data-field="priority" ${isArchived ? 'disabled' : ''}>
              ${['High', 'Medium', 'Low'].map(v =>
                `<option value="${v}" ${(t.priority || 'Medium') === v ? 'selected' : ''}>${v}</option>`
              ).join('')}
            </select>
          </div>
          <div class="inline-edit-group">
            <label class="inline-label">Category</label>
            <select class="inline-select" data-theme-id="${t.id}" data-field="category" ${isArchived ? 'disabled' : ''}>
              ${['UX', 'Communication', 'Engineering', 'Feature'].map(c =>
                `<option value="${c}" ${(t.category || '') === c ? 'selected' : ''}>${c}</option>`
              ).join('')}
            </select>
          </div>
          <div class="inline-edit-group">
            <label class="inline-label">Dept.</label>
            <select class="inline-select" data-theme-id="${t.id}" data-field="department" ${isArchived ? 'disabled' : ''}>
              ${['Design', 'Research', 'Customer Service', 'Engineering', 'Product'].map(d =>
                `<option value="${d}" ${(t.department || '') === d ? 'selected' : ''}>${d}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>
      ${expandedHtml}
    </div>`;
}

function renderSuggestionCard(action, themeId) {
  const depts = ['Design', 'Research', 'Customer Service', 'Engineering', 'Product'];
  const isApproved = action.suggestionStatus === 'approved';
  return `
    <div class="suggestion-card ${isApproved ? 'suggestion-card-approved' : ''}" data-action-id="${action.id}" data-theme-id="${themeId}">
      <div class="suggestion-title-row">
        <input class="suggestion-title-input" data-action-id="${action.id}"
          value="${(action.title || '').replace(/"/g, '&quot;')}" placeholder="Action title" />
        ${isApproved ? '<span class="suggestion-approved-badge"><span class="material-icons-outlined">check_circle</span>Approved</span>' : ''}
      </div>
      <div class="suggestion-field-row">
        <label class="inline-label">Dept.</label>
        <select class="inline-select suggestion-dept" data-action-id="${action.id}" data-theme-id="${themeId}">
          <option value="">Unassigned</option>
          ${depts.map(d =>
            `<option value="${d}" ${(action.owner || '') === d ? 'selected' : ''}>${d}</option>`
          ).join('')}
        </select>
      </div>
      <textarea class="suggestion-note" data-action-id="${action.id}" placeholder="Add a note…" rows="2">${action.notes || ''}</textarea>
      <div class="suggestion-card-footer">
        ${isApproved
          ? `<button class="btn-suggestion-undo" data-action-id="${action.id}">Undo Approve</button>`
          : `<button class="btn-suggestion-discard" data-action-id="${action.id}">Discard</button>
             <button class="btn-suggestion-approve" data-action-id="${action.id}">Approve →</button>`
        }
      </div>
    </div>`;
}

// ===== Detail Dialog =====
function openDetail(themeId) {
  const theme = allThemes.find(t => t.id === themeId);
  if (!theme) return;

  const mentions = theme.mentions ?? getMentions(themeId);
  const feedbackItems = allFeedback.filter(f => f.themeId === themeId).sort((a, b) => b.date.localeCompare(a.date));

  dialogTitle.textContent = theme.name;
  dialogBody.innerHTML = `
    <div class="detail-section">
      <div class="detail-label">Description</div>
      <div style="font-size:14px;color:var(--text-primary);line-height:1.6;margin-top:4px;">${theme.description || '—'}</div>
    </div>
    <div class="detail-metrics-bar">
      <div class="detail-metric"><div class="detail-metric-value">${mentions}</div><div class="detail-metric-label">Mentions</div></div>
      <div class="detail-metric"><div class="detail-metric-value">${theme.importance || 'Medium'}</div><div class="detail-metric-label">Importance</div></div>
      <div class="detail-metric"><div class="detail-metric-value">${trendArrow(theme.trend)} ${trendLabel(theme.trend)}</div><div class="detail-metric-label">Trend</div></div>
    </div>
    <div class="linked-feedback-title">Linked Feedback (${feedbackItems.length})</div>
    ${feedbackItems.map(f => `
      <div class="linked-feedback-item">
        <div class="linked-feedback-meta">
          <span>${formatDate(f.date)}</span><span class="dot">&middot;</span>
          <span>${f.source}</span><span class="dot">&middot;</span>
          <span class="tag-category ${categoryClass(f.category)}">${f.category}</span><span class="dot">&middot;</span>
          <span class="badge ${statusClass(f.status)}">${f.status}</span>
          ${f.translation ? '<span class="dot">&middot;</span><span class="badge" style="background:#e3f2fd;color:#1565c0;font-size:10px;">Translated</span>' : ''}
        </div>
        <div class="linked-feedback-quote">${f.translation || f.quote}</div>
      </div>
    `).join('')}
    <div class="detail-actions-bar">
      <a href="./feedback.html?theme=${themeId}" class="btn-outline">View All Feedback</a>
    </div>`;

  dialogOverlay.classList.add('open');
}

function closeDetail() { dialogOverlay.classList.remove('open'); }

// ===== Events =====
filterPills.addEventListener('click', e => {
  const pill = e.target.closest('.filter-pill');
  if (!pill) return;
  activeCategory = pill.dataset.category;
  buildPills();
  render();
});

sortSelect.addEventListener('change', () => { sortMode = sortSelect.value; render(); });

// Theme row clicks
document.addEventListener('click', e => {
  // Expand/collapse theme card on click (but not on controls)
  const card = e.target.closest('.theme-card');
  if (card && !e.target.closest('.theme-card-controls') && !e.target.closest('.theme-card-expand-panel') && !e.target.closest('a')) {
    const themeId = card.dataset.id;
    if (expandedThemeIds.has(themeId)) {
      expandedThemeIds.delete(themeId);
    } else {
      expandedThemeIds.add(themeId);
    }
    render();
    return;
  }

  // Approve suggestion
  const approveBtn = e.target.closest('.btn-suggestion-approve');
  if (approveBtn) {
    const { actionId } = approveBtn.dataset;
    setSuggestionStatus(actionId, 'approved');
    return;
  }

  // Discard suggestion
  const discardBtn = e.target.closest('.btn-suggestion-discard');
  if (discardBtn) {
    const { actionId } = discardBtn.dataset;
    setSuggestionStatus(actionId, 'discarded');
    return;
  }

  // Undo approve
  const undoBtn = e.target.closest('.btn-suggestion-undo');
  if (undoBtn) {
    const { actionId } = undoBtn.dataset;
    setSuggestionStatus(actionId, 'suggested');
    return;
  }

});

function setSuggestionStatus(actionId, suggestionStatus) {
  for (const group of allActionGroups) {
    const action = group.actions.find(a => a.id === actionId);
    if (action) { action.suggestionStatus = suggestionStatus; break; }
  }
  API.updateAction(actionId, { suggestion_status: suggestionStatus }).catch(err => {
    console.error('Failed to update suggestion status:', err);
  });
  render();
}

function findAction(actionId) {
  for (const group of allActionGroups) {
    const a = group.actions.find(a => a.id === actionId);
    if (a) return a;
  }
  return null;
}

// Archive toggle
archiveToggle.addEventListener('click', () => {
  archiveOpen = !archiveOpen;
  archiveRowsEl.style.display = archiveOpen ? '' : 'none';
  archiveChevron.textContent = archiveOpen ? 'expand_less' : 'expand_more';
});

// Inline theme field edit
document.addEventListener('change', e => {
  const select = e.target.closest('select[data-theme-id]');
  if (select) {
    const { themeId, field } = select.dataset;
    const value = select.value;
    const theme = allThemes.find(t => t.id === themeId);
    if (theme) theme[field] = value;
    API.updateTheme(themeId, { [field]: value }).catch(() => {});
    if (field === 'category') render(); // rebuild pills + re-render to update tag color
    return;
  }

  // Action dept change — also syncs to theme
  const deptSelect = e.target.closest('.suggestion-dept');
  if (deptSelect) {
    const { actionId, themeId } = deptSelect.dataset;
    const owner = deptSelect.value;
    for (const group of allActionGroups) {
      const action = group.actions.find(a => a.id === actionId);
      if (action) { action.owner = owner; break; }
    }
    // Sync theme department locally too
    const theme = allThemes.find(t => t.id === themeId);
    if (theme && owner) theme.department = owner;
    // Server syncs theme dept automatically when owner changes
    API.updateAction(actionId, { owner }).catch(() => {});
    return;
  }

  // Action status change
  const suggSelect = e.target.closest('.suggestion-status');
  if (suggSelect) {
    const { actionId } = suggSelect.dataset;
    const status = suggSelect.value;
    for (const group of allActionGroups) {
      const action = group.actions.find(a => a.id === actionId);
      if (action) { action.status = status; break; }
    }
    API.updateAction(actionId, { status }).catch(() => {});
    return;
  }
});

// Action title & note save on blur
document.addEventListener('blur', e => {
  const titleInput = e.target.closest('.suggestion-title-input');
  if (titleInput) {
    const { actionId } = titleInput.dataset;
    const title = titleInput.value.trim();
    if (!title) return;
    for (const group of allActionGroups) {
      const action = group.actions.find(a => a.id === actionId);
      if (action) { action.title = title; break; }
    }
    API.updateAction(actionId, { title }).catch(() => {});
    return;
  }

  const noteArea = e.target.closest('.suggestion-note');
  if (noteArea) {
    const { actionId } = noteArea.dataset;
    const notes = noteArea.value;
    for (const group of allActionGroups) {
      const action = group.actions.find(a => a.id === actionId);
      if (action) { action.notes = notes; break; }
    }
    API.updateAction(actionId, { notes }).catch(() => {});
    return;
  }
}, true);

dialogClose.addEventListener('click', closeDetail);
dialogOverlay.addEventListener('click', e => { if (e.target === dialogOverlay) closeDetail(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });



// ===== Init =====
loadData();
