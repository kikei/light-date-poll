import express from 'express';
import { Pool } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render Postgres の接続文字列
  ssl: { rejectUnauthorized: false },
});

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FORM_ID_LENGTH = 8;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_DAYS = 365;

function isValidFormId(id) {
  return typeof id === 'string' && id.length === FORM_ID_LENGTH;
}

function parseISODate(value) {
  if (typeof value !== 'string' || value.length !== 10) return null;
  if (!ISO_DATE_REGEX.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null; // ensure no timezone drift
  date.setHours(0, 0, 0, 0);
  return date;
}

function validateDateRange(startISO, endISO) {
  const startDate = parseISODate(startISO);
  const endDate = parseISODate(endISO);
  if (!startDate || !endDate)
    return { valid: false, error: 'invalid date format (YYYY-MM-DD)' };
  if (startDate.getTime() > endDate.getTime())
    return { valid: false, error: 'startDate must be on or before endDate' };
  return { valid: true, startDate, endDate };
}

function clampDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n)) return MAX_DAYS;
  if (n <= 0) return 0;
  return Math.min(Math.floor(n), MAX_DAYS);
}

// 起動時に最低限のテーブルを用意
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS forms(
      form_id  TEXT PRIMARY KEY,
      message  TEXT NOT NULL,
      options  JSONB NOT NULL,          -- ["2025-09-24", ...]
      secret   TEXT NOT NULL,           -- 編集URL用トークン
      max_votes INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    'ALTER TABLE forms ADD COLUMN IF NOT EXISTS max_votes INTEGER;'
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS counts(
      form_id TEXT NOT NULL,
      date    DATE NOT NULL,
      count   INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(form_id, date),
      FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
    );
  `);
}

function rid(n = 8) {
  return rand('abcdefghijklmnopqrstuvwxyz0123456789', n);
}
function rsecret(n = 12) {
  return rand(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
    n
  );
}
function rand(chars, n) {
  let s = '';
  for (let i = 0; i < n; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function toISO(d) {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, '0'),
    dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function pickDates(startDate, endDate) {
  const out = [],
    s = new Date(startDate),
    e = new Date(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(toISO(d));
  }
  return out;
}

// 作成
app.post('/api/forms', async (req, res) => {
  try {
    const { startDate, endDate, message, days } = req.body || {};
    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ error: 'startDate and endDate are required' });

    if (message != null && typeof message !== 'string')
      return res.status(400).json({ error: 'message must be a string' });
    const safeMessage = typeof message === 'string' ? message : '';
    if (safeMessage.length > MAX_MESSAGE_LENGTH)
      return res.status(400).json({ error: 'message too long (max 2000)' });

    const range = validateDateRange(startDate, endDate);
    if (!range.valid) return res.status(400).json({ error: range.error });

    const formId = rid();
    const secret = rsecret();
    const maxVotes = days == null ? null : clampDays(days);
    const options = pickDates(range.startDate, range.endDate);

    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO forms(form_id, message, options, secret, max_votes) VALUES($1,$2,$3,$4,$5)',
      [formId, safeMessage, JSON.stringify(options), secret, maxVotes]
    );
    if (options.length) {
      const values = options.map((_, i) => `($1, $${i + 2}, 0)`).join(',');
      await pool.query(
        `INSERT INTO counts(form_id, date, count) VALUES ${values}`,
        [formId, ...options]
      );
    }
    await pool.query('COMMIT');

    const origin =
      req.headers['x-forwarded-proto'] && req.headers['host']
        ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
        : '';
    res.json({
      formId,
      voteUrl: `${origin}/#/vote?formId=${formId}`,
      editUrl: `${origin}/#/edit?formId=${formId}&secret=${secret}`,
    });
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'server_error' });
  }
});

// 取得
app.get('/api/forms/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidFormId(id))
    return res.status(400).json({ error: 'invalid formId' });
  const f = await pool.query(
    'SELECT message, options, max_votes FROM forms WHERE form_id=$1',
    [id]
  );
  if (!f.rowCount) return res.status(404).json({ error: 'not_found' });
  const rows = await pool.query(
    'SELECT date, count FROM counts WHERE form_id=$1 ORDER BY date',
    [id]
  );
  const counts = Object.fromEntries(
    rows.rows.map(r => [r.date.toISOString().slice(0, 10), Number(r.count)])
  );
  res.json({
    formId: id,
    message: f.rows[0].message,
    options: f.rows[0].options,
    maxVotes: f.rows[0].max_votes ?? null,
    counts,
  });
});

// 投票（+1）
app.post('/api/forms/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { date } = req.body || {};
  if (!isValidFormId(id))
    return res.status(400).json({ error: 'invalid formId' });
  if (!date) return res.status(400).json({ error: 'missing date' });
  const parsedDate = parseISODate(date);
  if (!parsedDate)
    return res.status(400).json({ error: 'invalid date format (YYYY-MM-DD)' });
  const isoDate = toISO(parsedDate);
  const formResult = await pool.query(
    'SELECT options FROM forms WHERE form_id = $1',
    [id]
  );
  if (!formResult.rowCount)
    return res.status(404).json({ error: 'form not found' });
  const validDates = formResult.rows[0].options;
  if (!validDates.includes(isoDate))
    return res.status(400).json({ error: 'invalid date' });
  await pool.query(
    `
    INSERT INTO counts(form_id, date, count)
    VALUES ($1,$2,1)
    ON CONFLICT (form_id, date) DO UPDATE SET count = counts.count + 1
  `,
    [id, isoDate]
  );
  res.json({ ok: true });
});

// 投票（-1）
app.delete('/api/forms/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { date } = req.body || {};
  if (!isValidFormId(id))
    return res.status(400).json({ error: 'invalid formId' });
  if (!date) return res.status(400).json({ error: 'missing date' });
  const parsedDate = parseISODate(date);
  if (!parsedDate)
    return res.status(400).json({ error: 'invalid date format (YYYY-MM-DD)' });
  const isoDate = toISO(parsedDate);
  const formResult = await pool.query(
    'SELECT options FROM forms WHERE form_id = $1',
    [id]
  );
  if (!formResult.rowCount)
    return res.status(404).json({ error: 'form not found' });
  const validDates = formResult.rows[0].options;
  if (!validDates.includes(isoDate))
    return res.status(400).json({ error: 'invalid date' });
  await pool.query(
    'UPDATE counts SET count = GREATEST(0, count - 1) WHERE form_id = $1 AND date = $2',
    [id, isoDate]
  );
  res.json({ ok: true });
});

// 単一HTML (catch-all route for SPA)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
migrate().then(() => {
  app.listen(PORT, () => console.log('listening on', PORT));
});
