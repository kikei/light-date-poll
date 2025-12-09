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

async function getCountsRows(formId) {
  const rows = await pool.query(
    'SELECT date, count FROM counts WHERE form_id=$1 ORDER BY date',
    [formId]
  );
  return rows.rows;
}

async function upsertCounts(formId, entries) {
  if (!entries.length) return;

  const values = entries.flatMap(entry => [entry.date, entry.count]);
  const placeholders = entries
    .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
    .join(',');

  await withTransaction(async client => {
    await client.query(
      `
      INSERT INTO counts(form_id, date, count) VALUES ${placeholders}
      ON CONFLICT (form_id, date) DO UPDATE SET count = EXCLUDED.count
    `,
      [formId, ...values]
    );
  });
}

async function updateMessage(formId, message) {
  await pool.query('UPDATE forms SET message=$1 WHERE form_id=$2', [
    message,
    formId,
  ]);
}

export {
  createFormRecord,
  findFormById,
  getCountsRows,
  upsertCounts,
  updateMessage,
  withTransaction,
};
