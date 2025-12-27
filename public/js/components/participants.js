import { el } from '../utils/dom.js';

/**
 * Create a participants display component showing nicknames as tags
 * @param {Object} params
 * @param {string[]} params.participants
 * @returns {{ element: HTMLElement, update: Function }}
 */
export function createParticipants({ participants = [] } = {}) {
  const header = el('h3', {}, '参加者');
  const count = el('span', { class: 'participant-count' });
  const headerRow = el('div', { class: 'participants-header' }, header, count);
  const tagContainer = el('div', { class: 'participant-tags' });
  const container = el('div', {}, headerRow, tagContainer);

  const update = ({ participants = [] } = {}) => {
    const participantCount = participants.length;
    count.textContent = `(${participantCount}名)`;

    tagContainer.innerHTML = '';

    if (participantCount === 0) {
      const emptyMessage = el(
        'div',
        { class: 'participant-empty' },
        'まだ参加者がいません'
      );
      tagContainer.appendChild(emptyMessage);
      return;
    }

    participants.forEach(nickname => {
      const tag = el('span', { class: 'participant-tag' }, nickname);
      tagContainer.appendChild(tag);
    });
  };

  update({ participants });

  return { element: container, update };
}
