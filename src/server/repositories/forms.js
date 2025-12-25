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

async function insertInitialCounts(client, formId, options) {
  if (!options.length) return;
  const values = options.map((_, i) => `($1, $${i + 2}, 0)`).join(',');
  await client.query(
    `INSERT INTO counts(form_id, date, count) VALUES ${values}`,
    [formId, ...options]
  );
}

async function createFormRecord(payload) {
  return withTransaction(async client => {
    await insertForm(client, payload);
    await insertInitialCounts(client, payload.formId, payload.options || []);
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

async function upsertUserNickname({ formId, userId, nickname }) {
  await pool.query(
    `
    INSERT INTO user_nicknames(form_id, user_id, nickname)
    VALUES ($1, $2, $3)
    ON CONFLICT (form_id, user_id) DO UPDATE SET nickname = EXCLUDED.nickname
  `,
    [formId, userId, nickname]
  );
}

async function getUserNicknames(formId) {
  const result = await pool.query(
    'SELECT DISTINCT nickname FROM user_nicknames WHERE form_id = $1 ORDER BY nickname',
    [formId]
  );
  return result.rows.map(row => row.nickname);
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

async function updateMessage(formId, message) {
  await pool.query('UPDATE forms SET message=$1 WHERE form_id=$2', [
    message,
    formId,
  ]);
}

export {
  addVote,
  createFormRecord,
  findFormById,
  getUserNicknames,
  getVoteCounts,
  removeVote,
  updateMessage,
  upsertUserNickname,
  withTransaction,
};
