import express from 'express';
import { decrementVote, incrementVote } from '../services/votes.js';
import { upsertCounts } from '../services/forms.js';
import { toISO } from '../utils/date.js';
import {
  isValidFormId,
  isValidISODate,
  isValidNickname,
} from '../utils/validation.js';

const router = express.Router();

// Vote (+1)
router.post('/forms/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, nickname } = req.body || {};
    if (!isValidFormId(id))
      return res.status(400).json({ error: 'invalid formId' });
    if (!date) return res.status(400).json({ error: 'missing date' });
    if (!nickname) return res.status(400).json({ error: 'missing nickname' });
    const isoDateResult = isValidISODate(date);
    if (!isoDateResult.valid)
      return res.status(400).json({ error: isoDateResult.error });
    const nicknameResult = isValidNickname(nickname);
    if (!nicknameResult.valid)
      return res.status(400).json({ error: nicknameResult.error });
    const isoDate = toISO(isoDateResult.date);

    const result = await incrementVote({
      formId: id,
      date: isoDate,
      nickname: nicknameResult.safeNickname,
    });
    if (!result.ok) {
      if (result.error === 'not_found')
        return res.status(404).json({ error: 'form not found' });
      if (result.error === 'invalid_date')
        return res.status(400).json({ error: 'invalid date' });
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
    const { date } = req.body || {};
    if (!isValidFormId(id))
      return res.status(400).json({ error: 'invalid formId' });
    if (!date) return res.status(400).json({ error: 'missing date' });
    const isoDateResult = isValidISODate(date);
    if (!isoDateResult.valid)
      return res.status(400).json({ error: isoDateResult.error });
    const isoDate = toISO(isoDateResult.date);

    const result = await decrementVote({ formId: id, date: isoDate });
    if (!result.ok) {
      if (result.error === 'not_found')
        return res.status(404).json({ error: 'form not found' });
      if (result.error === 'invalid_date')
        return res.status(400).json({ error: 'invalid date' });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// Update counts (admin)
router.put('/forms/:id/counts', async (req, res) => {
  try {
    const { id } = req.params;
    const { secret, counts } = req.body || {};
    if (!isValidFormId(id))
      return res.status(400).json({ error: 'invalid formId' });
    if (!secret || typeof secret !== 'string')
      return res.status(400).json({ error: 'missing secret' });

    const result = await upsertCounts({ formId: id, secret, counts });
    if (!result.ok) {
      if (result.error === 'not_found')
        return res.status(404).json({ error: 'not_found' });
      if (result.error === 'invalid_secret')
        return res.status(403).json({ error: 'invalid_secret' });
      if (result.error === 'invalid_date')
        return res.status(400).json({ error: 'invalid date' });
      if (result.error === 'invalid_counts')
        return res.status(400).json({ error: 'invalid counts' });
      if (result.error === 'invalid_count')
        return res.status(400).json({ error: 'invalid count' });
    }

    res.json({ ok: true, counts: result.counts });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
