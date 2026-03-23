// ===== State =====
let actionGroups = [];
let allFeedback = [];

// ===== Load Data =====
async function loadData() {
  try {
    const [groups, feedbackRes] = await Promise.all([
      API.getActions(),
      API.getFeedback({ limit: 5000 }),
    ]);
    actionGroups = groups;
    allFeedback = feedbackRes.items;
  } catch (e) {
    // Fallback to globals
    allFeedback = typeof FEEDBACK !== 'undefined' ? FEEDBACK : [];
    const themes = typeof THEMES !== 'undefined' ? THEMES : [];
    const actions = typeof ACTIONS !== 'undefined' ? ACTIONS : [];
    // Build groups from mock data
    const themeIdSet = new Set();
    actions.forEach(a => (a.themeIds || []).forEach(id => themeIdSet.add(id)));
    actionGroups = [];
    themeIdSet.forEach(themeId => {
      const theme = themes.find(t => t.id === themeId);
      if (!theme) return;
      const themeActions = actions.filter(a => (a.themeIds || []).includes(themeId));
      actionGroups.push({
        theme: { ...theme, mentions: allFeedback.filter(f => f.themeId === themeId).length },
        actions: themeActions.map(a => ({ ...a, themeId })),
      });
    });
    actionGroups.sort((a, b) => b.theme.mentions - a.theme.mentions);
  }

  document.getElementById('total-count').textContent = allFeedback.length + ' total feedback items';
  render();
}

// ===== Helpers =====
function priorityBadge(p) {
  return `<span class="badge badge-priority-${p.toLowerCase()}">${p}</span>`;
}

function actionStatusBadge(s) {
  return `<span class="badge badge-action-${s.toLowerCase().replace(/\s+/g, '-')}">${s}</span>`;
}

function deptBadge(dept) {
  return `<span class="badge badge-dept">${dept}</span>`;
}

function feedbackStatusBadge(s) {
  return `<span class="badge ${statusClass(s)}">${s}</span>`;
}

function categoryTag(cat) {
  return `<span class="tag-category ${categoryClass(cat)}">${cat.toUpperCase()}</span>`;
}

// trendArrow comes from utils.js

