import { el, set, withLoading } from '../../utils/dom.js';
import { updateMessage } from '../../api-client.js';

const loadingNode = () => el('div', {}, '読み込み中...');
const errorNode = err =>
  el('div', { class: 'error-message' }, '読み込み失敗: ' + err.message);

export function createMessageSection({ formId, secret, onUpdated }) {
  const card = el('div', { class: 'card' }, loadingNode());

  const render = (form, { successText } = {}) => {
    const textareaId = `message-${form.formId}`;
    const textarea = el('textarea', { id: textareaId, rows: 4 });
    textarea.value = form.message || '';

    const feedback = el('div', {
      class: 'muted',
      style: 'min-height: 18px;',
    });
    if (successText) {
      feedback.textContent = successText;
      feedback.style.color = 'var(--green-success)';
    }

    const handleSuccess = () => {
      if (onUpdated) {
        onUpdated('メッセージを更新しました');
      } else {
        feedback.textContent = 'メッセージを更新しました';
        feedback.style.color = 'var(--green-success)';
      }
    };

    const updateBtn = el(
      'button',
      {
        class: 'primary',
        onclick: async function () {
          feedback.textContent = '';
          feedback.className = 'muted';
          feedback.style.color = '';

          await withLoading(this, async () => {
            try {
              await updateMessage({ formId, secret, message: textarea.value });
              handleSuccess();
            } catch (err) {
              feedback.className = 'error-message';
              feedback.style.color = '';
              feedback.textContent = '更新に失敗しました: ' + err.message;
            }
          });
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
          el('label', { for: textareaId }, 'メッセージ'),
          textarea,
          el(
            'div',
            {
              class: 'row',
              style: 'margin-top: 8px; align-items: flex-start;',
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
