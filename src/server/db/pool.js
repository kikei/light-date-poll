import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render Postgres の接続文字列
  ssl: { rejectUnauthorized: false },
});
