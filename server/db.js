const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const DATA_DIR = path.dirname(config.dbPath);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    trend TEXT DEFAULT 'Stable',
    status TEXT DEFAULT 'Active',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    item_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Processing',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    source TEXT NOT NULL,
    quote TEXT NOT NULL,
    translation TEXT DEFAULT '',
    category TEXT NOT NULL,
    theme_id TEXT,
    department TEXT NOT NULL,
    status TEXT DEFAULT 'New',
    sentiment TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    sub_type TEXT DEFAULT '',
    thematic_code TEXT DEFAULT '',
    analysis TEXT DEFAULT '',
    import_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (theme_id) REFERENCES themes(id),
    FOREIGN KEY (import_id) REFERENCES imports(id)
  );

  CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    theme_id TEXT NOT NULL,
    status TEXT DEFAULT 'Proposed',
    priority TEXT DEFAULT 'Medium',
    owner TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (theme_id) REFERENCES themes(id)
  );
`);

// Safe migrations — ignore if column already exists
const migrations = [
  `ALTER TABLE feedback ADD COLUMN sub_type TEXT DEFAULT ''`,
  `ALTER TABLE themes ADD COLUMN importance TEXT DEFAULT 'Medium'`,
  `ALTER TABLE themes ADD COLUMN archived INTEGER DEFAULT 0`,
  `ALTER TABLE actions ADD COLUMN parent_action_id TEXT DEFAULT NULL`,
  `ALTER TABLE themes ADD COLUMN priority TEXT DEFAULT 'Medium'`,
  `ALTER TABLE themes ADD COLUMN department TEXT DEFAULT ''`,
  `ALTER TABLE actions ADD COLUMN suggestion_status TEXT DEFAULT 'suggested'`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function isEmpty() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM feedback').get();
  return row.cnt === 0;
}

function seedFromMockData() {
  if (!isEmpty()) return;

  const mockPath = path.join(__dirname, '..', 'public', 'js', 'shared', 'mock-data.js');
  if (!fs.existsSync(mockPath)) return;

  const mockContent = fs.readFileSync(mockPath, 'utf-8');

  // Extract arrays using Function constructor (safe here - our own file)
  const fn = new Function(mockContent + '; return { THEMES, ACTIONS, FEEDBACK };');
  const { THEMES, ACTIONS, FEEDBACK } = fn();

  const insertTheme = db.prepare(
    'INSERT OR IGNORE INTO themes (id, name, category, trend, status, description) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertFeedback = db.prepare(
    'INSERT OR IGNORE INTO feedback (id, date, source, quote, translation, category, theme_id, department, status, sentiment, priority, thematic_code, analysis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAction = db.prepare(
    'INSERT OR IGNORE INTO actions (id, title, theme_id, status, priority, owner, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    for (const t of THEMES) {
      insertTheme.run(t.id, t.name, t.category, t.trend, t.status, t.description);
    }
    for (const f of FEEDBACK) {
      insertFeedback.run(f.id, f.date, f.source, f.quote, f.translation, f.category, f.themeId, f.department, f.status, f.sentiment, f.priority, f.thematicCode, f.analysis);
    }
    for (const a of ACTIONS) {
      // Actions in mock data have themeIds array; store first one as primary, create rows for each
      const primaryThemeId = a.themeIds[0];
      insertAction.run(a.id, a.title, primaryThemeId, a.status, a.priority, a.owner, a.dueDate, a.notes || '');
    }
  });

  seedAll();
  console.log('Database seeded with mock data.');
}

// ===== Deduplicate themes by name (run on every startup) =====
// Merges duplicate theme rows (same name, case-insensitive) into the oldest one.
// Also marks non-constructive themes as archived so they don't pollute the board.
const NON_CONSTRUCTIVE_THEME_PATTERN = /no\s+feedback|incomplete\s+feedback|no\s+comment|no\s+response|empty|n\/a|none|blank|not\s+applicable/i;

function deduplicateThemes() {
  const themes = db.prepare('SELECT id, name FROM themes ORDER BY created_at ASC').all();
  const seen = {}; // normalised name → canonical id

  for (const t of themes) {
    const key = t.name.toLowerCase().trim();
    if (seen[key]) {
      const canonicalId = seen[key];
      db.prepare('UPDATE feedback SET theme_id = ? WHERE theme_id = ?').run(canonicalId, t.id);
      db.prepare('UPDATE actions  SET theme_id = ? WHERE theme_id = ?').run(canonicalId, t.id);
      db.prepare('DELETE FROM themes WHERE id = ?').run(t.id);
    } else {
      seen[key] = t.id;
      // Auto-archive non-constructive themes
      if (NON_CONSTRUCTIVE_THEME_PATTERN.test(t.name)) {
        // Insert a sentinel "out of scope" action so deriveThemeStatus returns 'archived'
        const existingAction = db.prepare("SELECT id FROM actions WHERE theme_id = ? AND status = 'out of scope'").get(t.id);
        if (!existingAction) {
          const autoId = 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
          db.prepare('INSERT OR IGNORE INTO actions (id, title, theme_id, status, owner) VALUES (?, ?, ?, ?, ?)').run(
            autoId, 'Auto-archived: non-constructive feedback', t.id, 'out of scope', 'System'
          );
        }
      }
    }
  }
}

deduplicateThemes();

module.exports = { db, generateId, seedFromMockData };
