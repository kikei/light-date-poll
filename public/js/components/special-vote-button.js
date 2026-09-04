import { el } from '../utils/dom.js';

const voteTier = (count, max) => {
  if (max <= 0) return 'vote-tier-low';
  const ratio = count / max;
  if (ratio >= 0.75) return 'vote-tier-top';
  if (ratio >= 0.5) return 'vote-tier-high';
  if (ratio >= 0.25) return 'vote-tier-medium';
  return 'vote-tier-low';
};

/**
 * Create a toggle button for an option that is not a candidate date.
 * @param {Object} params
 * @param {string} params.option - Vote key, also the modifier class suffix.
 * @param {string} params.label
 * @param {boolean} params.active
 * @param {number} params.count
 * @param {number} params.maxCount
 * @param {boolean} params.processing
 * @param {(active: boolean) => void} params.onToggle
 * @returns {{
 *   element: HTMLElement,
 *   update: Function,
 * }}
 */
export function createSpecialVoteButton({
  option,
  label,
  active = false,
  count = 0,
  maxCount = 0,
  processing = false,
  onToggle,
} = {}) {
  const baseClass = `special-vote-btn special-vote-btn--${option}`;
  const badge = el('span', { class: 'pill-badge' });
  const text = el('span', { class: 'special-vote-label' }, label);
  const button = el(
    'button',
    { class: baseClass, type: 'button' },
    text,
    badge
  );

  let currentOnToggle = onToggle;

  const update = ({
    active: a = false,
    count: c = 0,
    maxCount: mc = 0,
    processing: p = false,
    onToggle: nextOnToggle,
  } = {}) => {
    if (typeof nextOnToggle === 'function') currentOnToggle = nextOnToggle;

    badge.textContent = p ? '...' : String(c);
    const tier = voteTier(c, mc);
    const ratio = mc > 0 ? c / mc : 0;
    const scale = mc > 0 ? 0.92 + ratio * 0.16 : 1;
    badge.style.setProperty('--badge-scale', scale.toFixed(3));

    button.className = baseClass;
    button.classList.add(tier);
    if (a) button.classList.add('active');
    if (p) button.classList.add('processing');

    button.disabled = p;
  };

  button.addEventListener('click', () => {
    if (typeof currentOnToggle === 'function') {
      const isActive = button.classList.contains('active');
      currentOnToggle(!isActive);
    }
  });

  update({ active, count, maxCount, processing });

  return { element: button, update };
}
