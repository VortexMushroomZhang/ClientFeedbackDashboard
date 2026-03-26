const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Derive theme status from its linked actions
// new         → no actions, or all actions are 'new'
// ongoing     → any action is 'in progress' or 'blocked'
// archived    → all actions are 'completed' or 'out of scope' (and at least one exists)
function deriveThemeStatus(themeId) {
  const actions = db.prepare('SELECT status FROM actions WHERE theme_id = ?').all(themeId);
  if (actions.length === 0) return 'new';
  const statuses = actions.map(a => (a.status || 'new').toLowerCase());
  if (statuses.some(s => s === 'in progress' || s === 'blocked')) return 'ongoing';
  if (statuses.every(s => s === 'completed' || s === 'out of scope')) return 'archived';
  return 'new';
}

router.get('/', (req, res) => {
  const themes = db.prepare(`
    SELECT t.*, COUNT(f.id) as mention_count
    FROM themes t
    LEFT JOIN feedback f ON f.theme_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();

  res.json(themes.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    trend: t.trend,
    description: t.description,
    mentions: t.mention_count,
    priority: t.priority || t.importance || 'Medium',
    department: t.department || '',
    status: deriveThemeStatus(t.id),
    createdAt: t.created_at,
  })));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { priority, department } = req.body;

  const existing = db.prepare('SELECT * FROM themes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Theme not found' });

  db.prepare(`
    UPDATE themes SET
      priority   = COALESCE(?, priority),
      department = COALESCE(?, department)
    WHERE id = ?
  `).run(priority || null, department !== undefined ? department : null, id);

  const updated = db.prepare('SELECT * FROM themes WHERE id = ?').get(id);
  res.json({
    id: updated.id,
    name: updated.name,
    category: updated.category,
    priority: updated.priority || updated.importance || 'Medium',
    department: updated.department || '',
    status: deriveThemeStatus(id),
  });
});

module.exports = router;
