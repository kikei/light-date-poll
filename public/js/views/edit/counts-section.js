import { el, set, withLoading } from '../../utils/dom.js';
import { fmtIsoWithWeekday } from '../../utils/dates.js';
import { updateCounts } from '../../api-client.js';

const loadingNode = () => el('div', {}, '読み込み中...');
const errorNode = err =>
  el('div', { class: 'error-message' }, '読み込み失敗: ' + err.message);

export function createCountsSection({ formId, secret, onUpdated }) {
  const card = el('div', { class: 'card' }, loadingNode());

  const render = (form, { successText } = {}) => {
    const inputs = new Map();
    const feedback = el('div', {
      class: 'muted',
      style: 'min-height: 18px; margin: 8px 0;',
    });
    if (successText) {
      feedback.textContent = successText;
      feedback.style.color = 'var(--green-success)';
    }

    const fields = form.options.map(date => {
      const inputId = `count-${form.formId}-${date}`;
      const input = el('input', {
        id: inputId,
        type: 'number',
        min: 0,
        step: 1,
        value: form.counts?.[date] ?? 0,
        style: 'width: 140px',
      });
      inputs.set(date, input);
      return el(
        'div',
        {
          class: 'form-group',
          style: 'display: flex; align-items: center; gap: 12px;',
        },
        el(
          'label',
          { for: inputId, style: 'margin: 0;' },
          fmtIsoWithWeekday(date)
        ),
        input
      );
    });

    const handleSuccess = () => {
      if (onUpdated) {
        onUpdated('票数を更新しました');
      } else {
        feedback.textContent = '票数を更新しました';
        feedback.style.color = 'var(--green-success)';
      }
    };

    const updateBtn = el(
      'button',
      {
        class: 'primary',
        onclick: async function () {
          const payload = {};
          inputs.forEach((input, date) => {
            payload[date] = Number(input.value || 0);
          });
          feedback.textContent = '';
          feedback.className = 'muted';
          feedback.style.color = '';

          await withLoading(this, async () => {
            try {
              await updateCounts({ formId, secret, counts: payload });
              handleSuccess();
            } catch (err) {
              feedback.className = 'error-message';
              feedback.style.color = '';
              feedback.textContent = '更新に失敗しました: ' + err.message;
            }
          });
        },
      },
      '票数を保存'
    );

    const children = [
      el('h3', {}, '票数を編集'),
      el(
        'div',
        { class: 'muted', style: 'margin-bottom: 12px;' },
        '日付ごとの票数を直接入力して変更します。'
      ),
      ...fields,
      feedback,
      el('div', { class: 'row' }, updateBtn),
    ].filter(Boolean);

    set(card, el('div', {}, ...children));
  };

  return {
    element: card,
    render,
    showLoading: () => set(card, loadingNode()),
    showError: err => set(card, errorNode(err)),
  };
}
