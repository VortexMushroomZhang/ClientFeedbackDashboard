// ===== State =====
let actionGroups = [];
let allFeedback = [];
let flatActions = []; // [{action, theme, feedbackItems}]
let activeTab = 'suggested'; // 'approved' | 'suggested'

// ===== DOM =====
const tbody          = document.getElementById('actions-tbody');
const emptyState     = document.getElementById('actions-empty');
const filterStatus   = document.getElementById('filter-status');
const filterOwner    = document.getElementById('filter-owner');
const filterPriority = document.getElementById('filter-priority');
const clearFiltersBtn= document.getElementById('clear-filters');
let followupTargetId = null;

// ===== Load =====
async function loadData() {
  try {
    const [groups, feedbackRes] = await Promise.all([
      API.getActions(),
      API.getFeedback({ limit: 5000 }),
    ]);
    actionGroups = groups;
    allFeedback = feedbackRes.items;
  } catch (e) {
    allFeedback = typeof FEEDBACK !== 'undefined' ? FEEDBACK : [];
    actionGroups = [];
  }

  document.getElementById('total-count').textContent = allFeedback.length + ' total feedback items';

  // Flatten into rows
  flatActions = [];
  for (const group of actionGroups) {
    const feedbackItems = allFeedback.filter(f => f.themeId === group.theme.id);
    for (const action of group.actions) {
      flatActions.push({ action, theme: group.theme, feedbackItems });
    }
  }

  const total = flatActions.length;
  document.getElementById('actions-subtitle').textContent =
    `${total} action${total !== 1 ? 's' : ''} across ${actionGroups.length} theme${actionGroups.length !== 1 ? 's' : ''} — review, prioritize, and assign ownership`;

  updateTabCounts();
  updateFollowupHeader();
  render();
}

