import express from 'express';
import { decrementVote, incrementVote } from '../services/votes.js';
import { toISO } from '../utils/date.js';
import { isValidFormId, isValidISODate } from '../utils/validation.js';

const router = express.Router();

// Vote (+1)
router.post('/forms/:id/vote', async (req, res) => {
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

    const result = await incrementVote({ formId: id, date: isoDate });
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

export default router;
