const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const themes = db.prepare(`
    SELECT t.*, COUNT(f.id) as mention_count
    FROM themes t
    LEFT JOIN feedback f ON f.theme_id = t.id
    GROUP BY t.id
    ORDER BY mention_count DESC
  `).all();

  res.json(themes.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    trend: t.trend,
    status: t.status,
    description: t.description,
    mentions: t.mention_count,
  })));
});

module.exports = router;
