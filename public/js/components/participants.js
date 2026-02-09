import { el } from '../utils/dom.js';

/**
 * Create a respondents display component
 * showing nicknames as tags
 * @param {Object} params
 * @param {string[]} params.respondents
 * @returns {{ element: HTMLElement, update: Function }}
 */
export function createRespondents({ respondents = [] } = {}) {
  const header = el('h3', {}, '回答済み');
  const count = el('span', {
    class: 'respondent-count',
  });
  const headerRow = el('div', { class: 'respondents-header' }, header, count);
  const tagContainer = el('div', {
    class: 'respondent-tags',
  });
  const container = el('div', {}, headerRow, tagContainer);

  const update = ({ respondents = [] } = {}) => {
    const n = respondents.length;
    count.textContent = `(${n}名)`;

    tagContainer.innerHTML = '';

    if (n === 0) {
      const emptyMessage = el(
        'div',
        { class: 'respondent-empty' },
        'まだ回答者がいません'
      );
      tagContainer.appendChild(emptyMessage);
      return;
    }

    respondents.forEach(nickname => {
      const tag = el('span', { class: 'respondent-tag' }, nickname);
      tagContainer.appendChild(tag);
    });
  };

  update({ respondents });

  return { element: container, update };
}
