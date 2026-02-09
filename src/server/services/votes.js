import { pool } from '../db/pool.js';
import {
  addVote,
  getUserNoneOfAbove,
  getUserVoteCount,
  removeUserNickname,
  removeVote,
  setNoneOfAbove,
  upsertUserNickname,
} from '../repositories/forms.js';

async function getFormOptions(formId) {
  const formResult = await pool.query(
    'SELECT options FROM forms WHERE form_id = $1',
    [formId]
  );
  if (!formResult.rowCount) return null;
  return formResult.rows[0].options;
}

async function formExists(formId) {
  const result = await pool.query('SELECT 1 FROM forms WHERE form_id = $1', [
    formId,
  ]);
  return result.rowCount > 0;
}

async function incrementVote({ formId, date, userId, nickname }) {
  const options = await getFormOptions(formId);
  if (!options) return { ok: false, error: 'not_found' };
  if (!options.includes(date)) return { ok: false, error: 'invalid_date' };

  await upsertUserNickname({ formId, userId, nickname });
  await addVote({ formId, date, userId });
  return { ok: true };
}

async function decrementVote({ formId, date, userId }) {
  const options = await getFormOptions(formId);
  if (!options) return { ok: false, error: 'not_found' };
  if (!options.includes(date)) return { ok: false, error: 'invalid_date' };

  await removeVote({ formId, date, userId });

  const remainingVotes = await getUserVoteCount(formId, userId);
  if (remainingVotes === 0) {
    const noa = await getUserNoneOfAbove(formId, userId);
    if (!noa) {
      await removeUserNickname(formId, userId);
    }
  }

  return { ok: true };
}

async function toggleNoneOfAbove({ formId, userId, nickname, value }) {
  const exists = await formExists(formId);
  if (!exists) return { ok: false, error: 'not_found' };

  if (value) {
    await upsertUserNickname({ formId, userId, nickname });
    await setNoneOfAbove(formId, userId, true);
  } else {
    await setNoneOfAbove(formId, userId, false);
    const remainingVotes = await getUserVoteCount(formId, userId);
    if (remainingVotes === 0) {
      await removeUserNickname(formId, userId);
    }
  }

  return { ok: true };
}

export { decrementVote, incrementVote, toggleNoneOfAbove };
