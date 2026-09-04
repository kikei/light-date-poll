import { el, set } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import { getFormAdmin } from '../api-client.js';
import { createOverviewSection } from './edit/overview-section.js';
import { createMessageSection } from './edit/message-section.js';
import { createAdjustmentsSection } from './edit/adjustments-section.js';

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
  const overviewSection = createOverviewSection({ formId, secret });
  const messageSection = createMessageSection({ formId, secret });
  const adjustmentsSection = createAdjustmentsSection({
    formId,
    secret,
  });
  set(
    app,
    el(
      'div',
      {},
      el('h2', {}, 'フォーム編集'),
      overviewSection.element,
      messageSection.element,
      adjustmentsSection.element
    )
  );

  async function loadForm() {
    overviewSection.showLoading();
    messageSection.showLoading();
    adjustmentsSection.showLoading();
    try {
      const j = await getFormAdmin({ formId, secret });
      overviewSection.render(j);
      messageSection.render(j);
      adjustmentsSection.render(j);
    } catch (err) {
      overviewSection.showError(err);
      messageSection.showError(err);
      adjustmentsSection.showError(err);
    }
  }

  loadForm();
  return app;
}
