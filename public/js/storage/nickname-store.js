const KEY = 'nickname';

export function get() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function save(nickname) {
  if (nickname == null) return;
  try {
    localStorage.setItem(KEY, nickname);
  } catch {
    /* ignore write errors */
  }
}
