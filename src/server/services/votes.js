import { pool } from '../db/pool.js';
import {
  addVote,
  removeVote,
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
  return { ok: true };
}

export { decrementVote, incrementVote };
