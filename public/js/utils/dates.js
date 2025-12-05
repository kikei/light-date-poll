/**
 * Format ISO date string (YYYY-MM-DD) into Japanese style M/D.
 * Keeps logic pure by relying solely on the provided string.
 * @param {string} iso
 * @returns {string}
 */
export function fmtJP(iso) {
  const [, month, day] = iso.split('-').map(Number);
  return `${month}/${day}`;
}
