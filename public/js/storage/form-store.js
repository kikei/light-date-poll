const PREFIX = 'form:';

const getKey = formId => PREFIX + formId;

export function get(formId) {
  if (!formId) return null;
  try {
    return JSON.parse(localStorage.getItem(getKey(formId)));
  } catch {
    return null;
  }
}

export function save(formId, secret) {
  if (!formId || !secret) return;
  const payload = {
    formId,
    secret,
    createdAt: Date.now(),
  };
  try {
    localStorage.setItem(getKey(formId), JSON.stringify(payload));
  } catch {
    /* ignore write errors */
  }
}
