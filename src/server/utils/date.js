const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 365;

function parseISODate(value) {
  if (typeof value !== 'string' || value.length !== 10) return null;
  if (!ISO_DATE_REGEX.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null; // avoid timezone drift
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function pickDates(startDate, endDate) {
  const out = [];
  const s = new Date(startDate);
  const e = new Date(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(toISO(d));
  }
  return out;
}

function clampDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n)) return MAX_DAYS;
  if (n <= 0) return 0;
  return Math.min(Math.floor(n), MAX_DAYS);
}

export { clampDays, parseISODate, pickDates, toISO };
