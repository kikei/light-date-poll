const PREFIX = 'noa:';

const getKey = formId => PREFIX + formId;

export function get(formId) {
  if (!formId) return false;
  try {
    return localStorage.getItem(getKey(formId)) === 'true';
  } catch {
    return false;
  }
}

export function set(formId, value) {
  if (!formId) return;
  try {
    localStorage.setItem(getKey(formId), value ? 'true' : 'false');
  } catch {
    /* ignore write errors */
  }
}
