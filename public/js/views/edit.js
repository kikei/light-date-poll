import { el, set, withLoading } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';

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
        ),
        el(
          'div',
          { class: 'muted' },
          '※ この URL をブックマークまたは保存してください'
        ),
        el(
          'div',
          { class: 'muted' },
          '※ この最小版は“メッセージ編集”を省略しています。必要なら後で追加可能。'
        )
      )
    )
  );
  return app;
}
