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
 * Create a「それ以外」toggle button
 * @param {Object} params
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
export function createNoneOfAboveButton({
  active = false,
  count = 0,
  maxCount = 0,
  processing = false,
  onToggle,
} = {}) {
  const badge = el('span', { class: 'pill-badge' });
  const label = el('span', { class: 'none-of-above-label' }, 'それ以外');
  const button = el(
    'button',
    {
      class: 'none-of-above-btn',
      type: 'button',
    },
    label,
    badge
  );

  const container = el('div', { class: 'none-of-above-container' }, button);

  const update = ({
    active: a = false,
    count: c = 0,
    maxCount: mc = 0,
    processing: p = false,
  } = {}) => {
    badge.textContent = p ? '...' : String(c);
    const tier = voteTier(c, mc);
    const ratio = mc > 0 ? c / mc : 0;
    const scale = mc > 0 ? 0.92 + ratio * 0.16 : 1;
    badge.style.setProperty('--badge-scale', scale.toFixed(3));

    button.className = 'none-of-above-btn';
    button.classList.add(tier);
    if (a) button.classList.add('active');
    if (p) button.classList.add('processing');

    button.disabled = p;
  };

  button.addEventListener('click', () => {
    if (typeof onToggle === 'function') {
      const isActive = button.classList.contains('active');
      onToggle(!isActive);
    }
  });

  update({ active, count, maxCount, processing });

  return { element: container, update };
}
