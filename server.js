import express from 'express';
import { Pool } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render Postgres の接続文字列
  ssl: { rejectUnauthorized: false },
});

// 起動時に最低限のテーブルを用意
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS forms(
      form_id  TEXT PRIMARY KEY,
      message  TEXT NOT NULL,
      options  JSONB NOT NULL,          -- ["2025-09-24", ...]
      secret   TEXT NOT NULL,           -- 編集URL用トークン
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
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
function pickDates(startISO, endISO, limit = 10, weekdaysOnly = true) {
  const out = [],
    s = new Date(startISO),
    e = new Date(endISO);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  for (
    let d = new Date(s);
    d <= e && out.length < limit;
    d.setDate(d.getDate() + 1)
  ) {
    const w = d.getDay(); // 0:日 6:土
    if (weekdaysOnly && (w === 0 || w === 6)) continue;
    out.push(toISO(d));
  }
  return out;
}

// 作成
app.post('/api/forms', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      message,
      days,
      weekdaysOnly = true,
    } = req.body || {};
    if (!startDate || !endDate)
      return res.status(400).json({ error: 'missing fields' });

    const formId = rid();
    const secret = rsecret();
    const dateLimit = days != null ? Number(days) : Infinity;
    const options = pickDates(
      startDate,
      endDate,
      dateLimit || Infinity,
      !!weekdaysOnly
    );

    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO forms(form_id, message, options, secret) VALUES($1,$2,$3,$4)',
      [formId, message || '', JSON.stringify(options), secret]
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
  const f = await pool.query(
    'SELECT message, options FROM forms WHERE form_id=$1',
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
    counts,
  });
});

// 投票（+1）
app.post('/api/forms/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { date } = req.body || {};
  if (!date) return res.status(400).json({ error: 'missing date' });
  await pool.query(
    `
    INSERT INTO counts(form_id, date, count)
    VALUES ($1,$2,1)
    ON CONFLICT (form_id, date) DO UPDATE SET count = counts.count + 1
  `,
    [id, date]
  );
  res.json({ ok: true });
});

// 投票（-1）
app.delete('/api/forms/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { date } = req.body || {};
  if (!date) return res.status(400).json({ error: 'missing date' });
  await pool.query(
    'UPDATE counts SET count = GREATEST(0, count - 1) WHERE form_id = $1 AND date = $2',
    [id, date]
  );
  res.json({ ok: true });
});

// 単一HTML
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
migrate().then(() => {
  app.listen(PORT, () => console.log('listening on', PORT));
});
