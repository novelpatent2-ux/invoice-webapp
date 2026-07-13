// Invoice Generator — server
// Serves the invoice tool, protects it behind a single password, and
// persists data to a Postgres database (e.g. a free Supabase project)
// so the same data shows up on every device you log in from.

const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Required environment variables ----
// APP_PASSWORD   — the password you'll use to log in
// SESSION_SECRET — any long random string, used to sign the login cookie
// DATABASE_URL   — your Postgres connection string (from Supabase, etc.)
const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!APP_PASSWORD || !SESSION_SECRET || !DATABASE_URL) {
  console.error('Missing required environment variables. Please set APP_PASSWORD, SESSION_SECRET, and DATABASE_URL.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // typical requirement for hosted Postgres (e.g. Supabase)
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

app.use(express.json({ limit: '10mb' })); // invoices can include base64 logo/signature images

// Render (and most hosting platforms) sit behind a reverse proxy that
// terminates HTTPS. Without this line, Express doesn't realize the
// original connection was secure, which breaks "secure" session cookies
// and causes the login to silently fail to persist.
app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// ---- Auth routes ----
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === APP_PASSWORD) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Incorrect password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---- Storage API (mirrors the get/set/delete/list shape the front-end expects) ----
app.get('/api/storage', requireAuth, async (req, res) => {
  const prefix = req.query.prefix || '';
  try {
    const result = await pool.query('SELECT key FROM kv_store WHERE key LIKE $1 ORDER BY key', [prefix + '%']);
    res.json({ keys: result.rows.map(r => r.key), prefix });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/storage/:key', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM kv_store WHERE key = $1', [req.params.key]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ key: req.params.key, value: result.rows[0].value, shared: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/storage/:key', requireAuth, async (req, res) => {
  const { value } = req.body || {};
  if (typeof value !== 'string') return res.status(400).json({ error: 'value must be a string' });
  try {
    await pool.query(
      `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [req.params.key, value]
    );
    res.json({ key: req.params.key, value, shared: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/storage/:key', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM kv_store WHERE key = $1', [req.params.key]);
    res.json({ key: req.params.key, deleted: true, shared: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Static files ----
// login.html is always public. Everything else requires a session.
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
  if (!req.session || !req.session.authed) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

ensureTable()
  .then(() => {
    app.listen(PORT, () => console.log(`Invoice Generator running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
