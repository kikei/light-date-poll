import express from 'express';
import { decrementVote, incrementVote } from '../services/votes.js';
import { toISO } from '../utils/date.js';
import { ANY_DATE_KEY } from '../utils/any-date-key.js';
import { NOT_ATTENDING_KEY } from '../utils/not-attending-key.js';
import { isValidFormId, isValidISODate } from '../utils/validation.js';

const router = express.Router();

function isValidUserId(userId) {
  return typeof userId === 'string' && userId.trim().length > 0;
}

function parseDate(raw) {
  if (raw === ANY_DATE_KEY || raw === NOT_ATTENDING_KEY)
    return { ok: true, date: raw };
  const result = isValidISODate(raw);
  if (!result.valid) return { ok: false, error: result.error };
  return { ok: true, date: toISO(result.date) };
}

// Vote (+1)
router.post('/forms/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, userId } = req.body || {};
    if (!isValidFormId(id))
      return res.status(400).json({ error: 'invalid formId' });
    if (!date) return res.status(400).json({ error: 'missing date' });
    if (userId == null)
      return res.status(400).json({ error: 'missing userId' });
    if (!isValidUserId(userId))
      return res.status(400).json({ error: 'invalid userId' });
    const parsed = parseDate(date);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const safeUserId = userId.trim();

    const result = await incrementVote({
      formId: id,
      date: parsed.date,
      userId: safeUserId,
    });
    if (!result.ok) {
      if (result.error === 'not_found')
        return res.status(404).json({ error: 'form not found' });
      if (result.error === 'invalid_date')
        return res.status(400).json({ error: 'invalid date' });
      if (result.error === 'max_votes_exceeded')
        return res.status(409).json({ error: 'max_votes_exceeded' });
      return res.status(400).json({ error: result.error || 'bad_request' });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// Unvote (-1)
router.delete('/forms/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, userId } = req.body || {};
    if (!isValidFormId(id))
      return res.status(400).json({ error: 'invalid formId' });
    if (!date) return res.status(400).json({ error: 'missing date' });
    if (userId == null)
      return res.status(400).json({ error: 'missing userId' });
    if (!isValidUserId(userId))
      return res.status(400).json({ error: 'invalid userId' });
    const parsed = parseDate(date);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const safeUserId = userId.trim();

    const result = await decrementVote({
      formId: id,
      date: parsed.date,
      userId: safeUserId,
    });
    if (!result.ok) {
      if (result.error === 'not_found')
        return res.status(404).json({ error: 'form not found' });
      if (result.error === 'invalid_date')
        return res.status(400).json({ error: 'invalid date' });
      return res.status(400).json({ error: result.error || 'bad_request' });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