// ===== Render =====
function render() {
  const statusFilter = filterStatus.value;
  const ownerFilter = filterOwner.value;
  const priorityFilter = filterPriority.value;

  clearFiltersBtn.style.display = (statusFilter || ownerFilter || priorityFilter) ? '' : 'none';

  const visible = flatActions.filter(({ action }) => {
    // Treat missing/null suggestionStatus as 'suggested'
    const ss = action.suggestionStatus || 'suggested';
    if (activeTab === 'approved' && ss !== 'approved') return false;
    if (activeTab === 'suggested' && ss !== 'suggested') return false;
    if (statusFilter && action.status !== statusFilter) return false;
    if (ownerFilter && action.owner !== ownerFilter) return false;
    if (priorityFilter && action.priority !== priorityFilter) return false;
    return true;
  });

  if (visible.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = '';
    const emptyMsg = emptyState.querySelector('p');
    if (emptyMsg) emptyMsg.textContent = activeTab === 'suggested'
      ? 'No AI suggestions pending. All suggestions have been approved or discarded.'
      : 'No active actions yet. Approve AI suggestions from the Themes page.';
    return;
  }

  emptyState.style.display = 'none';

  tbody.innerHTML = visible.map(({ action, theme, feedbackItems }) => {
    const quotes = feedbackItems.slice(0, 2).map(f =>
      `<div class="action-why-quote">"${(f.translation || f.quote).slice(0, 120)}${(f.translation || f.quote).length > 120 ? '…' : ''}"</div>`
    ).join('');

    return `
      <tr data-action-id="${action.id}">
        <td>
          <div class="action-theme-name">${theme.name}</div>
          <span class="tag-category ${categoryClass(theme.category)}">${theme.category.toUpperCase()}</span>
        </td>
        <td>
          <div class="action-title">${action.title}</div>
          ${action.parentActionId ? '<div class="action-followup-label">↳ Follow-up</div>' : ''}
        </td>
        <td>
          <select class="inline-select action-field-select" data-action-id="${action.id}" data-field="owner">
            ${['Design', 'Research', 'Customer Service', 'Engineering', 'Product'].map(d =>
              `<option value="${d}" ${action.owner === d ? 'selected' : ''}>${d}</option>`
            ).join('')}
          </select>
        </td>
        <td>
          <span class="badge badge-priority-${(action.priority || 'medium').toLowerCase()}">${action.priority || 'Medium'}</span>
        </td>
        <td>
          <select class="inline-select action-field-select" data-action-id="${action.id}" data-field="status">
            ${['new', 'in progress', 'completed', 'blocked', 'out of scope'].map(s =>
              `<option value="${s}" ${(action.status || 'new') === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
            ).join('')}
          </select>
        </td>
        <td class="action-why-cell">
          ${quotes || '<span style="color:var(--text-hint);font-size:12px;">No linked feedback</span>'}
          ${feedbackItems.length > 2 ? `<div class="action-why-more">+${feedbackItems.length - 2} more</div>` : ''}
        </td>
        <td class="action-notes-cell">
          <textarea class="action-notes-inline" data-action-id="${action.id}" placeholder="Add notes…">${action.notes || ''}</textarea>
        </td>
        ${activeTab === 'approved' ? `
        <td class="action-followup-cell">
          <button class="btn-followup" data-action-id="${action.id}">
            <span class="material-icons-outlined">call_split</span>
            Follow-up
          </button>
        </td>` : '<td></td>'}
      </tr>
    `;
  }).join('');
}

function updateTabCounts() {
  const approvedCount = flatActions.filter(({ action }) => (action.suggestionStatus || 'suggested') === 'approved').length;
  const suggestedCount = flatActions.filter(({ action }) => (action.suggestionStatus || 'suggested') === 'suggested').length;
  const approvedEl = document.getElementById('tab-count-approved');
  const suggestedEl = document.getElementById('tab-count-suggested');
  if (approvedEl) approvedEl.textContent = approvedCount;
  if (suggestedEl) suggestedEl.textContent = suggestedCount;
}

// ===== Events =====
document.getElementById('actions-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.actions-tab');
  if (!tab) return;
  activeTab = tab.dataset.tab;
  document.querySelectorAll('.actions-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
  updateFollowupHeader();
  render();
});

function updateFollowupHeader() {
  const th = document.getElementById('th-followup');
  if (th) th.style.display = activeTab === 'approved' ? '' : 'none';
}

filterStatus.addEventListener('change', render);
filterOwner.addEventListener('change', render);
filterPriority.addEventListener('change', render);

clearFiltersBtn.addEventListener('click', () => {
  filterStatus.value = '';
  filterOwner.value = '';
  filterPriority.value = '';
  render();
});

// Inline field changes
tbody.addEventListener('change', e => {
  const select = e.target.closest('.action-field-select');
  if (!select) return;
  const { actionId, field } = select.dataset;
  const value = select.value;

  // Update local state
  for (const { action } of flatActions) {
    if (action.id === actionId) { action[field] = value; break; }
  }

  API.updateAction(actionId, { [field]: value }).then(() => {
    if (field === 'status' && value === 'Completed') loadData();
  }).catch(() => {});
});

// Notes debounced save
let noteTimers = {};
tbody.addEventListener('input', e => {
  const textarea = e.target.closest('.action-notes-inline');
  if (!textarea) return;
  const { actionId } = textarea.dataset;
  const value = textarea.value;

  for (const { action } of flatActions) {
    if (action.id === actionId) { action.notes = value; break; }
  }

  clearTimeout(noteTimers[actionId]);
  noteTimers[actionId] = setTimeout(() => {
    API.updateAction(actionId, { notes: value }).catch(() => {});
  }, 800);
});

// Follow-up button
tbody.addEventListener('click', e => {
  const btn = e.target.closest('.btn-followup');
  if (!btn) return;
  followupTargetId = btn.dataset.actionId;
  document.getElementById('followup-title').value = '';
  document.getElementById('followup-overlay').classList.add('open');
});

// Follow-up dialog
document.getElementById('followup-close').addEventListener('click', closeFollowup);
document.getElementById('followup-cancel').addEventListener('click', closeFollowup);
document.getElementById('followup-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('followup-overlay')) closeFollowup();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeFollowup();
});

document.getElementById('followup-submit').addEventListener('click', async () => {
  if (!followupTargetId) return;
  const title = document.getElementById('followup-title').value.trim();
  const owner = document.getElementById('followup-owner').value;
  const priority = document.getElementById('followup-priority').value;

  try {
    await API.createFollowUp(followupTargetId, { title, owner, priority });
    closeFollowup();
    loadData();
  } catch (err) {
    alert('Failed to create follow-up: ' + err.message);
  }
});

function closeFollowup() {
  followupTargetId = null;
  document.getElementById('followup-overlay').classList.remove('open');
}

// ===== Init =====
loadData();
