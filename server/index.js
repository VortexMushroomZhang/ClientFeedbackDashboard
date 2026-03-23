const express = require('express');
const path = require('path');
const fs = require('fs');

// Load .env manually (no dotenv dependency)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const config = require('./config');
const { seedFromMockData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static frontend files from public/
app.use(express.static(config.publicDir));

// Redirect root to the overview page
app.get('/', (req, res) => {
  res.redirect('/pages/overview.html');
});

// API routes
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/themes', require('./routes/themes'));
app.use('/api/actions', require('./routes/actions'));
app.use('/api/imports', require('./routes/imports'));
app.use('/api/upload', require('./routes/upload'));

// Seed database with mock data on first run
seedFromMockData();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
