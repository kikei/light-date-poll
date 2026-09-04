import { pool } from './pool.js';

export async function migrate() {
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
  await pool.query(
    'ALTER TABLE forms ADD COLUMN IF NOT EXISTS min_attendees INTEGER;'
  );
  await pool.query(
    'ALTER TABLE votes ADD COLUMN IF NOT EXISTS voted_at TIMESTAMPTZ;'
  );
  await pool.query('ALTER TABLE votes ALTER COLUMN voted_at SET DEFAULT now()');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes(
      form_id TEXT NOT NULL,
      date    TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY(form_id, date, user_id),
      FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS count_adjustments(
      form_id    TEXT NOT NULL,
      date       TEXT NOT NULL,
      adjustment INTEGER NOT NULL,
      PRIMARY KEY(form_id, date),
      FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
    );
  `);
  // Migrate existing DATE columns to TEXT
  await pool
    .query('ALTER TABLE votes ALTER COLUMN date TYPE TEXT USING date::TEXT')
    .catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS form_views(
      form_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(form_id, user_id),
      FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
    );
  `);
  // Names are no longer collected: nothing reads this table.
  await pool.query('DROP TABLE IF EXISTS user_nicknames');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gate_answers(
      form_id     TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      choice      TEXT NOT NULL,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(form_id, user_id),
      FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
    );
  `);
  // それ以外 is gone: its purpose was never clear, and nothing reads these
  // rows any more.
  await pool.query("DELETE FROM votes WHERE date = 'none-of-above'");
  await pool.query(
    "DELETE FROM count_adjustments WHERE date = 'none-of-above'"
  );
  // counts held absolute overrides that nothing has read since the vote
  // screen switched to the votes table; count_adjustments replaces it and
  // the old values carry no correction anyone still means.
  await pool.query('DROP TABLE IF EXISTS counts');
}
