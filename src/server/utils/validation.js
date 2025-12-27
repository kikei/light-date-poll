import { parseISODate } from './date.js';

const FORM_ID_LENGTH = 8;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NICKNAME_LENGTH = 40;

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

function isValidNickname(nickname) {
  if (typeof nickname !== 'string')
    return { valid: false, error: 'invalid_nickname' };
  const normalized = nickname.replace(/\s+/g, ' ').trim();
  if (!normalized) return { valid: false, error: 'invalid_nickname' };
  if (normalized.length > MAX_NICKNAME_LENGTH)
    return { valid: false, error: 'nickname_too_long' };
  return { valid: true, safeNickname: normalized };
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
  isValidFormId,
  isValidISODate,
  isValidMessage,
  isValidNickname,
  validateDateRange,
};
