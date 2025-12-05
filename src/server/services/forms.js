import { pool } from '../db/pool.js';
import { clampDays, pickDates } from '../utils/date.js';
import { rid, rsecret } from '../utils/id.js';

async function createForm({ startDate, endDate, message, maxVotes }) {
  const formId = rid();
  const secret = rsecret();
  const options = pickDates(startDate, endDate);
  const normalizedMaxVotes =
    maxVotes == null ? null : clampDays(Number(maxVotes));

  try {
    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO forms(form_id, message, options, secret, max_votes) VALUES($1,$2,$3,$4,$5)',
      [
        formId,
        message ?? '',
        JSON.stringify(options),
        secret,
        normalizedMaxVotes,
      ]
    );
    if (options.length) {
      const values = options.map((_, i) => `($1, $${i + 2}, 0)`).join(',');
      await pool.query(
        `INSERT INTO counts(form_id, date, count) VALUES ${values}`,
        [formId, ...options]
      );
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    throw error;
  }

  return { formId, secret, options, maxVotes: normalizedMaxVotes };
}

async function getFormById(formId) {
  const formResult = await pool.query(
    'SELECT message, options, max_votes FROM forms WHERE form_id=$1',
    [formId]
  );
  if (!formResult.rowCount) return null;

  const rows = await pool.query(
    'SELECT date, count FROM counts WHERE form_id=$1 ORDER BY date',
    [formId]
  );
  const counts = Object.fromEntries(
    rows.rows.map(r => [r.date.toISOString().slice(0, 10), Number(r.count)])
  );

  return {
    formId,
    message: formResult.rows[0].message,
    options: formResult.rows[0].options,
    maxVotes: formResult.rows[0].max_votes ?? null,
    counts,
  };
}

export { createForm, getFormById };
