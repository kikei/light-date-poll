const API_BASE = '/api';

const buildError = (message, response, payload) => {
  const error = new Error(message);
  if (response) {
    error.status = response.status;
    error.statusText = response.statusText;
  }
  if (payload !== undefined) {
    error.payload = payload;
  }
  return error;
};

const request = async (path, options = {}) => {
  const { method = 'GET', body, headers = {}, ...rest } = options;
  const init = { method, headers: { ...headers }, ...rest };
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, init);
  } catch (err) {
    throw buildError('Network request failed', null, err);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_) {
      throw buildError('Invalid JSON response', response, text);
    }
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed (${response.status})`;
    throw buildError(message, response, payload);
  }

  return payload;
};

export const createForm = async ({ startDate, endDate, message, days }) =>
  request('/forms', {
    method: 'POST',
    body: { startDate, endDate, message, days },
  });

export const getForm = async ({ formId }) => request(`/forms/${formId}`);

export const getRespondents = async ({ formId }) =>
  request(`/forms/${formId}/respondents`);

export const getFormAdmin = async ({ formId, secret }) =>
  request(`/forms/${formId}/admin?secret=${encodeURIComponent(secret)}`);

export const updateCounts = async ({ formId, secret, counts }) =>
  request(`/forms/${formId}/counts`, {
    method: 'PUT',
    body: { secret, counts },
  });

export const updateMessage = async ({ formId, secret, message }) =>
  request(`/forms/${formId}/message`, {
    method: 'PUT',
    body: { secret, message },
  });

export const vote = async ({ formId, date, userId, nickname }) =>
  request(`/forms/${formId}/vote`, {
    method: 'POST',
    body: { date, userId, nickname },
  });

export const unvote = async ({ formId, date, userId }) =>
  request(`/forms/${formId}/vote`, {
    method: 'DELETE',
    body: { date, userId },
  });
