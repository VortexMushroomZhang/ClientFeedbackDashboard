const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, generateId } = require('../db');
const { extractText } = require('../services/parser');
const { analyzeFeedback, synthesizeThemes, suggestActions } = require('../services/analyzer');
const upload = require('../middleware/upload');

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
  const importId = generateId('imp');

  // Create import record
  db.prepare('INSERT INTO imports (id, filename, file_type, status) VALUES (?, ?, ?, ?)').run(
    importId, req.file.originalname, ext, 'Processing'
  );

  try {
    // Step 1: Extract text
    const rawItems = await extractText(req.file.path, ext);

    if (rawItems.length === 0) {
      db.prepare('UPDATE imports SET status = ? WHERE id = ?').run('Empty', importId);
      return res.json({ importId, status: 'Empty', itemCount: 0, message: 'No feedback items found in file' });
    }

    // Step 2: AI analysis
    const analyzed = await analyzeFeedback(rawItems);

    // Step 3: Get existing themes for synthesis
    const existingThemes = db.prepare('SELECT * FROM themes').all();
    const suggestedThemes = analyzed.map(a =>
      a.SUGGESTED_THEME || a.suggested_theme || 'Uncategorized'
    );

    // Step 4: Synthesize themes
    const themeResult = await synthesizeThemes(suggestedThemes, existingThemes);

    // Step 5: Create new themes and map feedback to theme IDs
    const themeIdMap = {}; // index -> theme_id
    const newThemes = [];

    for (const mapping of themeResult.mappings || []) {
      if (mapping.existing_theme_id) {
        themeIdMap[mapping.index] = mapping.existing_theme_id;
      } else if (mapping.new_theme) {
        const themeId = generateId('t');
        db.prepare('INSERT INTO themes (id, name, category, description) VALUES (?, ?, ?, ?)').run(
          themeId, mapping.new_theme.name, mapping.new_theme.category || 'UX', mapping.new_theme.description || ''
        );
        themeIdMap[mapping.index] = themeId;
        newThemes.push({ id: themeId, name: mapping.new_theme.name, category: mapping.new_theme.category });
      }
    }

    // Step 6: Insert feedback items
    const insertFeedback = db.prepare(
      'INSERT INTO feedback (id, date, source, quote, translation, category, theme_id, department, status, sentiment, priority, thematic_code, analysis, import_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const today = new Date().toISOString().slice(0, 10);
    const source = req.body.source || 'Import';
    let insertedCount = 0;

    const insertAll = db.transaction(() => {
      for (let i = 0; i < analyzed.length; i++) {
        const a = analyzed[i];
        const feedbackId = generateId('f');
        const themeId = themeIdMap[i] || null;
        insertFeedback.run(
          feedbackId,
          today,
          source,
          a.ORIGINAL_QUOTE || a.original_quote || rawItems[i] || '',
          a.TRANSLATION || a.translation || '',
          a.CATEGORY || a.category || 'UX',
          themeId,
          a.DEPARTMENT || a.department || 'Product',
          'New',
          a.SENTIMENT || a.sentiment || 'Neutral',
          a.PRIORITY || a.priority || 'Medium',
          a.THEMATIC_CODE || a.thematic_code || '',
          a.ANALYSIS || a.analysis || '',
          importId
        );
        insertedCount++;
      }
    });
    insertAll();

    // Step 7: Suggest actions for new themes
    if (newThemes.length > 0) {
      const themesForActions = newThemes.map(t => {
        const cnt = db.prepare('SELECT COUNT(*) as cnt FROM feedback WHERE theme_id = ?').get(t.id);
        return { ...t, mentionCount: cnt.cnt };
      });

      try {
        const actionSuggestions = await suggestActions(themesForActions);
        for (const suggestion of actionSuggestions) {
          const matchingTheme = newThemes.find(t =>
            t.name.toLowerCase() === (suggestion.theme_name || '').toLowerCase()
          );
          if (matchingTheme) {
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            db.prepare('INSERT INTO actions (id, title, theme_id, priority, owner, due_date) VALUES (?, ?, ?, ?, ?, ?)').run(
              generateId('a'), suggestion.title, matchingTheme.id, suggestion.priority || 'Medium', suggestion.owner || 'Product', dueDate
            );
          }
        }
      } catch (e) {
        console.error('Action suggestion failed (non-fatal):', e.message);
      }
    }

    // Step 8: Update import record
    db.prepare('UPDATE imports SET status = ?, item_count = ? WHERE id = ?').run('Completed', insertedCount, importId);

    // Cleanup uploaded file
    fs.unlink(req.file.path, () => {});

    res.json({
      importId,
      status: 'Completed',
      itemCount: insertedCount,
      newThemes: newThemes.length,
      message: `Successfully imported ${insertedCount} feedback items`,
    });

  } catch (err) {
    console.error('Upload processing error:', err);
    db.prepare('UPDATE imports SET status = ? WHERE id = ?').run('Failed', importId);
    res.status(500).json({ error: 'Processing failed: ' + err.message, importId });
  }
});

module.exports = router;
