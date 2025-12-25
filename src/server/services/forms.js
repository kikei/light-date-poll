import { clampDays, pickDates, toISO } from '../utils/date.js';
import { rid, rsecret } from '../utils/id.js';
import { isValidISODate, isValidMessage } from '../utils/validation.js';
import {
  createFormRecord,
  findFormById,
  getVoteCounts,
  upsertCounts as persistCounts,
  updateMessage as persistMessage,
} from '../repositories/forms.js';

function normalizeMessageInput(message) {
  const result = isValidMessage(message);
  if (!result.valid) return { ok: false, error: result.error };
  return { ok: true, message: result.safeMessage };
}

function normalizeMaxVotes(maxVotes) {
  return maxVotes == null ? null : clampDays(Number(maxVotes));
}

function rowsToCountsMap(rows) {
  return Object.fromEntries(
    rows.map(r => {
      const date = r.date instanceof Date ? r.date : new Date(r.date);
      return [date.toISOString().slice(0, 10), Number(r.count)];
    })
  );
}

async function getCountsMap(formId) {
  const rows = await getVoteCounts(formId);
  return rowsToCountsMap(rows);
}

async function getFormWithCounts(formId) {
  const form = await findFormById(formId);
  if (!form) return null;
  const counts = await getCountsMap(formId);
  return { form, counts };
}

async function createForm({ startDate, endDate, message, maxVotes }) {
  const formId = rid();
  const secret = rsecret();
  const options = pickDates(startDate, endDate);
  const normalizedMaxVotes = normalizeMaxVotes(maxVotes);

  const messageResult = normalizeMessageInput(message);
  if (!messageResult.ok)
    return { ok: false, error: 'invalid_message', detail: messageResult.error };

  await createFormRecord({
    formId,
    message: messageResult.message,
    options,
    secret,
    maxVotes: normalizedMaxVotes,
  });

  return {
    ok: true,
    formId,
    secret,
    options,
    maxVotes: normalizedMaxVotes,
  };
}

async function getFormById(formId) {
  const result = await getFormWithCounts(formId);
  if (!result) return null;

  return {
    formId,
    message: result.form.message,
    options: result.form.options,
    maxVotes: result.form.maxVotes,
    counts: result.counts,
  };
}

async function getFormForAdmin({ formId, secret }) {
  const result = await getFormWithCounts(formId);
  if (!result) return { ok: false, error: 'not_found' };
  if (result.form.secret !== secret)
    return { ok: false, error: 'invalid_secret' };

  return {
    ok: true,
    form: {
      formId,
      message: result.form.message,
      options: result.form.options,
      maxVotes: result.form.maxVotes,
      counts: result.counts,
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
  const form = await findFormById(formId);
  if (!form) return { ok: false, error: 'not_found' };
  if (form.secret !== secret) return { ok: false, error: 'invalid_secret' };

  const normalized = normalizeCountsInput(counts, form.options);
  if (!normalized.ok) return normalized;

  const entries = normalized.entries;
  if (entries.length) {
    await persistCounts(formId, entries);
  }

  const updatedCounts = await getCountsMap(formId);
  return { ok: true, counts: updatedCounts };
}

async function updateMessage({ formId, secret, message }) {
  const form = await findFormById(formId);
  if (!form) return { ok: false, error: 'not_found' };
  if (form.secret !== secret) return { ok: false, error: 'invalid_secret' };

  const messageCheck = normalizeMessageInput(message);
  if (!messageCheck.ok)
    return { ok: false, error: 'invalid_message', detail: messageCheck.error };

  await persistMessage(formId, messageCheck.message);

  return { ok: true, message: messageCheck.message };
}

export {
  createForm,
  getFormById,
  getFormForAdmin,
  upsertCounts,
  updateMessage,
};
