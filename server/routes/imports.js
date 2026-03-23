const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const imports = db.prepare('SELECT * FROM imports ORDER BY created_at DESC').all();
  res.json(imports.map(i => ({
    id: i.id,
    filename: i.filename,
    fileType: i.file_type,
    itemCount: i.item_count,
    status: i.status,
    createdAt: i.created_at,
  })));
});

module.exports = router;
