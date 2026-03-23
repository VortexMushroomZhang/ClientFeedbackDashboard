const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const actions = db.prepare(`
    SELECT a.*, t.name as theme_name, t.category as theme_category, t.trend as theme_trend, t.description as theme_description
    FROM actions a
    LEFT JOIN themes t ON a.theme_id = t.id
    ORDER BY t.id, a.created_at
  `).all();

  // Group by theme
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
        },
        actions: [],
      };
    }
    grouped[tid].actions.push({
      id: a.id,
      title: a.title,
      themeId: a.theme_id,
      status: a.status,
      priority: a.priority,
      owner: a.owner,
      dueDate: a.due_date,
      notes: a.notes,
    });
  }

  // Sort groups by mention count desc
  const groups = Object.values(grouped).sort((a, b) => b.theme.mentions - a.theme.mentions);
  res.json(groups);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, priority, owner, notes } = req.body;

  const existing = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Action not found' });

  db.prepare(`
    UPDATE actions SET
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      owner = COALESCE(?, owner),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(status || null, priority || null, owner || null, notes !== undefined ? notes : null, id);

  const updated = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
  res.json({
    id: updated.id,
    title: updated.title,
    themeId: updated.theme_id,
    status: updated.status,
    priority: updated.priority,
    owner: updated.owner,
    dueDate: updated.due_date,
    notes: updated.notes,
  });
});

module.exports = router;
