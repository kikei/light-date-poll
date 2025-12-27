const KEY = 'last-nickname';

export function getLastNickname() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function saveLastNickname(nickname) {
  if (nickname == null) return;
  try {
    localStorage.setItem(KEY, nickname);
  } catch {
    /* ignore write errors */
  }
}
