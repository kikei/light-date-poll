import { el } from '../../utils/dom.js';
import { createCopyButton } from '../../utils/copy.js';

const buildUrlInput = (url, id) => {
  const input = el('input', {
    type: 'text',
    value: url,
    readonly: true,
    class: 'url-input',
    id,
  });
  input.size = Math.min(Math.max(url.length + 2, 40), 140);
  return input;
};

// Views come from localStorage, so a private window or an in-app browser
// counts again. The unit is UU rather than 人 because that is what is
// actually being measured.
const summaryText = form => {
  const views = form.viewCount ?? 0;
  const respondents = form.respondentCount ?? 0;
  const dateVoters = form.dateVoterCount ?? 0;
  const noneOfAbove = form.noneOfAboveCount ?? 0;
  const notAttending = form.notAttendingCount ?? 0;
  return (
    `${views} UU / 回答 ${respondents} 名 ` +
    `(日付選択 ${dateVoters} / それ以外 ${noneOfAbove} ` +
    `/ 参加しない ${notAttending})`
  );
};

export function createOverviewSection({ formId, secret }) {
  const voteUrl = `${location.origin}${location.pathname}#/vote?formId=${formId}`;
  const voteUrlId = `vote-url-${formId}`;
  const voteUrlInput = buildUrlInput(voteUrl, voteUrlId);
  const voteCopyBtn = createCopyButton({ text: voteUrl, input: voteUrlInput });
  const voteOpenBtn = el(
    'a',
    {
      href: voteUrl,
      target: '_blank',
      rel: 'noopener',
      class: 'button-link',
    },
    '開く ↗'
  );

  const editUrl = `${location.origin}${location.pathname}#/edit?formId=${formId}&secret=${secret}`;
  const editUrlId = `edit-url-${formId}`;
  const editUrlInput = buildUrlInput(editUrl, editUrlId);
  const editCopyBtn = createCopyButton({ text: editUrl, input: editUrlInput });

  // Only the figures change on load; rebuilding the card would throw away
  // the URL inputs and their copy buttons.
  const figures = el('div', { class: 'summary-figures' }, '読み込み中...');

  const element = el(
    'div',
    { class: 'card' },
    el('h3', {}, '投票の概要'),
    el(
      'div',
      { class: 'form-group' },
      el('label', { for: voteUrlId }, '投票 URL'),
      el('div', { class: 'url-row' }, voteUrlInput, voteCopyBtn, voteOpenBtn)
    ),
    el(
      'div',
      { class: 'form-group' },
      el('label', { for: editUrlId }, '編集 URL'),
      el('div', { class: 'url-row' }, editUrlInput, editCopyBtn)
    ),
    // Below the URLs: copying one is the first thing done with a new form.
    el('div', { class: 'form-group' }, el('label', {}, '回答状況'), figures)
  );

  return {
    element,
    render: form => {
      figures.textContent = summaryText(form);
    },
    showLoading: () => {
      figures.textContent = '読み込み中...';
    },
    showError: err => {
      figures.textContent = '読み込み失敗: ' + err.message;
    },
  };
}
