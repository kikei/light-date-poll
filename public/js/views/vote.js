import { el, set } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import * as noaStore from '../storage/none-of-above-store.js';
import * as notAttendingStore from '../storage/not-attending-store.js';
import * as userStore from '../storage/user-store.js';
import * as voteStore from '../storage/vote-store.js';
import { getForm, recordView, vote, unvote } from '../api-client.js';
import { NOA_KEY } from '../noa-key.js';
import { NOT_ATTENDING_KEY } from '../not-attending-key.js';
import { renderCalendar } from '../components/calendar.js';
import { createStatusBar } from '../components/status-bar.js';
import { createRespondentCount } from '../components/respondent-count.js';
import { createNoneOfAboveButton } from '../components/none-of-above-button.js';
import { createNotAttendingButton } from '../components/not-attending-button.js';

// The screen disables cells at the limit, so a 409 means that state was
// bypassed or stale: say what happened rather than echo the error code.
const voteFailureMessage = err =>
  err.payload?.error === 'max_votes_exceeded'
    ? '選択できる日数の上限に達しています'
    : '投票失敗: ' + err.message;

export function Vote(q) {
  const app = el('div');
  const { formId } = q;
  if (!formId) {
    return (set(app, el('div', {}, 'formIdがありません')), app);
  }
  const saved = formStore.get(formId);
  const secret = saved?.secret;
  const userId = userStore.getUserId(formId);
  const head = el('div', { class: 'card' }, el('h2', {}, '投票'));
  const editButton =
    secret &&
    el(
      'a',
      {
        class: 'corner-edit-btn',
        href: `#/edit?formId=${formId}&secret=${secret}`,
        'aria-label': '編集画面へ',
        title: '編集',
      },
      '✎'
    );
  const statusBar = createStatusBar({
    voteCount: 0,
    maxVotes: null,
  });
  const errorMessage = el('div', {
    class: 'error-message',
    style: 'display:none',
  });
  const calendarContainer = el('div');
  const specialVoteRow = el('div', { class: 'special-vote-row' });
  const respondentCount = createRespondentCount({ count: 0 });

  const showError = message => {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  };
  set(
    app,
    el(
      'div',
      {},
      head,
      el(
        'div',
        { class: 'card' },
        errorMessage,
        statusBar.element,
        calendarContainer,
        specialVoteRow,
        respondentCount.element
      )
    )
  );
  if (editButton) app.append(editButton);
  let calendarComponent = null;
  let noaButton = null;
  let notAttendingButton = null;

  // Optimistic updates only simulate the server; re-read the real counts so
  // votes cast elsewhere show up and a no-op insert cannot inflate a badge.
  async function refreshFromServer(j) {
    try {
      const form = await getForm({ formId });
      j.counts = form.counts;
      j.respondentCount = form.respondentCount;
      j.noneOfAboveCount = form.noneOfAboveCount;
      j.notAttendingCount = form.notAttendingCount;
      render(j);
    } catch (err) {
      console.error('Failed to refresh form:', err);
    }
  }

  (async () => {
    try {
      const j = await getForm({ formId });
      head.append(el('div', { class: 'muted form-message' }, j.message || ''));
      render(j);
      // Not awaited: the tally is for the organizer, and a failed write
      // costs one view rather than anything the participant should wait on.
      recordView({ formId, userId }).catch(() => {});
    } catch (err) {
      calendarContainer.innerHTML = '<p>読み込み失敗</p>';
    }
  })();

  let processingDate = null;
  let processingNoa = false;
  let processingNotAttending = false;

  function render(j) {
    const voted = voteStore.get(j.formId);
    const noaActive = noaStore.get(j.formId);
    const notAttendingActive = notAttendingStore.get(j.formId);
    const voteCount = voted.length;
    const maxVotes =
      j.maxVotes === undefined || j.maxVotes === null ? null : j.maxVotes;
    const noaCount = j.noneOfAboveCount ?? 0;
    const notAttendingCount = j.notAttendingCount ?? 0;

    statusBar.reset();
    statusBar.update({ voteCount, maxVotes });
    respondentCount.update({ count: j.respondentCount ?? 0 });
    j.counts = j.counts || {};
    const counts = j.counts;

    const handleVote = async (date, { isDisabled, isSelected }) => {
      if (processingDate || isDisabled) {
        if (isDisabled) statusBar.showWarning();
        return;
      }
      processingDate = date;
      render(j);
      if (isSelected) {
        try {
          await unvote({
            formId: j.formId,
            date,
            userId,
          });
        } catch (err) {
          showError('取り消し失敗: ' + err.message);
          processingDate = null;
          render(j);
          return;
        }
        voteStore.remove(j.formId, date);
        j.counts[date] = Math.max(0, (j.counts[date] || 0) - 1);
        processingDate = null;
        render(j);
        await refreshFromServer(j);
        return;
      }
      try {
        await vote({
          formId: j.formId,
          date,
          userId,
        });
      } catch (err) {
        showError(voteFailureMessage(err));
        processingDate = null;
        render(j);
        return;
      }
      voteStore.add(j.formId, date);
      j.counts[date] = (j.counts[date] || 0) + 1;
      processingDate = null;
      render(j);
      await refreshFromServer(j);
    };

    const handleNoaToggle = async newValue => {
      if (processingNoa) return;
      if (newValue) {
        processingNoa = true;
        render(j);
        try {
          await vote({
            formId: j.formId,
            date: NOA_KEY,
            userId,
          });
        } catch (err) {
          showError('送信失敗: ' + err.message);
          processingNoa = false;
          render(j);
          return;
        }
        noaStore.set(j.formId, true);
        j.noneOfAboveCount = (j.noneOfAboveCount ?? 0) + 1;
        processingNoa = false;
        render(j);
        await refreshFromServer(j);
      } else {
        processingNoa = true;
        render(j);
        try {
          await unvote({
            formId: j.formId,
            date: NOA_KEY,
            userId,
          });
        } catch (err) {
          showError('取り消し失敗: ' + err.message);
          processingNoa = false;
          render(j);
          return;
        }
        noaStore.set(j.formId, false);
        j.noneOfAboveCount = Math.max(0, (j.noneOfAboveCount ?? 0) - 1);
        processingNoa = false;
        render(j);
        await refreshFromServer(j);
      }
    };

    const handleNotAttendingToggle = async newValue => {
      if (processingNotAttending) return;
      if (newValue) {
        processingNotAttending = true;
        render(j);
        try {
          await vote({
            formId: j.formId,
            date: NOT_ATTENDING_KEY,
            userId,
          });
        } catch (err) {
          showError('送信失敗: ' + err.message);
          processingNotAttending = false;
          render(j);
          return;
        }
        notAttendingStore.set(j.formId, true);
        j.notAttendingCount = (j.notAttendingCount ?? 0) + 1;
        processingNotAttending = false;
        render(j);
        await refreshFromServer(j);
      } else {
        processingNotAttending = true;
        render(j);
        try {
          await unvote({
            formId: j.formId,
            date: NOT_ATTENDING_KEY,
            userId,
          });
        } catch (err) {
          showError('取り消し失敗: ' + err.message);
          processingNotAttending = false;
          render(j);
          return;
        }
        notAttendingStore.set(j.formId, false);
        j.notAttendingCount = Math.max(0, (j.notAttendingCount ?? 0) - 1);
        processingNotAttending = false;
        render(j);
        await refreshFromServer(j);
      }
    };

    const calendarProps = {
      options: j.options,
      counts,
      voted,
      maxVotes,
      noneOfAboveCount: noaCount,
      notAttendingCount,
      processingDate,
      onVote: handleVote,
    };
    let maxCount = 0;
    if (!calendarComponent) {
      calendarComponent = renderCalendar(calendarProps);
      set(calendarContainer, calendarComponent.calendar);
      const result = calendarComponent.update(calendarProps);
      maxCount = result?.maxCount ?? 0;
    } else {
      const result = calendarComponent.update(calendarProps);
      maxCount = result?.maxCount ?? 0;
    }

    const noaProps = {
      active: noaActive,
      count: noaCount,
      maxCount,
      processing: processingNoa,
      onToggle: handleNoaToggle,
    };
    if (!noaButton) {
      noaButton = createNoneOfAboveButton(noaProps);
      specialVoteRow.append(noaButton.element);
    } else {
      noaButton.update(noaProps);
    }

    const notAttendingProps = {
      active: notAttendingActive,
      count: notAttendingCount,
      maxCount,
      processing: processingNotAttending,
      onToggle: handleNotAttendingToggle,
    };
    if (!notAttendingButton) {
      notAttendingButton = createNotAttendingButton(notAttendingProps);
      specialVoteRow.append(notAttendingButton.element);
    } else {
      notAttendingButton.update(notAttendingProps);
    }
  }
  return app;
}
