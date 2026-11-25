import { el, set, withLoading } from '../../utils/dom.js';
import { updateMinAttendees } from '../../api-client.js';

const SAVED_LABEL = '保存しました';
const SAVED_MS = 1600;

const loadingNode = () => el('div', {}, '読み込み中...');
const errorNode = err =>
  el('div', { class: 'error-message' }, '読み込み失敗: ' + err.message);

export function createMinAttendeesSection({ formId, secret }) {
  const card = el('div', { class: 'card' }, loadingNode());

  const render = form => {
    const inputId = `min-attendees-${form.formId}`;
    const input = el('input', {
      id: inputId,
      type: 'number',
      min: 1,
      value: form.minAttendees ?? '',
      placeholder: '例: 5',
      style: 'width: 90px',
    });
    const feedback = el('div', { class: 'error-message', hidden: true });

    const saveBtn = el(
      'button',
      {
        class: 'primary',
        onclick: async function () {
          const button = this;
          let saved = false;
          feedback.hidden = true;
          const value = input.value === '' ? null : Number(input.value);

          await withLoading(button, async () => {
            try {
              await updateMinAttendees({ formId, secret, minAttendees: value });
              saved = true;
            } catch (err) {
              feedback.textContent = '更新に失敗しました: ' + err.message;
              feedback.hidden = false;
            }
          });
          if (saved) {
            const label = button.textContent;
            button.textContent = SAVED_LABEL;
            setTimeout(() => {
              button.textContent = label;
            }, SAVED_MS);
          }
        },
      },
      '人数を保存'
    );

    set(
      card,
      el(
        'div',
        {},
        el('h3', {}, '開催に必要な人数'),
        el(
          'div',
          { class: 'muted', style: 'margin-bottom: 12px;' },
          '投票が集まっている日付にバッジを付ける基準を変更します。' +
            '空欄で解除します。'
        ),
        el(
          'div',
          {
            class: 'form-group',
            style: 'display: flex; align-items: center; gap: 12px;',
          },
          el('label', { for: inputId, style: 'margin: 0;' }, '人数'),
          input
        ),
        el(
          'div',
          { class: 'row', style: 'margin-top: 8px;' },
          saveBtn,
          feedback
        )
      )
    );
  };

  return {
    element: card,
    render,
    showLoading: () => set(card, loadingNode()),
    showError: err => set(card, errorNode(err)),
  };
}
