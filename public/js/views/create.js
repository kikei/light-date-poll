import { el, set, withLoading } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import { createForm } from '../api-client.js';

const toDateStr = d => d.toISOString().split('T')[0];

const maxEndDate = startVal => {
  const d = new Date(startVal);
  d.setMonth(d.getMonth() + 3);
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
};

const daysBetween = (start, end) =>
  Math.round((new Date(end) - new Date(start)) / 86400000) + 1;

const dateGroup = (id, label, input) => {
  const g = el(
    'div',
    { class: 'form-group', style: 'cursor:pointer' },
    el('label', { for: id }, label),
    input
  );
  g.addEventListener('click', ev => {
    if (ev.target === input) return;
    try {
      input.showPicker();
    } catch (_) {}
  });
  return g;
};

export function Create(_query = {}) {
  const app = el('div');
  const today = new Date().toISOString().split('T')[0];
  const startId = 'start-date',
    endId = 'end-date',
    msgId = 'message',
    daysId = 'max-days';
  const s = el('input', {
    id: startId,
    type: 'date',
    value: today,
  });
  const e = el('input', {
    id: endId,
    type: 'date',
    min: today,
    max: maxEndDate(today),
  });
  const msg = el('textarea', {
    id: msgId,
    placeholder: '投票画面の上部にメッセージを表示します。',
    rows: 3,
  });
  const days = el('input', {
    id: daysId,
    type: 'number',
    min: 1,
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
    [s, e, msg, days].forEach(i => i.classList.remove('input-error'));
  };
  const updateDaysMax = () => {
    if (s.value && e.value && e.value >= s.value) {
      days.max = String(daysBetween(s.value, e.value));
      if (days.value && Number(days.value) > Number(days.max)) {
        days.value = days.max;
      }
    } else {
      days.removeAttribute('max');
    }
  };
  s.addEventListener('input', () => {
    e.min = s.value || today;
    e.max = s.value ? maxEndDate(s.value) : maxEndDate(today);
    updateDaysMax();
    clearError();
  });
  e.addEventListener('input', () => {
    updateDaysMax();
    clearError();
  });
  updateDaysMax();

  const showError = (text, ...inputs) => {
    errorMsg.textContent = text;
    errorMsg.style.display = 'block';
    inputs.forEach(i => i.classList.add('input-error'));
  };

  const validate = () => {
    if (!s.value || !e.value) {
      showError(
        '開始日と終了日を設定してください',
        ...(!s.value ? [s] : []),
        ...(!e.value ? [e] : [])
      );
      return false;
    }
    if (e.value < s.value) {
      showError('終了日は開始日以降にしてください', e);
      return false;
    }
    if (e.value > maxEndDate(s.value)) {
      showError('期間は 3 ヶ月未満にしてください', e);
      return false;
    }
    return true;
  };

  const handleSubmit = async function () {
    if (!validate()) return;
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
        showError('作成に失敗しました: ' + err.message);
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
  };

  const btn = el('button', { class: 'primary', onclick: handleSubmit }, '作成');
  set(
    app,
    el(
      'div',
      {},
      el('h2', {}, 'フォーム作成'),
      el(
        'div',
        { class: 'card' },
        dateGroup(startId, '開始日 (必須)', s),
        dateGroup(endId, '終了日 (必須)', e),
        el(
          'div',
          { class: 'form-group' },
          el('label', { for: msgId }, 'メッセージ'),
          msg
        ),
        el(
          'div',
          { class: 'form-group' },
          el(
            'label',
            { for: daysId },
            '一人が投票できる日数 (省略した場合は制限しない)'
          ),
          days
        ),
        errorMsg,
        el('div', { class: 'row' }, btn)
      )
    )
  );
  return app;
}
