import { parseISODate } from './date.js';

const FORM_ID_LENGTH = 8;
const MAX_MESSAGE_LENGTH = 2000;

function isValidFormId(id) {
  return typeof id === 'string' && id.length === FORM_ID_LENGTH;
}

function isValidISODate(value) {
  const date = parseISODate(value);
  if (!date) return { valid: false, error: 'invalid date format (YYYY-MM-DD)' };
  return { valid: true, date };
}

function isValidMessage(message) {
  if (message == null) return { valid: true, safeMessage: '' };
  if (typeof message !== 'string')
    return { valid: false, error: 'message must be a string' };
  if (message.length > MAX_MESSAGE_LENGTH)
    return { valid: false, error: 'message too long (max 2000)' };
  return { valid: true, safeMessage: message };
}

function validateDateRange(startISO, endISO) {
  const start = isValidISODate(startISO);
  if (!start.valid) return start;
  const end = isValidISODate(endISO);
  if (!end.valid) return end;
  if (start.date.getTime() > end.date.getTime())
    return { valid: false, error: 'startDate must be on or before endDate' };
  return { valid: true, startDate: start.date, endDate: end.date };
}

export {
  FORM_ID_LENGTH,
  MAX_MESSAGE_LENGTH,
  isValidFormId,
  isValidISODate,
  isValidMessage,
  validateDateRange,
};
