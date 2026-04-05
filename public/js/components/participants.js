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
  const card = el('div', { class: 'card' }, headerRow, tagContainer);

  const update = ({ respondents = [] } = {}) => {
    const n = respondents.length;
    card.style.display = n === 0 ? 'none' : '';
    count.textContent = `(${n}名)`;

    tagContainer.innerHTML = '';
    respondents.forEach(nickname => {
      const tag = el('span', { class: 'respondent-tag' }, nickname);
      tagContainer.appendChild(tag);
    });
  };

  update({ respondents });

  return { element: card, update };
}
