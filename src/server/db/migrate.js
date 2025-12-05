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
