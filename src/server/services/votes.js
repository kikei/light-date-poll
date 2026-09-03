import { pool } from '../db/pool.js';
import { NOA_KEY } from '../utils/noa-key.js';
import { NOT_ATTENDING_KEY } from '../utils/not-attending-key.js';
import {
  addVote,
  getUserVoteCount,
  removeUserNickname,
  removeVote,
  upsertUserNickname,
} from '../repositories/forms.js';

function isSpecialKey(date) {
  return date === NOA_KEY || date === NOT_ATTENDING_KEY;
}

async function getFormOptions(formId) {
  const formResult = await pool.query(
    'SELECT options FROM forms WHERE form_id = $1',
    [formId]
  );
  if (!formResult.rowCount) return null;
  return formResult.rows[0].options;
}

async function incrementVote({ formId, date, userId, nickname }) {
  const options = await getFormOptions(formId);
  if (!options) return { ok: false, error: 'not_found' };
  if (!isSpecialKey(date) && !options.includes(date))
    return { ok: false, error: 'invalid_date' };

  await upsertUserNickname({ formId, userId, nickname });
  await addVote({ formId, date, userId });
  return { ok: true };
}

async function decrementVote({ formId, date, userId }) {
  const options = await getFormOptions(formId);
  if (!options) return { ok: false, error: 'not_found' };
  if (!isSpecialKey(date) && !options.includes(date))
    return { ok: false, error: 'invalid_date' };

  await removeVote({ formId, date, userId });

  const remainingVotes = await getUserVoteCount(formId, userId);
  if (remainingVotes === 0) {
    await removeUserNickname(formId, userId);
  }

  return { ok: true };
}

export { decrementVote, incrementVote };
