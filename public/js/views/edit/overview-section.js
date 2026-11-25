import { el } from '../../utils/dom.js';
import { createCopyButton } from '../../utils/copy.js';
import { fmtDateTime } from '../../utils/dates.js';

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
// counts again. The unit is UU rather than 名 because that is what is
// actually being measured; the other two count people who answered.
const summaryRows = form => {
  const views = form.viewCount ?? 0;
  const gate = form.gateAnswers ?? {};
  const maybe = gate.maybe ?? 0;
  const no = gate.no ?? 0;
  const respondents = form.respondentCount ?? 0;
  const dateVoters = form.dateVoterCount ?? 0;
  const anyDate = form.anyDateCount ?? 0;
  const notAttending = form.notAttendingCount ?? 0;
  const lastAnsweredAt = fmtDateTime(form.lastAnsweredAt);
  const rows = [
    { label: '閲覧', value: views, unit: 'UU' },
    {
      label: '意向',
      value: maybe + no,
      unit: '名',
      detail: `参加するかも ${maybe} / 今回は見送る ${no}`,
    },
    {
      label: '回答',
      value: respondents,
      unit: '名',
      detail:
        `日付選択 ${dateVoters} / どの日でもよい ${anyDate} ` +
        `/ 参加しない ${notAttending}`,
    },
  ];
  if (lastAnsweredAt) rows.push({ label: '最終回答', detail: lastAnsweredAt });
  return rows;
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
  const figures = el('div', { class: 'summary-figures' });
  const showMessage = text => {
    figures.innerHTML = '';
    figures.append(el('div', { class: 'summary-detail' }, text));
  };
  showMessage('読み込み中...');

  // A table rather than aligned text: ruled rows hold the four columns
  // together, where bare columns read as scattered figures.
  const showRows = rows => {
    const table = el('table', { class: 'summary-table' });
    rows.forEach(row => {
      table.append(
        el(
          'tr',
          {},
          el('th', { scope: 'row' }, row.label),
          el(
            'td',
            { class: 'summary-value' },
            row.value === undefined ? '' : String(row.value)
          ),
          el('td', { class: 'summary-unit' }, row.unit || ''),
          el('td', { class: 'summary-detail' }, row.detail || '')
        )
      );
    });
    figures.innerHTML = '';
    figures.append(table);
  };

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
      showRows(summaryRows(form));
    },
    showLoading: () => showMessage('読み込み中...'),
    showError: err => showMessage('読み込み失敗: ' + err.message),
  };
}
