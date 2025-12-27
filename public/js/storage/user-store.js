const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

const getKey = formId => `user-${formId}`;

export function generateUserId() {
  let id = '';
  for (let i = 0; i < 8; i++)
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  return id;
}

export function getUserId(formId) {
  if (!formId) return null;
  const key = getKey(formId);
  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  } catch {
    /* ignore read errors */
  }
  const userId = generateUserId();
  try {
    localStorage.setItem(key, userId);
  } catch {
    /* ignore write errors */
  }
  return userId;
}
