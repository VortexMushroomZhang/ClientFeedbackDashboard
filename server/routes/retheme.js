const express = require('express');
const router = express.Router();
const { db, generateId } = require('../db');
const { analyzeFeedback, synthesizeThemes, suggestActions } = require('../services/analyzer');

const NON_CONSTRUCTIVE = /no\s+feedback|incomplete\s+feedback|no\s+comment|no\s+response|n\/a|none|blank|not\s+applicable/i;

const NON_CONSTRUCTIVE_RAW = /^[\s\-_.]*$|^(n\/?a|none|no|nee|neen|nihil|nothing|no\s+feedback|no\s+comment|geen|leeg|nvt|not\s+applicable|no\s+issues?|all\s+(good|fine|ok)|good|ok|fine|yes|no|ja|nee|no\s+idea)[\s.!]*$/i;

function isConstructive(text) {
  if (!text || text.trim().length < 8) return false;
  if (NON_CONSTRUCTIVE_RAW.test(text.trim())) return false;
  return true;
}

router.post('/', async (req, res) => {
  try {
    // Step 1: Load all existing feedback
    const allFeedback = db.prepare('SELECT * FROM feedback ORDER BY created_at ASC').all();

    if (allFeedback.length === 0) {
      return res.json({ status: 'empty', message: 'No feedback in database to retheme.' });
    }

    // Step 2: Pre-filter non-constructive items
    const constructive = allFeedback.filter(f => {
      const text = (f.translation || f.quote || '').trim();
      return isConstructive(text);
    });
    const nonConstructiveIds = new Set(allFeedback.filter(f => !isConstructive((f.translation || f.quote || '').trim())).map(f => f.id));

    // Step 3: Re-analyze constructive feedback to get fresh SUGGESTED_THEME values
    const rawTexts = constructive.map(f => f.translation || f.quote);
    const analyzed = await analyzeFeedback(rawTexts);

    // Step 4: Synthesize themes (no existing themes — starting fresh)
    const suggestedThemes = analyzed.map(a =>
      a.SUGGESTED_THEME || a.suggested_theme || 'Uncategorized'
    );

    const themeResult = await synthesizeThemes(suggestedThemes, []);

    // Step 5: Wipe existing themes and actions
    // Must null FK references before deleting parent rows
    db.prepare('UPDATE feedback SET theme_id = NULL').run();
    db.prepare('DELETE FROM actions').run();
    db.prepare('DELETE FROM themes').run();

    // Step 6: Create new themes with name deduplication
    const themeIdMap = {};     // index → theme_id
    const nameToThemeId = {};  // normalised name → theme_id
    const newThemes = [];

    for (const mapping of themeResult.mappings || []) {
      if (mapping.new_theme) {
        const normName = (mapping.new_theme.name || 'Uncategorized').toLowerCase().trim();
        if (nameToThemeId[normName]) {
          themeIdMap[mapping.index] = nameToThemeId[normName];
        } else {
          const themeId = generateId('t');
          db.prepare('INSERT INTO themes (id, name, category, description) VALUES (?, ?, ?, ?)').run(
            themeId,
            mapping.new_theme.name,
            mapping.new_theme.category || 'UX',
            mapping.new_theme.description || ''
          );
          nameToThemeId[normName] = themeId;
          themeIdMap[mapping.index] = themeId;
          newThemes.push({ id: themeId, name: mapping.new_theme.name, category: mapping.new_theme.category });
        }
      }
    }

    // Step 7: Assign theme_ids to constructive feedback
    const updateThemeId = db.prepare('UPDATE feedback SET theme_id = ?, category = ?, department = ?, sentiment = ?, priority = ?, thematic_code = ?, analysis = ?, sub_type = ? WHERE id = ?');

    const assignAll = db.transaction(() => {
      for (let i = 0; i < constructive.length; i++) {
        const f = constructive[i];
        const a = analyzed[i] || {};
        const themeId = themeIdMap[i] || null;
        updateThemeId.run(
          themeId,
          a.CATEGORY || a.category || f.category,
          a.DEPARTMENT || a.department || f.department,
          a.SENTIMENT || a.sentiment || f.sentiment,
          a.PRIORITY || a.priority || f.priority,
          a.THEMATIC_CODE || a.thematic_code || f.thematic_code,
          a.ANALYSIS || a.analysis || f.analysis,
          a.SUB_TYPE || a.sub_type || f.sub_type,
          f.id
        );
      }
    });
    assignAll();

    // Step 8: Auto-archive non-constructive themes + create sentinel actions
    // Also create a catch-all "Non-constructive" theme for the filtered-out items
    if (nonConstructiveIds.size > 0) {
      const ncThemeId = generateId('t');
      db.prepare('INSERT INTO themes (id, name, category, description) VALUES (?, ?, ?, ?)').run(
        ncThemeId, 'No Constructive Feedback', 'Communication', 'Items with no actionable content'
      );
      db.prepare('UPDATE feedback SET theme_id = ? WHERE id IN (' + [...nonConstructiveIds].map(() => '?').join(',') + ')').run(ncThemeId, ...[...nonConstructiveIds]);
      // Auto-archive it
      db.prepare('INSERT INTO actions (id, title, theme_id, status, owner) VALUES (?, ?, ?, ?, ?)').run(
        generateId('a'), 'Auto-archived: non-constructive feedback', ncThemeId, 'out of scope', 'System'
      );
    }

    // Step 9: Suggest actions for actionable new themes
    const actionableThemes = newThemes.filter(t => !NON_CONSTRUCTIVE.test(t.name));
    if (actionableThemes.length > 0) {
      try {
        const themesForActions = actionableThemes.map(t => {
          const cnt = db.prepare('SELECT COUNT(*) as cnt FROM feedback WHERE theme_id = ?').get(t.id);
          return { ...t, mentionCount: cnt.cnt };
        });
        const suggestions = await suggestActions(themesForActions);
        for (const s of suggestions) {
          const match = actionableThemes.find(t => t.name.toLowerCase() === (s.theme_name || '').toLowerCase());
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

    const finalThemeCount = db.prepare('SELECT COUNT(*) as c FROM themes').get().c;
    const finalActionCount = db.prepare('SELECT COUNT(*) as c FROM actions').get().c;

    res.json({
      status: 'ok',
      feedbackProcessed: constructive.length,
      feedbackSkipped: nonConstructiveIds.size,
      themesCreated: finalThemeCount,
      actionsCreated: finalActionCount,
      message: `Re-themed ${constructive.length} feedback items into ${finalThemeCount} themes with ${finalActionCount} action suggestions.`,
    });

  } catch (err) {
    console.error('Retheme error:', err);
    res.status(500).json({ error: 'Retheme failed: ' + err.message });
  }
});

module.exports = router;
