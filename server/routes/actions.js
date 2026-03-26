const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');

router.get('/', (req, res) => {
  const actions = db.prepare(`
    SELECT a.*, t.name as theme_name, t.category as theme_category, t.trend as theme_trend,
           t.description as theme_description,
           COALESCE(t.priority, t.importance, 'Medium') as theme_priority
    FROM actions a
    LEFT JOIN themes t ON a.theme_id = t.id
    ORDER BY t.created_at DESC, a.created_at
  `).all();

  const grouped = {};
  for (const a of actions) {
    const tid = a.theme_id;
    if (!grouped[tid]) {
      const mentionCount = db.prepare('SELECT COUNT(*) as cnt FROM feedback WHERE theme_id = ?').get(tid);
      grouped[tid] = {
        theme: {
          id: tid,
          name: a.theme_name || 'Unknown',
          category: a.theme_category || '',
          trend: a.theme_trend || 'Stable',
          description: a.theme_description || '',
          mentions: mentionCount.cnt,
          priority: a.theme_priority,
        },
        actions: [],
      };
    }
    grouped[tid].actions.push({
      id: a.id,
      title: a.title,
      themeId: a.theme_id,
      status: a.status || 'new',
      priority: a.theme_priority,
      owner: a.owner,
      dueDate: a.due_date,
      notes: a.notes,
      suggestionStatus: a.suggestion_status || 'suggested',
      parentActionId: a.parent_action_id || null,
    });
  }

  const groups = Object.values(grouped).sort((a, b) => b.theme.mentions - a.theme.mentions);
  res.json(groups);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, owner, notes, title, suggestion_status } = req.body;

  const existing = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Action not found' });

  // Build update dynamically so only provided fields are changed
  const fields = [];
  const params = [];
  if (status !== undefined)            { fields.push('status = ?');            params.push(status); }
  if (owner !== undefined)             { fields.push('owner = ?');             params.push(owner); }
  if (notes !== undefined)             { fields.push('notes = ?');             params.push(notes); }
  if (title !== undefined)             { fields.push('title = ?');             params.push(title); }
  if (suggestion_status !== undefined) { fields.push('suggestion_status = ?'); params.push(suggestion_status); }
  if (fields.length > 0) {
    params.push(id);
    db.prepare(`UPDATE actions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  // Sync department to the linked theme when owner changes
  if (owner !== undefined && owner !== null) {
    db.prepare('UPDATE themes SET department = ? WHERE id = ?').run(owner, existing.theme_id);
  }

  const updated = db.prepare('SELECT *, COALESCE((SELECT COALESCE(priority, importance, "Medium") FROM themes WHERE id = theme_id), "Medium") as theme_priority FROM actions WHERE id = ?').get(id);
  res.json({
    id: updated.id,
    title: updated.title,
    themeId: updated.theme_id,
    status: updated.status,
    priority: updated.theme_priority,
    owner: updated.owner,
    dueDate: updated.due_date,
    notes: updated.notes,
    suggestionStatus: updated.suggestion_status || 'suggested',
    parentActionId: updated.parent_action_id || null,
  });
});

// Create a follow-up action handed off to another department
router.post('/:id/followup', (req, res) => {
  const { id } = req.params;
  const { title, owner, notes } = req.body;

  const parent = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
  if (!parent) return res.status(404).json({ error: 'Parent action not found' });

  const newId = generateId('a');
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO actions (id, title, theme_id, status, owner, due_date, notes, parent_action_id, suggestion_status)
    VALUES (?, ?, ?, 'new', ?, ?, ?, ?, 'approved')
  `).run(newId, title || `Follow-up: ${parent.title}`, parent.theme_id, owner || '', dueDate, notes || '', id);

  const created = db.prepare('SELECT * FROM actions WHERE id = ?').get(newId);
  res.json({
    id: created.id,
    title: created.title,
    themeId: created.theme_id,
    status: created.status,
    owner: created.owner,
    dueDate: created.due_date,
    notes: created.notes,
    parentActionId: created.parent_action_id,
  });
});

module.exports = router;
