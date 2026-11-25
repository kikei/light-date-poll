// Whether this browser has the given special option selected on a form.
// The prefix is per option so 参加しない and どの日でもよい cannot collide.
const getKey = (prefix, formId) => `${prefix}:${formId}`;

export function get(prefix, formId) {
  if (!formId) return false;
  try {
    return localStorage.getItem(getKey(prefix, formId)) === 'true';
  } catch {
    return false;
  }
}

export function set(prefix, formId, value) {
  if (!formId) return;
  try {
    localStorage.setItem(getKey(prefix, formId), value ? 'true' : 'false');
  } catch {
    /* ignore write errors */
  }
}
