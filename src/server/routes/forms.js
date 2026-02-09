import express from 'express';
import {
  createForm,
  getFormById,
  getFormForAdmin,
  updateMessage,
} from '../services/forms.js';
import { getUserNicknames } from '../repositories/forms.js';
import {
  isValidFormId,
  isValidMessage,
  validateDateRange,
} from '../utils/validation.js';

const router = express.Router();

const serverError = res => res.status(500).json({ error: 'server_error' });

const asyncHandler = handler => (req, res) =>
  Promise.resolve(handler(req, res)).catch(() => serverError(res));

const validateFormIdParam = (req, res, next) => {
  if (!isValidFormId(req.params.id))
    return res.status(400).json({ error: 'invalid formId' });
  next();
};

const requireSecret = source => (req, res, next) => {
  const secret = (req[source] || {}).secret;
  if (!secret || typeof secret !== 'string')
    return res.status(400).json({ error: 'missing secret' });
  req.validatedSecret = secret;
  next();
};

const validateMessage = source => (req, res, next) => {
  const messageCheck = isValidMessage((req[source] || {}).message);
  if (!messageCheck.valid)
    return res.status(400).json({ error: messageCheck.error });
  req.validatedMessage = messageCheck.safeMessage;
  next();
};

const validateDateRangeBody = (req, res, next) => {
  const { startDate, endDate } = req.body || {};
  if (!startDate || !endDate)
    return res
      .status(400)
      .json({ error: 'startDate and endDate are required' });

  const range = validateDateRange(startDate, endDate);
  if (!range.valid) return res.status(400).json({ error: range.error });
  req.validatedRange = range;
  next();
};

const respondServiceError = (res, result) => {
  if (result.error === 'not_found')
    return res.status(404).json({ error: 'not_found' });
  if (result.error === 'invalid_secret')
    return res.status(403).json({ error: 'invalid_secret' });
  if (result.error === 'invalid_message')
    return res.status(400).json({ error: result.detail || 'invalid_message' });
  return res.status(400).json({ error: result.error || 'bad_request' });
};

const buildOrigin = req =>
  req.headers['x-forwarded-proto'] && req.headers['host']
    ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
    : '';

// Create form
router.post(
  '/forms',
  validateDateRangeBody,
  validateMessage('body'),
  asyncHandler(async (req, res) => {
    const { days } = req.body || {};
    const result = await createForm({
      startDate: req.validatedRange.startDate,
      endDate: req.validatedRange.endDate,
      message: req.validatedMessage,
      maxVotes: days,
    });
    if (!result.ok) return respondServiceError(res, result);

    const origin = buildOrigin(req);
    res.json({
      formId: result.formId,
      voteUrl: `${origin}/#/vote?formId=${result.formId}`,
      editUrl: `${origin}/#/edit?formId=${result.formId}&secret=${result.secret}`,
    });
  })
);

// Get form
router.get(
  '/forms/:id',
  validateFormIdParam,
  asyncHandler(async (req, res) => {
    const form = await getFormById(req.params.id);
    if (!form) return res.status(404).json({ error: 'not_found' });
    res.json(form);
  })
);

// Get respondents
router.get(
  '/forms/:id/respondents',
  validateFormIdParam,
  asyncHandler(async (req, res) => {
    const respondents = await getUserNicknames(req.params.id);
    res.json({ respondents });
  })
);

// Get form (admin)
router.get(
  '/forms/:id/admin',
  validateFormIdParam,
  requireSecret('query'),
  asyncHandler(async (req, res) => {
    const result = await getFormForAdmin({
      formId: req.params.id,
      secret: req.validatedSecret,
    });
    if (!result.ok) return respondServiceError(res, result);
    res.json(result.form);
  })
);

// Update message (admin)
router.put(
  '/forms/:id/message',
  validateFormIdParam,
  requireSecret('body'),
  validateMessage('body'),
  asyncHandler(async (req, res) => {
    const result = await updateMessage({
      formId: req.params.id,
      secret: req.validatedSecret,
      message: req.validatedMessage,
    });
    if (!result.ok) return respondServiceError(res, result);
    res.json({ ok: true, message: result.message });
  })
);

export default router;
