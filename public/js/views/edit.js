import { el, set, withLoading } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import { getFormAdmin, updateCounts, updateMessage } from '../api-client.js';
import { fmtIsoWithWeekday } from '../utils/dates.js';

export function Edit(q) {
  const app = el('div');
  const { formId, secret: urlSecret } = q;
  if (!formId) {
    return (set(app, el('div', {}, 'formIdがありません')), app);
  }

  let secret = urlSecret;
  if (!secret) {
    const saved = formStore.get(formId);
    if (saved?.secret) {
      location.hash = `#/edit?formId=${formId}&secret=${saved.secret}`;
      return app;
    }
    return (
      set(
        app,
        el('div', {}, 'secretがありません。作成時のURLを使用してください。')
      ),
      app
    );
  }
  formStore.save(formId, secret);
  const editUrl = `${location.origin}${location.pathname}#/edit?formId=${formId}&secret=${secret}`;
  const editUrlId = `edit-url-${formId}`;
  const urlInput = el('input', {
    type: 'text',
    value: editUrl,
    readonly: true,
    class: 'url-input',
    id: editUrlId,
  });
  urlInput.size = Math.min(Math.max(editUrl.length + 2, 40), 140);
  const copyBtn = el(
    'button',
    {
      onclick: async function () {
        await withLoading(this, async () => {
          try {
            await navigator.clipboard.writeText(editUrl);
          } catch (e) {
            urlInput.select();
            document.execCommand('copy');
          }
          copyBtn.textContent = 'コピー済み';
          await new Promise(r => setTimeout(r, 1200));
        });
      },
    },
    'コピー'
  );
  const messageCard = el(
    'div',
    { class: 'card' },
    el('div', {}, '読み込み中...')
  );
  const countsCard = el(
    'div',
    { class: 'card' },
    el('div', {}, '読み込み中...')
  );
  set(
    app,
    el(
      'div',
      {},
      el('h2', {}, '編集'),
      el(
        'div',
        { class: 'card' },
        el('div', {}, 'フォームID: ', formId),
        el('a', { href: '#/vote?formId=' + formId }, '投票画面へ'),
        el(
          'div',
          { class: 'form-group' },
          el('label', { for: editUrlId }, '編集用URL'),
          el('div', { class: 'url-row' }, urlInput, copyBtn)
        )
      ),
      messageCard,
      countsCard
    )
  );

  async function loadForm({ countsSuccessText, messageSuccessText } = {}) {
    const loading = el('div', {}, '読み込み中...');
    set(messageCard, loading.cloneNode(true));
    set(countsCard, loading.cloneNode(true));
    try {
      const j = await getFormAdmin(formId, secret);
      renderMessageSection(j, { successText: messageSuccessText });
      renderCountsSection(j, { successText: countsSuccessText });
    } catch (err) {
      const errorNode = () =>
        el('div', { class: 'error-message' }, '読み込み失敗: ' + err.message);
      set(messageCard, errorNode());
      set(countsCard, errorNode());
    }
  }

  function renderMessageSection(form, { successText } = {}) {
    const textareaId = `message-${form.formId}`;
    const textarea = el('textarea', { id: textareaId, rows: 4 });
    textarea.value = form.message || '';

    const feedback = el('div', {
      class: 'muted',
      style: 'min-height: 18px; margin: 8px 0;',
    });
    if (successText) {
      feedback.textContent = successText;
      feedback.style.color = 'var(--green-success)';
    }

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
              await updateMessage(formId, secret, textarea.value);
              await loadForm({
                messageSuccessText: 'メッセージを更新しました',
              });
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
      messageCard,
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
          { class: 'form-group' },
          el('label', { for: textareaId }, 'メッセージ'),
          textarea
        ),
        feedback,
        el('div', { class: 'row' }, updateBtn)
      )
    );
  }

  function renderCountsSection(j, { successText } = {}) {
    const inputs = new Map();
    const feedback = el('div', {
      class: 'muted',
      style: 'min-height: 18px; margin: 8px 0;',
    });
    if (successText) {
      feedback.textContent = successText;
      feedback.style.color = 'var(--green-success)';
    }

    const fields = j.options.map(date => {
      const inputId = `count-${j.formId}-${date}`;
      const input = el('input', {
        id: inputId,
        type: 'number',
        min: 0,
        step: 1,
        value: j.counts?.[date] ?? 0,
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
              await updateCounts(formId, secret, payload);
              await loadForm({ countsSuccessText: '票数を更新しました' });
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

    set(countsCard, el('div', {}, ...children));
  }

  loadForm();
  return app;
}
