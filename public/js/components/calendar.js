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

  const renderGrid = ({
    options = [],
    counts = {},
    voted = [],
    maxVotes = null,
    processingDate = null,
    onVote,
  } = {}) => {
    grid.innerHTML = '';
    const voteCount = voted.length;
    const limitReached = maxVotes !== null && voteCount >= maxVotes;
    const maxCount = options.reduce(
      (max, date) => Math.max(max, counts[date] || 0),
      0
    );

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
  };

  renderGrid({ options, counts, voted, maxVotes, processingDate, onVote });

  return { calendar, update: renderGrid };
}
