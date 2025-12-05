import { el } from '../utils/dom.js';

/**
 * Create a status bar with message + counter + warning timer.
 * @param {Object} params
 * @param {number} params.voteCount
 * @param {number|null} params.maxVotes
 * @returns {{ element: HTMLElement, update: Function, showWarning: Function, reset: Function }}
 */
export function createStatusBar({ voteCount = 0, maxVotes = null } = {}) {
  const normalMessage = '日付を選択して下さい。';
  const warningMessage = 'これ以上、選択できません。';
  const voteStatus = el('div', { class: 'vote-status' }, normalMessage);
  const voteCounter = el('div', { class: 'vote-counter' });
  const statusRow = el('div', { class: 'status-row' }, voteStatus, voteCounter);

  let warningTimer = null;

  const setNormalStatus = () => {
    voteStatus.textContent = normalMessage;
  };

  const showWarning = () => {
    voteStatus.textContent = warningMessage;
    clearTimeout(warningTimer);
    warningTimer = setTimeout(setNormalStatus, 3000);
  };

  const updateCounter = (remaining, max) => {
    if (max === null) {
      voteCounter.style.display = 'none';
      voteCounter.textContent = '';
      return;
    }
    voteCounter.style.display = '';
    voteCounter.textContent = `残り ${remaining}/${max}`;
  };

  const update = ({ voteCount = 0, maxVotes = null } = {}) => {
    const remaining =
      maxVotes === null ? null : Math.max(maxVotes - voteCount, 0);
    updateCounter(remaining, maxVotes);
  };

  const reset = () => {
    clearTimeout(warningTimer);
    setNormalStatus();
  };

  update({ voteCount, maxVotes });

  return { element: statusRow, update, showWarning, reset };
}
