import { el, set, withLoading } from '../../utils/dom.js';
import { updateMessage } from '../../api-client.js';

const SAVED_LABEL = '保存しました';
const SAVED_MS = 1600;

const loadingNode = () => el('div', {}, '読み込み中...');
const errorNode = err =>
  el('div', { class: 'error-message' }, '読み込み失敗: ' + err.message);

export function createMessageSection({ formId, secret }) {
  const card = el('div', { class: 'card' }, loadingNode());

  const render = form => {
    const textareaId = `message-${form.formId}`;
    const textarea = el('textarea', { id: textareaId, rows: 4 });
    textarea.value = form.message || '';

    // The button reports its own result, so nothing accumulates beside it
    // across repeated saves.
    const feedback = el('div', { class: 'error-message', hidden: true });

    const updateBtn = el(
      'button',
      {
        class: 'primary',
        onclick: async function () {
          const button = this;
          let saved = false;
          feedback.hidden = true;

          await withLoading(button, async () => {
            try {
              await updateMessage({ formId, secret, message: textarea.value });
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
      'メッセージを保存'
    );

    set(
      card,
      el(
        'div',
        {},
        el('h3', {}, 'メッセージを編集'),
        el(
          'div',
          { class: 'muted', style: 'margin-bottom: 12px;' },
          '参加者に表示するメッセージを更新します。空欄にすると非表示になります。'
        ),
        el(
          'div',
          { class: 'form-group', style: 'margin-bottom: 12px;' },
          textarea,
          el(
            'div',
            {
              class: 'row',
              style: 'margin-top: 8px;',
            },
            updateBtn,
            feedback
          )
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
