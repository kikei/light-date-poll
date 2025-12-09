import { el, set, withLoading } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import { createForm } from '../api-client.js';

export function Create(_query = {}) {
  const app = el('div');
  const today = new Date().toISOString().split('T')[0];
  const startId = 'start-date',
    endId = 'end-date',
    msgId = 'message',
    daysId = 'max-days';
  const s = el('input', { id: startId, type: 'date', value: today }),
    e = el('input', { id: endId, type: 'date' }),
    msg = el('textarea', {
      id: msgId,
      placeholder: 'メッセージ（省略可）',
      rows: 3,
    });
  const days = el('input', {
    id: daysId,
    type: 'number',
    value: '',
    style: 'width:80px',
  });
  const errorMsg = el('div', {
    class: 'error-message',
    style: 'display: none;',
  });
  const clearError = () => {
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
    [s, e, msg, days].forEach(input => input.classList.remove('input-error'));
  };
  [s, e].forEach(input => input.addEventListener('input', clearError));
  const btn = el(
    'button',
    {
      class: 'primary',
      onclick: async function () {
        if (!s.value || !e.value) {
          errorMsg.textContent = '開始日と終了日は必須です';
          errorMsg.style.display = 'block';
          if (!s.value) s.classList.add('input-error');
          if (!e.value) e.classList.add('input-error');
          return;
        }
        clearError();
        await withLoading(this, async () => {
          let j;
          try {
            j = await createForm({
              startDate: s.value,
              endDate: e.value,
              message: msg.value || '',
              days: days.value === '' ? null : days.value,
            });
          } catch (err) {
            alert('作成失敗:' + err.message);
            return;
          }
          const h = j.editUrl?.split('#')[1];
          const secret =
            h && h.includes('?')
              ? new URLSearchParams(h.split('?')[1]).get('secret')
              : null;
          formStore.save(j.formId, secret);
          location.hash = h ? '#' + h : `#/edit?formId=${j.formId}`;
        });
      },
    },
    '作成'
  );
  set(
    app,
    el(
      'div',
      {},
      el('h2', {}, 'フォーム作成'),
      el(
        'div',
        { class: 'card' },
        el(
          'div',
          { class: 'form-group' },
          el('label', { for: startId }, '開始日'),
          s
        ),
        el(
          'div',
          { class: 'form-group' },
          el('label', { for: endId }, '終了日'),
          e
        ),
        el(
          'div',
          { class: 'form-group' },
          el('label', { for: msgId }, 'メッセージ'),
          msg
        ),
        el(
          'div',
          { class: 'form-group' },
          el('label', { for: daysId }, '投票できる最大の日数（省略可）'),
          days
        ),
        errorMsg,
        el('div', { class: 'row' }, btn)
      )
    )
  );
  return app;
}
