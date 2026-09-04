import { el } from '../utils/dom.js';
import { fmtJP } from '../utils/dates.js';

/**
 * Render a calendar grid with vote tiers and click handlers.
 * @param {Object} params
 * @param {string[]} params.options
 * @param {Record<string, number>} params.counts
 * @param {string[]} params.voted
 * @param {number|null} params.maxVotes
 * @param {string|null} params.processingDate
 * @param {(date: string, meta: { isDisabled: boolean, isSelected: boolean }) => void} params.onVote
 * @returns {{ calendar: HTMLElement, update: Function }}
 */
export function renderCalendar({
  options = [],
  counts = {},
  voted = [],
  maxVotes = null,
  minAttendees = null,
  processingDate = null,
  onVote,
}) {
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const headerRow = el('div', { class: 'calendar-grid calendar-header' });
  dayNames.forEach((name, idx) =>
    headerRow.append(
      el(
        'div',
        {
          class:
            'day-label' +
            (idx === 0 ? ' sunday' : '') +
            (idx === 6 ? ' saturday' : ''),
        },
        name
      )
    )
  );

  const grid = el('div', { class: 'calendar-grid' });
  const calendar = el('div', { class: 'calendar' }, headerRow, grid);

  const voteTier = (count, max) => {
    if (max <= 0) return 'vote-tier-low';
    const ratio = count / max;
    if (ratio >= 0.75) return 'vote-tier-top';
    if (ratio >= 0.5) return 'vote-tier-high';
    if (ratio >= 0.25) return 'vote-tier-medium';
    return 'vote-tier-low';
  };

  // Marks where the decision is actually being made, so someone who said
  // どの日でもよい has one or two dates to check rather than the whole
  // calendar.
  //
  // Once any date reaches the minimum, only those are marked: voting
  // should narrow the marks, not promote whatever now leads the rest,
  // which would badge a date nobody touched on a couple of votes. The
  // leader is marked only while nothing has reached the minimum at all,
  // as somewhere for the first narrowing to go.
  const badgedDates = (options, counts, minAttendees) => {
    if (minAttendees == null) return new Set();
    const at = options.filter(date => (counts[date] || 0) >= minAttendees);
    if (at.length) return new Set(at);

    const lead = options.reduce(
      (max, date) => Math.max(max, counts[date] || 0),
      0
    );
    if (lead === 0) return new Set();
    return new Set(options.filter(date => (counts[date] || 0) === lead));
  };

  const renderGrid = ({
    options = [],
    counts = {},
    voted = [],
    maxVotes = null,
    minAttendees = null,
    specialCounts = [],
    processingDate = null,
    onVote,
  } = {}) => {
    grid.innerHTML = '';
    const voteCount = voted.length;
    const limitReached = maxVotes !== null && voteCount >= maxVotes;
    const dateMax = options.reduce(
      (max, date) => Math.max(max, counts[date] || 0),
      0
    );
    const maxCount = Math.max(dateMax, ...specialCounts);
    const badged = badgedDates(options, counts, minAttendees);

    options.forEach(date => {
      const currentCount = counts[date] || 0;
      const ratio = maxCount > 0 ? currentCount / maxCount : 0;
      const tierClass = voteTier(currentCount, maxCount);
      const badgeScale = maxCount > 0 ? 0.92 + ratio * 0.16 : 1;
      const isSelected = voted.includes(date);
      const isProcessing = date === processingDate;
      const [year, month, day] = date.split('-').map(Number);
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;
      const isDisabled = (limitReached && !isSelected) || isProcessing;
      const isBadged = badged.has(date);

      const handleActivate = () => {
        if (typeof onVote === 'function') {
          onVote(date, { isDisabled, isSelected });
        }
      };

      grid.append(
        el(
          'div',
          {
            class:
              'date-cell' +
              (isSelected ? ' active' : '') +
              (isSunday ? ' sunday' : '') +
              (isSaturday ? ' saturday' : '') +
              (isDisabled ? ' disabled' : '') +
              (isProcessing ? ' processing' : '') +
              (isBadged ? ' in-contention' : '') +
              (tierClass ? ' ' + tierClass : ''),
            style: `grid-column: ${dayOfWeek + 1}`,
            role: 'button',
            tabIndex: isDisabled ? -1 : 0,
            'aria-pressed': isSelected,
            'aria-disabled': isDisabled,
            onclick: handleActivate,
            onkeydown: e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActivate();
              }
            },
          },
          el('div', { class: 'date-label' }, fmtJP(date)),
          el(
            'span',
            {
              class: 'pill-badge',
              style: `--badge-scale: ${badgeScale.toFixed(3)}`,
            },
            isProcessing ? '...' : String(currentCount)
          )
        )
      );
    });
    return { maxCount };
  };

  renderGrid({
    options,
    counts,
    voted,
    maxVotes,
    minAttendees,
    specialCounts: [],
    processingDate,
    onVote,
  });

  return { calendar, update: renderGrid };
}
