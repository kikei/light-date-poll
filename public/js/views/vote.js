import { el, set } from '../utils/dom.js';
import * as voteStore from '../storage/vote-store.js';
import { getForm, vote, unvote } from '../api-client.js';
import { renderCalendar } from '../components/calendar.js';
import { createStatusBar } from '../components/status-bar.js';

export function Vote(q) {
  const app = el('div');
  const { formId } = q;
  if (!formId) {
    return (set(app, el('div', {}, 'formIdがありません')), app);
  }
  const head = el('div', { class: 'card' }, el('h2', {}, '投票'));
  const statusBar = createStatusBar({ voteCount: 0, maxVotes: null });
  const calendarContainer = el('div');
  set(
    app,
    el(
      'div',
      {},
      head,
      el('div', { class: 'card' }, statusBar.element, calendarContainer)
    )
  );
  let calendarComponent = null;
  (async () => {
    try {
      const j = await getForm(formId);
      head.append(el('div', { class: 'muted' }, j.message || ''));
      render(j);
    } catch (err) {
      calendarContainer.innerHTML = '<p>読み込み失敗</p>';
    }
  })();

  function render(j) {
    const voted = voteStore.get(j.formId);
    const voteCount = voted.length;
    const maxVotes =
      j.maxVotes === undefined || j.maxVotes === null ? null : j.maxVotes;
    statusBar.reset();
    statusBar.update({ voteCount, maxVotes });
    j.counts = j.counts || {};
    const counts = j.counts;
    let processing = false;
    const handleVote = async (date, { isDisabled, isSelected }) => {
      if (processing || isDisabled) {
        if (isDisabled) statusBar.showWarning();
        return;
      }
      processing = true;
      if (isSelected) {
        try {
          await unvote({ formId: j.formId, date });
        } catch (err) {
          alert('取り消し失敗:' + err.message);
          processing = false;
          return;
        }
        voteStore.remove(j.formId, date);
        j.counts[date] = Math.max(0, (j.counts[date] || 0) - 1);
        processing = false;
        render(j);
        return;
      }
      try {
        await vote({ formId: j.formId, date });
      } catch (err) {
        alert('投票失敗:' + err.message);
        processing = false;
        return;
      }
      voteStore.add(j.formId, date);
      j.counts[date] = (j.counts[date] || 0) + 1;
      processing = false;
      render(j);
    };
    const calendarProps = {
      options: j.options,
      counts,
      voted,
      maxVotes,
      onVote: handleVote,
    };
    if (!calendarComponent) {
      calendarComponent = renderCalendar(calendarProps);
      set(calendarContainer, calendarComponent.calendar);
    } else {
      calendarComponent.update(calendarProps);
    }
  }
  return app;
}