// ===== Render =====
function render() {
  const list = document.getElementById('action-list');
  const totalActions = actionGroups.reduce((sum, g) => sum + g.actions.length, 0);
  document.getElementById('actions-subtitle').textContent =
    `${totalActions} actions across ${actionGroups.length} themes — review, prioritize, and assign ownership`;

  list.innerHTML = actionGroups.map(group => {
    const t = group.theme;
    const feedback = allFeedback.filter(f => f.themeId === t.id);

    return `
      <div class="theme-group">
        <div class="theme-group-header">
          <div class="theme-group-info">
            <div class="theme-group-name">${t.name}</div>
            <div class="theme-group-meta">
              ${categoryTag(t.category)}
              <span class="theme-group-mentions">${t.mentions} mentions</span>
              <span class="theme-group-trend">${trendArrow(t.trend)} ${t.trend}</span>
            </div>
          </div>
          <div class="theme-group-desc">${t.description}</div>
        </div>

        <div class="theme-group-actions">
          ${group.actions.map(action => {
            const notes = action.notes || '';
            return `
              <div class="action-card" data-id="${action.id}">
                <div class="action-card-header">
                  <div class="action-card-info">
                    <div class="action-card-title">${action.title}</div>
                    <div class="action-card-sub">Due ${action.dueDate} &middot; ${feedback.length} feedback item${feedback.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div class="action-card-badges">
                    ${priorityBadge(action.priority)}
                    ${actionStatusBadge(action.status)}
                    ${deptBadge(action.owner)}
                  </div>
                  <span class="material-icons-outlined action-chevron">expand_more</span>
                </div>
                <div class="action-card-body">
                  <div class="action-controls">
                    <div class="action-control-group">
                      <span class="action-control-label">Assigned Department</span>
                      <select data-field="owner" data-action-id="${action.id}">
                        ${['Product', 'Engineering', 'Design', 'CX'].map(d =>
                          `<option value="${d}" ${action.owner === d ? 'selected' : ''}>${d}</option>`
                        ).join('')}
                      </select>
                    </div>
                    <div class="action-control-group">
                      <span class="action-control-label">Priority</span>
                      <select data-field="priority" data-action-id="${action.id}">
                        ${['High', 'Medium', 'Low'].map(p =>
                          `<option value="${p}" ${action.priority === p ? 'selected' : ''}>${p.toLowerCase()}</option>`
                        ).join('')}
                      </select>
                    </div>
                    <div class="action-control-group">
                      <span class="action-control-label">Status</span>
                      <select data-field="status" data-action-id="${action.id}">
                        ${['Proposed', 'Approved', 'In Progress', 'Completed', 'Blocked'].map(s =>
                          `<option value="${s}" ${action.status === s ? 'selected' : ''}>${s}</option>`
                        ).join('')}
                      </select>
                    </div>
                  </div>

                  <div class="action-notes-section">
                    <div class="action-notes-title">
                      <span class="material-icons-outlined">edit_note</span>
                      Notes
                    </div>
                    <textarea class="action-notes" data-action-id="${action.id}" placeholder="Add discussion notes, decisions, or context...">${notes}</textarea>
                  </div>

                  <div class="source-feedback-title">
                    <span class="material-icons-outlined">description</span>
                    Source Feedback from "${t.name}"
                  </div>
                  ${feedback.length > 0 ? feedback.slice(0, 4).map(f => `
                    <div class="source-card">
                      <div class="source-quote">"${f.translation || f.quote}"</div>
                      <div class="source-meta">
                        <div class="source-meta-left">
                          <span>${f.date}</span>
                          <span class="dot">&middot;</span>
                          <span>${f.source}</span>
                        </div>
                        ${feedbackStatusBadge(f.status)}
                      </div>
                    </div>
                  `).join('') : '<div style="font-size:13px;color:var(--text-hint);padding:8px 0;">No linked feedback.</div>'}

                  <div class="action-done-row">
                    <button class="btn-done" data-action-id="${action.id}">Done — Next Item</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ===== Events =====
const actionList = document.getElementById('action-list');

// Toggle expand/collapse
actionList.addEventListener('click', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
  const header = e.target.closest('.action-card-header');
  if (!header) return;
  const card = header.closest('.action-card');
  const wasExpanded = card.classList.contains('expanded');

  document.querySelectorAll('.action-card.expanded').forEach(c => c.classList.remove('expanded'));

  if (!wasExpanded) {
    card.classList.add('expanded');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

// Inline dropdown changes — persist to API
actionList.addEventListener('change', (e) => {
  const select = e.target.closest('select[data-action-id]');
  if (!select) return;
  const actionId = select.dataset.actionId;
  const field = select.dataset.field;
  const value = select.value;

  // Update local state
  for (const group of actionGroups) {
    const action = group.actions.find(a => a.id === actionId);
    if (action) {
      action[field] = value;
      // Update badges
      const card = select.closest('.action-card');
      const badges = card.querySelector('.action-card-badges');
      badges.innerHTML = `
        ${priorityBadge(action.priority)}
        ${actionStatusBadge(action.status)}
        ${deptBadge(action.owner)}
      `;
      break;
    }
  }

  // Persist to API
  API.updateAction(actionId, { [field]: value }).catch(err => {
    console.error('Failed to update action:', err);
  });
});

// Save notes with debounce
let noteTimers = {};
actionList.addEventListener('input', (e) => {
  const textarea = e.target.closest('textarea[data-action-id]');
  if (!textarea) return;
  const actionId = textarea.dataset.actionId;
  const value = textarea.value;

  // Update local state
  for (const group of actionGroups) {
    const action = group.actions.find(a => a.id === actionId);
    if (action) { action.notes = value; break; }
  }

  // Debounced API save
  clearTimeout(noteTimers[actionId]);
  noteTimers[actionId] = setTimeout(() => {
    API.updateAction(actionId, { notes: value }).catch(err => {
      console.error('Failed to save notes:', err);
    });
  }, 800);
});

// Done — Next Item
actionList.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-done');
  if (!btn) return;

  const currentCard = btn.closest('.action-card');
  currentCard.classList.remove('expanded');

  const allCards = [...document.querySelectorAll('.action-card')];
  const idx = allCards.indexOf(currentCard);
  const nextCard = allCards[idx + 1];

  if (nextCard) {
    setTimeout(() => {
      nextCard.classList.add('expanded');
      nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  }
});

// ===== Init =====
loadData();
