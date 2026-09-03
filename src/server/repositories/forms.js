import { pool } from '../db/pool.js';

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function insertForm(
  client,
  { formId, message, options, secret, maxVotes }
) {
  await client.query(
    'INSERT INTO forms(form_id, message, options, secret, max_votes) VALUES($1,$2,$3,$4,$5)',
    [formId, message ?? '', JSON.stringify(options), secret, maxVotes ?? null]
  );
}

async function createFormRecord(payload) {
  return withTransaction(async client => {
    await insertForm(client, payload);
    return { formId: payload.formId, secret: payload.secret };
  });
}

async function findFormById(formId) {
  const result = await pool.query(
    'SELECT message, options, secret, max_votes FROM forms WHERE form_id=$1',
    [formId]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    formId,
    message: row.message,
    options: row.options,
    secret: row.secret,
    maxVotes: row.max_votes ?? null,
  };
}

async function recordFormView({ formId, userId }) {
  await pool.query(
    `
    INSERT INTO form_views(form_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT (form_id, user_id) DO NOTHING
  `,
    [formId, userId]
  );
}

async function countFormViews(formId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM form_views WHERE form_id = $1',
    [formId]
  );
  return Number(result.rows[0]?.count || 0);
}

// Respondents who picked at least one date, as opposed to only reaching
// for a special key.
async function countDateVoters({ formId, excludeDates }) {
  const result = await pool.query(
    `
    SELECT COUNT(DISTINCT user_id) as count FROM votes
    WHERE form_id = $1 AND date <> ALL($2::text[])
  `,
    [formId, excludeDates]
  );
  return Number(result.rows[0]?.count || 0);
}

async function countRespondents(formId) {
  const result = await pool.query(
    'SELECT COUNT(DISTINCT user_id) as count FROM votes WHERE form_id = $1',
    [formId]
  );
  return Number(result.rows[0]?.count || 0);
}

async function countUserDateVotes({ formId, userId, excludeDates }) {
  const result = await pool.query(
    `
    SELECT COUNT(*) as count FROM votes
    WHERE form_id = $1 AND user_id = $2 AND date <> ALL($3::text[])
  `,
    [formId, userId, excludeDates]
  );
  return Number(result.rows[0]?.count || 0);
}

async function addVote({ formId, date, userId }) {
  await pool.query(
    `
    INSERT INTO votes(form_id, date, user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (form_id, date, user_id) DO NOTHING
  `,
    [formId, date, userId]
  );
}

async function removeVote({ formId, date, userId }) {
  await pool.query(
    'DELETE FROM votes WHERE form_id = $1 AND date = $2 AND user_id = $3',
    [formId, date, userId]
  );
}

async function getVoteCounts(formId) {
  const result = await pool.query(
    `
    SELECT date, COUNT(*) as count
    FROM votes
    WHERE form_id = $1
    GROUP BY date
  `,
    [formId]
  );
  return result.rows;
}

async function getAdminCounts(formId) {
  const result = await pool.query(
    `SELECT date, count
     FROM counts
     WHERE form_id = $1`,
    [formId]
  );
  return result.rows;
}

async function updateMessage(formId, message) {
  await pool.query('UPDATE forms SET message=$1 WHERE form_id=$2', [
    message,
    formId,
  ]);
}

async function upsertCounts(formId, entries) {
  if (!entries.length) return;
  const values = entries
    .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
    .join(',');
  const params = [formId];
  entries.forEach(e => {
    params.push(e.date, e.count);
  });
  await pool.query(
    `INSERT INTO counts(form_id, date, count) VALUES ${values}
     ON CONFLICT (form_id, date) DO UPDATE SET count = EXCLUDED.count`,
    params
  );
}

export {
  addVote,
  countDateVoters,
  countFormViews,
  countRespondents,
  countUserDateVotes,
  createFormRecord,
  findFormById,
  getAdminCounts,
  getVoteCounts,
  recordFormView,
  removeVote,
  updateMessage,
  upsertCounts,
  withTransaction,
};
