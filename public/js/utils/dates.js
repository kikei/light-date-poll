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

const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * Format ISO date string with Japanese weekday, e.g. 2025-12-15 (月).
 * @param {string} iso
 * @returns {string}
 */
export function fmtIsoWithWeekday(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return iso;

  const weekday = weekdayNames[new Date(year, month - 1, day).getDay()];
  return weekday ? `${iso} (${weekday})` : iso;
}
