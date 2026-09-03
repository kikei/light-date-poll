import { el } from '../utils/dom.js';

/**
 * Create a respondent tally line.
 * Names are not collected, so the tally is the only trace of who answered.
 * @param {Object} params
 * @param {number} params.count
 * @returns {{ element: HTMLElement, update: Function }}
 */
export function createRespondentCount({ count = 0 } = {}) {
  const line = el('div', { class: 'respondent-count' });

  const update = ({ count: c = 0 } = {}) => {
    line.style.display = c === 0 ? 'none' : '';
    line.textContent = `回答 ${c} 名`;
  };

  update({ count });

  return { element: line, update };
}
