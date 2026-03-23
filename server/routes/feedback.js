const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const { search, source, category, status, sentiment, department, page = 1, limit = 50, sort = 'date', order = 'desc' } = req.query;

  let where = [];
  let params = [];

  if (search) {
    where.push('(f.quote LIKE ? OR f.translation LIKE ? OR t.name LIKE ? OR f.analysis LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (source) { where.push('f.source = ?'); params.push(source); }
  if (category) { where.push('f.category = ?'); params.push(category); }
  if (status) { where.push('f.status = ?'); params.push(status); }
  if (sentiment) { where.push('f.sentiment = ?'); params.push(sentiment); }
  if (department) { where.push('f.department = ?'); params.push(department); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const allowedSorts = { date: 'f.date', source: 'f.source', category: 'f.category', theme: 't.name', status: 'f.status', sentiment: 'f.sentiment' };
  const sortCol = allowedSorts[sort] || 'f.date';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM feedback f LEFT JOIN themes t ON f.theme_id = t.id ${whereClause}`).get(...params);

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const rows = db.prepare(`
    SELECT f.*, t.name as theme_name, t.category as theme_category
    FROM feedback f
    LEFT JOIN themes t ON f.theme_id = t.id
    ${whereClause}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({
    items: rows.map(r => ({
      id: r.id,
      date: r.date,
      source: r.source,
      quote: r.quote,
      translation: r.translation,
      category: r.category,
      themeId: r.theme_id,
      themeName: r.theme_name || 'Unknown',
      department: r.department,
      status: r.status,
      sentiment: r.sentiment,
      priority: r.priority,
      thematicCode: r.thematic_code,
      analysis: r.analysis,
    })),
    total: countRow.total,
    page: parseInt(page),
    totalPages: Math.ceil(countRow.total / parseInt(limit)),
  });
});

module.exports = router;
