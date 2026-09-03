import { NOA_KEY } from '../utils/noa-key.js';
import { NOT_ATTENDING_KEY } from '../utils/not-attending-key.js';
import {
  addVote,
  countUserDateVotes,
  findFormById,
  getUserVoteCount,
  removeUserNickname,
  removeVote,
  upsertUserNickname,
} from '../repositories/forms.js';

function isSpecialKey(date) {
  return date === NOA_KEY || date === NOT_ATTENDING_KEY;
}

// The limit covers dates only, matching what the vote screen disables.
// Re-voting a date already held is a no-op insert, so exclude it too:
// otherwise the last date a user picked could not be sent twice.
async function isOverMaxVotes({ formId, userId, date, maxVotes }) {
  if (maxVotes === null) return false;
  const held = await countUserDateVotes({
    formId,
    userId,
    excludeDates: [date, NOA_KEY, NOT_ATTENDING_KEY],
  });
  return held >= maxVotes;
}

async function incrementVote({ formId, date, userId, nickname }) {
  const form = await findFormById(formId);
  if (!form) return { ok: false, error: 'not_found' };

  if (!isSpecialKey(date)) {
    if (!form.options.includes(date))
      return { ok: false, error: 'invalid_date' };
    const overLimit = await isOverMaxVotes({
      formId,
      userId,
      date,
      maxVotes: form.maxVotes,
    });
    if (overLimit) return { ok: false, error: 'max_votes_exceeded' };
  }

  await upsertUserNickname({ formId, userId, nickname });
  await addVote({ formId, date, userId });
  return { ok: true };
}

async function decrementVote({ formId, date, userId }) {
  const form = await findFormById(formId);
  if (!form) return { ok: false, error: 'not_found' };
  if (!isSpecialKey(date) && !form.options.includes(date))
    return { ok: false, error: 'invalid_date' };

  await removeVote({ formId, date, userId });

  const remainingVotes = await getUserVoteCount(formId, userId);
  if (remainingVotes === 0) {
    await removeUserNickname(formId, userId);
  }

  return { ok: true };
}

export { decrementVote, incrementVote };
