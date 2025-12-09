import { el, set } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import { getFormAdmin } from '../api-client.js';
import { createUrlSection } from './edit/url-section.js';
import { createMessageSection } from './edit/message-section.js';
import { createCountsSection } from './edit/counts-section.js';

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
  const urlSection = createUrlSection({ formId, secret });
  const messageSection = createMessageSection({
    formId,
    secret,
    onUpdated: messageSuccessText => loadForm({ messageSuccessText }),
  });
  const countsSection = createCountsSection({
    formId,
    secret,
    onUpdated: countsSuccessText => loadForm({ countsSuccessText }),
  });
  set(
    app,
    el(
      'div',
      {},
      el('h2', {}, 'フォーム編集'),
      urlSection.element,
      messageSection.element,
      countsSection.element
    )
  );

  async function loadForm({ countsSuccessText, messageSuccessText } = {}) {
    messageSection.showLoading();
    countsSection.showLoading();
    try {
      const j = await getFormAdmin({ formId, secret });
      messageSection.render(j, { successText: messageSuccessText });
      countsSection.render(j, { successText: countsSuccessText });
    } catch (err) {
      messageSection.showError(err);
      countsSection.showError(err);
    }
  }

  loadForm();
  return app;
}
