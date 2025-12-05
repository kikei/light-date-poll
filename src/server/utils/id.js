const FORM_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SECRET_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function rand(chars, n) {
  let s = '';
  for (let i = 0; i < n; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function rid(n = 8) {
  return rand(FORM_ID_CHARS, n);
}

function rsecret(n = 12) {
  return rand(SECRET_CHARS, n);
}

export { rid, rsecret };
