import { pool } from '../db/pool.js';

async function getFormOptions(formId) {
  const formResult = await pool.query(
    'SELECT options FROM forms WHERE form_id = $1',
    [formId]
  );
  if (!formResult.rowCount) return null;
  return formResult.rows[0].options;
}

async function incrementVote({ formId, date }) {
  const options = await getFormOptions(formId);
  if (!options) return { ok: false, error: 'not_found' };
  if (!options.includes(date)) return { ok: false, error: 'invalid_date' };

  await pool.query(
    `
    INSERT INTO counts(form_id, date, count)
    VALUES ($1,$2,1)
    ON CONFLICT (form_id, date) DO UPDATE SET count = counts.count + 1
  `,
    [formId, date]
  );
  return { ok: true };
}

async function decrementVote({ formId, date }) {
  const options = await getFormOptions(formId);
  if (!options) return { ok: false, error: 'not_found' };
  if (!options.includes(date)) return { ok: false, error: 'invalid_date' };

  await pool.query(
    'UPDATE counts SET count = GREATEST(0, count - 1) WHERE form_id = $1 AND date = $2',
    [formId, date]
  );
  return { ok: true };
}

export { decrementVote, incrementVote };
