import { el, set, withLoading } from '../../utils/dom.js';
import { fmtIsoWithWeekday } from '../../utils/dates.js';
import { updateAdjustments } from '../../api-client.js';
import { NOA_KEY } from '../../noa-key.js';
import { NOT_ATTENDING_KEY } from '../../not-attending-key.js';

const SAVED_LABEL = '保存しました';
const SAVED_MS = 1600;

const loadingNode = () => el('div', {}, '読み込み中...');
const errorNode = err =>
  el('div', { class: 'error-message' }, '読み込み失敗: ' + err.message);

// Name and value are separate elements with one gap between them, so
// every figure in the row is spaced the same way.
const field = (name, value) =>
  el(
    'span',
    { class: 'adjustment-field' },
    el('span', { class: 'adjustment-name' }, name),
    value
  );

const labelFor = key => {
  if (key === NOA_KEY) return 'それ以外';
  if (key === NOT_ATTENDING_KEY) return '参加しない';
  return fmtIsoWithWeekday(key);
};

// One row per candidate. The editable field comes last so that it reads as
// the one thing to change, and 表示 follows it as it is typed: choosing an
// adjustment means seeing what it does to the figure participants get.
function createAdjustmentRow({ formId, key, figure }) {
  let current = figure;
  const inputId = `adjustment-${formId}-${key}`;
  const input = el('input', {
    id: inputId,
    type: 'number',
    step: 1,
    value: current.adjustment,
    style: 'width: 90px',
  });
  const tally = el('span', { class: 'adjustment-value' });
  const displayed = el('span', { class: 'adjustment-value' });

  const refresh = () => {
    const entered = Math.trunc(Number(input.value || 0));
    const total = Number.isFinite(entered)
      ? current.tally + entered
      : current.tally;
    tally.textContent = String(current.tally);
    displayed.textContent = String(Math.max(0, total));
  };
  input.addEventListener('input', refresh);
  refresh();

  // Updating in place rather than re-rendering keeps the field the editor
  // is working in, along with its focus.
  const update = next => {
    current = next;
    input.value = String(next.adjustment);
    refresh();
  };

  const element = el(
    'div',
    { class: 'adjustment-row' },
    el('label', { for: inputId }, labelFor(key)),
    field('投票数', tally),
    field('表示', displayed),
    field('補正', input)
  );

  const adjustmentValue = () => Math.trunc(Number(input.value || 0));

  return { element, update, adjustmentValue };
}

export function createAdjustmentsSection({ formId, secret }) {
  const card = el('div', { class: 'card' }, loadingNode());

  const render = form => {
    const figures = form.figures || {};
    const keys = [...form.options, NOA_KEY, NOT_ATTENDING_KEY];
    const rowsByKey = new Map();

    const rows = keys.map(key => {
      const row = createAdjustmentRow({
        formId: form.formId,
        key,
        figure: figures[key] || { tally: 0, adjustment: 0, displayed: 0 },
      });
      rowsByKey.set(key, row);
      return row.element;
    });

    const feedback = el('div', { class: 'error-message', hidden: true });

    const saveBtn = el(
      'button',
      {
        class: 'primary',
        onclick: async function () {
          const button = this;
          let saved = false;
          const payload = {};
          rowsByKey.forEach((row, key) => {
            payload[key] = row.adjustmentValue();
          });
          feedback.hidden = true;

          await withLoading(button, async () => {
            try {
              const result = await updateAdjustments({
                formId,
                secret,
                adjustments: payload,
              });
              // Tallies may have moved while the form was open, so the
              // rows take their figures from the response.
              rowsByKey.forEach((row, key) => {
                if (result.figures?.[key]) row.update(result.figures[key]);
              });
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
      '補正を保存'
    );

    set(
      card,
      el(
        'div',
        {},
        el('h3', {}, '票数を補正'),
        el(
          'div',
          { class: 'muted', style: 'margin-bottom: 12px;' },
          '表示する票数を増減します。0 か空欄で解除します。'
        ),
        ...rows,
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
