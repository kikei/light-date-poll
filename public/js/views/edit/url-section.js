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

export function createUrlSection({ formId, secret }) {
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
    )
  );

  return { element };
}
