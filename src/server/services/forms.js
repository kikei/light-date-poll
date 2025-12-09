import { pool } from '../db/pool.js';
import { clampDays, pickDates, toISO } from '../utils/date.js';
import { rid, rsecret } from '../utils/id.js';
import { isValidISODate } from '../utils/validation.js';

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

async function getFormRow(formId) {
  const formResult = await pool.query(
    'SELECT message, options, secret, max_votes FROM forms WHERE form_id=$1',
    [formId]
  );
  if (!formResult.rowCount) return null;
  const row = formResult.rows[0];
  return {
    message: row.message,
    options: row.options,
    secret: row.secret,
    maxVotes: row.max_votes ?? null,
  };
}

async function getCountsMap(formId) {
  const rows = await pool.query(
    'SELECT date, count FROM counts WHERE form_id=$1 ORDER BY date',
    [formId]
  );
  return Object.fromEntries(
    rows.rows.map(r => [r.date.toISOString().slice(0, 10), Number(r.count)])
  );
}

async function getFormById(formId) {
  const form = await getFormRow(formId);
  if (!form) return null;

  const counts = await getCountsMap(formId);

  return {
    formId,
    message: form.message,
    options: form.options,
    maxVotes: form.maxVotes,
    counts,
  };
}

async function getFormForAdmin({ formId, secret }) {
  const form = await getFormRow(formId);
  if (!form) return { ok: false, error: 'not_found' };
  if (form.secret !== secret) return { ok: false, error: 'invalid_secret' };

  const counts = await getCountsMap(formId);
  return {
    ok: true,
    form: {
      formId,
      message: form.message,
      options: form.options,
      maxVotes: form.maxVotes,
      counts,
    },
  };
}

function normalizeCountsInput(counts, options) {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts))
    return { ok: false, error: 'invalid_counts' };

  const allowed = new Set(options || []);
  const entries = [];
  for (const [date, value] of Object.entries(counts)) {
    const dateResult = isValidISODate(date);
    if (!dateResult.valid) return { ok: false, error: 'invalid_date' };
    const isoDate = toISO(dateResult.date);
    if (!allowed.has(isoDate)) return { ok: false, error: 'invalid_date' };

    const n = Number(value);
    if (!Number.isFinite(n)) return { ok: false, error: 'invalid_count' };
    const normalized = Math.max(0, Math.floor(n));
    entries.push({ date: isoDate, count: normalized });
  }

  return { ok: true, entries };
}

async function upsertCounts({ formId, secret, counts }) {
  const form = await getFormRow(formId);
  if (!form) return { ok: false, error: 'not_found' };
  if (form.secret !== secret) return { ok: false, error: 'invalid_secret' };

  const normalized = normalizeCountsInput(counts, form.options);
  if (!normalized.ok) return normalized;
  const entries = normalized.entries;

  if (!entries.length) {
    const currentCounts = await getCountsMap(formId);
    return { ok: true, counts: currentCounts };
  }

  const values = entries.flatMap(entry => [entry.date, entry.count]);
  const placeholders = entries
    .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
    .join(',');

  try {
    await pool.query('BEGIN');
    await pool.query(
      `
      INSERT INTO counts(form_id, date, count) VALUES ${placeholders}
      ON CONFLICT (form_id, date) DO UPDATE SET count = EXCLUDED.count
    `,
      [formId, ...values]
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    throw error;
  }

  const updatedCounts = await getCountsMap(formId);
  return { ok: true, counts: updatedCounts };
}

export { createForm, getFormById, getFormForAdmin, upsertCounts };
