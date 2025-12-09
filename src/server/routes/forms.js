import express from 'express';
import { createForm, getFormById, getFormForAdmin } from '../services/forms.js';
import {
  isValidFormId,
  isValidMessage,
  validateDateRange,
} from '../utils/validation.js';

const router = express.Router();

// Create form
router.post('/forms', async (req, res) => {
  try {
    const { startDate, endDate, message, days } = req.body || {};
    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ error: 'startDate and endDate are required' });

    const messageCheck = isValidMessage(message);
    if (!messageCheck.valid)
      return res.status(400).json({ error: messageCheck.error });
    const safeMessage = messageCheck.safeMessage;

    const range = validateDateRange(startDate, endDate);
    if (!range.valid) return res.status(400).json({ error: range.error });

    const form = await createForm({
      startDate: range.startDate,
      endDate: range.endDate,
      message: safeMessage,
      maxVotes: days,
    });

    const origin =
      req.headers['x-forwarded-proto'] && req.headers['host']
        ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
        : '';
    res.json({
      formId: form.formId,
      voteUrl: `${origin}/#/vote?formId=${form.formId}`,
      editUrl: `${origin}/#/edit?formId=${form.formId}&secret=${form.secret}`,
    });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// Get form
router.get('/forms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidFormId(id))
      return res.status(400).json({ error: 'invalid formId' });

    const form = await getFormById(id);
    if (!form) return res.status(404).json({ error: 'not_found' });

    res.json(form);
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// Get form (admin)
router.get('/forms/:id/admin', async (req, res) => {
  try {
    const { id } = req.params;
    const { secret } = req.query;
    if (!isValidFormId(id))
      return res.status(400).json({ error: 'invalid formId' });
    if (!secret || typeof secret !== 'string')
      return res.status(400).json({ error: 'missing secret' });

    const result = await getFormForAdmin({ formId: id, secret });
    if (!result.ok) {
      if (result.error === 'not_found')
        return res.status(404).json({ error: 'not_found' });
      if (result.error === 'invalid_secret')
        return res.status(403).json({ error: 'invalid_secret' });
    }

    res.json(result.form);
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
