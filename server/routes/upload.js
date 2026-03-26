const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, generateId } = require('../db');
const { extractText } = require('../services/parser');
const { analyzeFeedback, synthesizeThemes, suggestActions } = require('../services/analyzer');
const upload = require('../middleware/upload');

const NON_CONSTRUCTIVE_PATTERN = /no\s+feedback|incomplete\s+feedback|no\s+comment|no\s+response|n\/a|none|blank|not\s+applicable/i;
const NON_CONSTRUCTIVE_RAW    = /^[\s\-_.]*$|^(n\/?a|none|no|nee|neen|nihil|nothing|no\s+feedback|no\s+comment|geen|leeg|nvt|not\s+applicable|no\s+issues?|all\s+(good|fine|ok)|good|ok|fine|yes|no|ja|nee|no\s+idea)[\s.!]*$/i;

function isConstructive(text) {
  if (!text || text.trim().length < 8) return false;
  if (NON_CONSTRUCTIVE_RAW.test(text.trim())) return false;
  return true;
}

function setProgress(importId, step, detail) {
  db.prepare("UPDATE imports SET status = ? WHERE id = ?").run(`Processing: ${step}${detail ? ' — ' + detail : ''}`, importId);
}

// ===== Core processing — runs async, does NOT block the HTTP response =====
async function processImport(importId, filePath, ext, source) {
  try {
    // Step 1: Extract
    setProgress(importId, 'Extracting text');
    const rawItems = await extractText(filePath, ext);
    fs.unlink(filePath, () => {});

    if (rawItems.length === 0) {
      db.prepare('UPDATE imports SET status = ?, item_count = ? WHERE id = ?').run('Empty', 0, importId);
      return;
    }

    const constructiveItems = rawItems.filter(isConstructive);
    const skippedCount = rawItems.length - constructiveItems.length;

    if (constructiveItems.length === 0) {
      db.prepare('UPDATE imports SET status = ?, item_count = ? WHERE id = ?').run('Empty', 0, importId);
      return;
    }

    // Step 2: Analyze in batches — update progress as each batch completes
    setProgress(importId, 'Analyzing feedback', `0 / ${constructiveItems.length}`);
    const allAnalyzed = [];
    const BATCH = 5;
    for (let i = 0; i < constructiveItems.length; i += BATCH) {
      const batch = constructiveItems.slice(i, i + BATCH);
      const results = await analyzeFeedback(batch);
      allAnalyzed.push(...results);
      setProgress(importId, 'Analyzing feedback', `${Math.min(i + BATCH, constructiveItems.length)} / ${constructiveItems.length}`);
    }

    // Step 3: Synthesize themes
    setProgress(importId, 'Synthesizing themes');
    const existingThemes = db.prepare('SELECT * FROM themes').all();
    const suggestedThemes = allAnalyzed.map(a => a.SUGGESTED_THEME || a.suggested_theme || 'Uncategorized');
    const themeResult = await synthesizeThemes(suggestedThemes, existingThemes);

    // Step 4: Create new themes (name-deduplicated)
    const themeIdMap = {};
    const newThemes = [];
    const existingThemeIds = new Set(existingThemes.map(t => t.id));
    const nameToThemeId = {};
    for (const t of existingThemes) nameToThemeId[t.name.toLowerCase().trim()] = t.id;

    for (const mapping of themeResult.mappings || []) {
      if (mapping.existing_theme_id && existingThemeIds.has(mapping.existing_theme_id)) {
        themeIdMap[mapping.index] = mapping.existing_theme_id;
        continue;
      }
      if (mapping.existing_theme_id && !existingThemeIds.has(mapping.existing_theme_id)) {
        mapping.new_theme = { name: suggestedThemes[mapping.index] || 'Uncategorized', category: 'UX', description: '' };
      }
      if (mapping.new_theme) {
        const normName = (mapping.new_theme.name || 'Uncategorized').toLowerCase().trim();
        if (nameToThemeId[normName]) {
          themeIdMap[mapping.index] = nameToThemeId[normName];
        } else {
          const themeId = generateId('t');
          db.prepare('INSERT INTO themes (id, name, category, description) VALUES (?, ?, ?, ?)').run(
            themeId, mapping.new_theme.name, mapping.new_theme.category || 'UX', mapping.new_theme.description || ''
          );
          nameToThemeId[normName] = themeId;
          themeIdMap[mapping.index] = themeId;
          newThemes.push({ id: themeId, name: mapping.new_theme.name, category: mapping.new_theme.category });
        }
      }
    }

    // Step 5: Insert feedback
    setProgress(importId, 'Saving feedback');
    const insertFeedback = db.prepare(
      'INSERT INTO feedback (id, date, source, quote, translation, category, sub_type, theme_id, department, status, sentiment, priority, thematic_code, analysis, import_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const today = new Date().toISOString().slice(0, 10);
    let insertedCount = 0;

    db.transaction(() => {
      for (let i = 0; i < allAnalyzed.length; i++) {
        const a = allAnalyzed[i];
        insertFeedback.run(
          generateId('f'), today, source,
          a.ORIGINAL_QUOTE || a.original_quote || constructiveItems[i] || '',
          a.TRANSLATION || a.translation || '',
          a.CATEGORY || a.category || 'UX',
          a.SUB_TYPE || a.sub_type || '',
          themeIdMap[i] || null,
          a.DEPARTMENT || a.department || 'Product',
          'new',
          a.SENTIMENT || a.sentiment || 'Neutral',
          a.PRIORITY || a.priority || 'Medium',
          a.THEMATIC_CODE || a.thematic_code || '',
          a.ANALYSIS || a.analysis || '',
          importId
        );
        insertedCount++;
      }
    })();

    // Step 6: Auto-archive non-constructive themes
    for (const t of newThemes) {
      if (NON_CONSTRUCTIVE_PATTERN.test(t.name)) {
        db.prepare('INSERT OR IGNORE INTO actions (id, title, theme_id, status, owner) VALUES (?, ?, ?, ?, ?)').run(
          generateId('a'), 'Auto-archived: non-constructive feedback', t.id, 'out of scope', 'System'
        );
      }
    }
    const actionableNewThemes = newThemes.filter(t => !NON_CONSTRUCTIVE_PATTERN.test(t.name));

    // Step 7: Suggest actions for new actionable themes
    if (actionableNewThemes.length > 0) {
      setProgress(importId, 'Generating action suggestions');
      try {
        const themesForActions = actionableNewThemes.map(t => ({
          ...t, mentionCount: db.prepare('SELECT COUNT(*) as cnt FROM feedback WHERE theme_id = ?').get(t.id).cnt
        }));
        const suggestions = await suggestActions(themesForActions);
        for (const s of suggestions) {
          const match = actionableNewThemes.find(t => t.name.toLowerCase() === (s.theme_name || '').toLowerCase());
          if (match) {
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            db.prepare('INSERT INTO actions (id, title, theme_id, status, owner, due_date) VALUES (?, ?, ?, ?, ?, ?)').run(
              generateId('a'), s.title, match.id, 'new', s.owner || 'Product', dueDate
            );
          }
        }
      } catch (e) {
        console.error('Action suggestion failed (non-fatal):', e.message);
      }
    }

    db.prepare('UPDATE imports SET status = ?, item_count = ? WHERE id = ?').run('Completed', insertedCount, importId);
    console.log(`Import ${importId} completed: ${insertedCount} items, ${newThemes.length} new themes, ${skippedCount} skipped`);

  } catch (err) {
    console.error(`Import ${importId} failed:`, err.message);
    db.prepare('UPDATE imports SET status = ? WHERE id = ?').run('Failed: ' + err.message.slice(0, 100), importId);
  }
}

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
  const importId = generateId('imp');
  const source = req.body.source || 'Import';

  // Create import record immediately
  db.prepare('INSERT INTO imports (id, filename, file_type, status) VALUES (?, ?, ?, ?)').run(
    importId, req.file.originalname, ext, 'Processing: Queued'
  );

  // Respond immediately — processing runs in background
  res.json({
    importId,
    status: 'Processing',
    message: 'File received. Processing in background — check import status for progress.',
  });

  // Kick off async processing (intentionally not awaited)
  processImport(importId, req.file.path, ext, source);
});

module.exports = router;
