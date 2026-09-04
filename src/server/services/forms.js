import { clampDays, pickDates, toISO } from '../utils/date.js';
import { rid, rsecret } from '../utils/id.js';
import { NOA_KEY } from '../utils/noa-key.js';
import { NOT_ATTENDING_KEY } from '../utils/not-attending-key.js';
import { isValidISODate, isValidMessage } from '../utils/validation.js';
import {
  countDateVoters,
  countFormViews,
  countRespondents,
  createFormRecord,
  findFormById,
  getCountAdjustments,
  getVoteCounts,
  recordFormView,
  saveCountAdjustments as persistAdjustments,
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
  return Object.fromEntries(rows.map(r => [String(r.date), Number(r.count)]));
}

function rowsToAdjustmentsMap(rows) {
  return Object.fromEntries(
    rows.map(r => [String(r.date), Number(r.adjustment)])
  );
}

// A positive adjustment can put a figure on a date nobody voted for, so the
// result covers the keys of both maps rather than just the tallied ones.
function applyAdjustments(tallies, adjustments) {
  const keys = new Set([...Object.keys(tallies), ...Object.keys(adjustments)]);
  const displayed = {};
  for (const key of keys) {
    const total = (tallies[key] ?? 0) + (adjustments[key] ?? 0);
    displayed[key] = Math.max(0, total);
  }
  return displayed;
}

function withoutSpecialKeys(map) {
  const out = {};
  for (const [key, val] of Object.entries(map)) {
    if (key !== NOA_KEY && key !== NOT_ATTENDING_KEY) out[key] = val;
  }
  return out;
}

async function getFormWithCounts(formId) {
  const form = await findFormById(formId);
  if (!form) return null;
  const tallies = rowsToCountsMap(await getVoteCounts(formId));
  const adjustments = rowsToAdjustmentsMap(await getCountAdjustments(formId));
  const displayed = applyAdjustments(tallies, adjustments);
  const respondentCount = await countRespondents(formId);
  return {
    form,
    tallies,
    adjustments,
    displayed,
    counts: withoutSpecialKeys(displayed),
    respondentCount,
    noneOfAboveCount: displayed[NOA_KEY] ?? 0,
    notAttendingCount: displayed[NOT_ATTENDING_KEY] ?? 0,
  };
}

// The editor needs all three numbers per key: the tally it is correcting,
// the correction, and what participants end up seeing.
function buildFigures({ options, tallies, adjustments, displayed }) {
  const figures = {};
  for (const key of [...options, NOA_KEY, NOT_ATTENDING_KEY]) {
    figures[key] = {
      tally: tallies[key] ?? 0,
      adjustment: adjustments[key] ?? 0,
      displayed: displayed[key] ?? 0,
    };
  }
  return figures;
}

function figuresFor(result) {
  return buildFigures({
    options: result.form.options,
    tallies: result.tallies,
    adjustments: result.adjustments,
    displayed: result.displayed,
  });
}

async function createForm({ startDate, endDate, message, maxVotes }) {
  const formId = rid();
  const secret = rsecret();
  const options = pickDates(startDate, endDate);
  const normalizedMaxVotes = normalizeMaxVotes(maxVotes);

  const messageResult = normalizeMessageInput(message);
  if (!messageResult.ok)
    return {
      ok: false,
      error: 'invalid_message',
      detail: messageResult.error,
    };

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
    noneOfAboveCount: result.noneOfAboveCount,
    notAttendingCount: result.notAttendingCount,
  };
}

// A view is one browser profile that opened the vote screen, deduped by
// the same id the votes are keyed on. Only the organizer sees the number:
// on the vote screen it would read as being watched.
async function registerFormView({ formId, userId }) {
  const form = await findFormById(formId);
  if (!form) return { ok: false, error: 'not_found' };
  await recordFormView({ formId, userId });
  return { ok: true };
}

async function getFormForAdmin({ formId, secret }) {
  const result = await getFormWithCounts(formId);
  if (!result) return { ok: false, error: 'not_found' };
  if (result.form.secret !== secret)
    return { ok: false, error: 'invalid_secret' };

  const viewCount = await countFormViews(formId);
  const dateVoterCount = await countDateVoters({
    formId,
    excludeDates: [NOA_KEY, NOT_ATTENDING_KEY],
  });

  return {
    ok: true,
    form: {
      formId,
      message: result.form.message,
      options: result.form.options,
      maxVotes: result.form.maxVotes,
      counts: result.counts,
      figures: figuresFor(result),
      viewCount,
      respondentCount: result.respondentCount,
      dateVoterCount,
      noneOfAboveCount: result.noneOfAboveCount,
      notAttendingCount: result.notAttendingCount,
    },
  };
}

const MAX_ADJUSTMENT = 10000;

function normalizeAdjustmentKey(date, allowed) {
  if (date === NOA_KEY || date === NOT_ATTENDING_KEY) return { ok: true, date };
  const dateResult = isValidISODate(date);
  if (!dateResult.valid) return { ok: false, error: 'invalid_date' };
  const isoDate = toISO(dateResult.date);
  if (!allowed.has(isoDate)) return { ok: false, error: 'invalid_date' };
  return { ok: true, date: isoDate };
}

// Adjustments are signed: a correction usually removes votes that should
// not be there. Zero is kept in the list so the repository can clear it.
function normalizeAdjustmentsInput(adjustments, options) {
  if (
    !adjustments ||
    typeof adjustments !== 'object' ||
    Array.isArray(adjustments)
  )
    return { ok: false, error: 'invalid_adjustments' };

  const allowed = new Set(options || []);
  const entries = [];
  for (const [date, value] of Object.entries(adjustments)) {
    const key = normalizeAdjustmentKey(date, allowed);
    if (!key.ok) return key;
    const n = Number(value);
    if (!Number.isInteger(n)) return { ok: false, error: 'invalid_adjustment' };
    if (Math.abs(n) > MAX_ADJUSTMENT)
      return { ok: false, error: 'adjustment_out_of_range' };
    entries.push({ date: key.date, adjustment: n });
  }

  return { ok: true, entries };
}

async function updateAdjustments({ formId, secret, adjustments }) {
  const form = await findFormById(formId);
  if (!form) return { ok: false, error: 'not_found' };
  if (form.secret !== secret) return { ok: false, error: 'invalid_secret' };

  const normalized = normalizeAdjustmentsInput(adjustments, form.options);
  if (!normalized.ok) return normalized;

  await persistAdjustments(formId, normalized.entries);

  const updated = await getFormWithCounts(formId);
  return { ok: true, figures: figuresFor(updated) };
}

async function updateMessage({ formId, secret, message }) {
  const form = await findFormById(formId);
  if (!form) return { ok: false, error: 'not_found' };
  if (form.secret !== secret) return { ok: false, error: 'invalid_secret' };

  const messageCheck = normalizeMessageInput(message);
  if (!messageCheck.ok)
    return {
      ok: false,
      error: 'invalid_message',
      detail: messageCheck.error,
    };

  await persistMessage(formId, messageCheck.message);

  return { ok: true, message: messageCheck.message };
}

export {
  createForm,
  getFormById,
  getFormForAdmin,
  registerFormView,
  updateAdjustments,
  updateMessage,
};
