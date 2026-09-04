import { el, set } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import * as specialVoteStore from '../storage/special-vote-store.js';
import * as userStore from '../storage/user-store.js';
import * as voteStore from '../storage/vote-store.js';
import {
  getForm,
  recordView,
  submitGateAnswer,
  vote,
  unvote,
} from '../api-client.js';
import { ANY_DATE_KEY } from '../any-date-key.js';
import { NOT_ATTENDING_KEY } from '../not-attending-key.js';
import { renderCalendar } from '../components/calendar.js';
import { createStatusBar } from '../components/status-bar.js';
import { createSpecialVoteButton } from '../components/special-vote-button.js';
import { createEntryGate } from '../components/entry-gate.js';

// Options that stand outside the candidate dates. Each is stored as a vote
// under its own key and carries its own tally. storePrefix is the
// localStorage prefix; 参加しない keeps 'na' so a poll already in flight
// does not show a selected answer as unselected.
// The gate answer is tallied separately from the option it selects, so the
// choice travels under its own name.
const GATE_CHOICES = [
  {
    choice: 'maybe',
    option: ANY_DATE_KEY,
    label: '参加するかも',
    note: '日程があえば行きたい',
  },
  {
    choice: 'no',
    option: NOT_ATTENDING_KEY,
    label: '今回は見送る',
    note: '日程にかかわらず行かない',
  },
];

const SPECIAL_OPTIONS = [
  {
    option: ANY_DATE_KEY,
    label: 'どの日でもよい',
    countKey: 'anyDateCount',
    storePrefix: 'ad',
  },
  {
    option: NOT_ATTENDING_KEY,
    label: '参加しない',
    countKey: 'notAttendingCount',
    storePrefix: 'na',
  },
];

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
  const voteArea = el(
    'div',
    {},
    statusBar.element,
    calendarContainer,
    specialVoteRow
  );

  // Someone who has already answered on this browser goes straight to the
  // calendar; the gate is only there to make a first answer cheap.
  const hasAnswered = () =>
    voteStore.get(formId).length > 0 ||
    SPECIAL_OPTIONS.some(spec =>
      specialVoteStore.get(spec.storePrefix, formId)
    );

  const showError = message => {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  };

  let loadedForm = null;

  const dismissGate = () => {
    gate.element.hidden = true;
  };

  // The gate answer is a real vote, so someone who closes the tab here has
  // still said something the organizer can read.
  const chooseFromGate = async choice => {
    const j = loadedForm;
    if (!j) return;
    const gateChoice = GATE_CHOICES.find(entry => entry.choice === choice);
    const spec = SPECIAL_OPTIONS.find(
      entry => entry.option === gateChoice.option
    );
    gate.setBusy(true);
    try {
      await submitGateAnswer({ formId: j.formId, userId, choice });
    } catch (err) {
      showError('送信失敗: ' + err.message);
      gate.setBusy(false);
      return;
    }
    specialVoteStore.set(spec.storePrefix, j.formId, true);
    j[spec.countKey] = (j[spec.countKey] ?? 0) + 1;
    gate.setBusy(false);
    dismissGate();
    render(j);
    await refreshFromServer(j);
  };

  // Decided before the form loads, from localStorage alone, so a return
  // visit never flashes the overlay.
  const gate = createEntryGate({
    choices: GATE_CHOICES,
    onChoose: chooseFromGate,
    hidden: hasAnswered(),
  });

  set(
    app,
    el('div', {}, head, el('div', { class: 'card' }, errorMessage, voteArea))
  );
  if (editButton) app.append(editButton);
  // Fixed to the viewport, so it sits outside the card it covers.
  app.append(gate.element);
  let calendarComponent = null;
  const specialButtons = new Map();

  // Optimistic updates only simulate the server; re-read the real counts so
  // votes cast elsewhere show up and a no-op insert cannot inflate a badge.
  async function refreshFromServer(j) {
    try {
      const form = await getForm({ formId });
      j.counts = form.counts;
      j.anyDateCount = form.anyDateCount;
      j.notAttendingCount = form.notAttendingCount;
      render(j);
    } catch (err) {
      console.error('Failed to refresh form:', err);
    }
  }

  (async () => {
    try {
      const j = await getForm({ formId });
      loadedForm = j;
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
  const processingSpecial = new Set();

  function render(j) {
    const voted = voteStore.get(j.formId);
    const voteCount = voted.length;
    const maxVotes =
      j.maxVotes === undefined || j.maxVotes === null ? null : j.maxVotes;

    statusBar.reset();
    statusBar.update({ voteCount, maxVotes });
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

    // Both special options behave the same way; only the key, the label
    // and the tally they move differ.
    const specialToggle =
      ({ option, countKey, storePrefix }) =>
      async newValue => {
        if (processingSpecial.has(option)) return;
        processingSpecial.add(option);
        render(j);
        const send = newValue ? vote : unvote;
        try {
          await send({ formId: j.formId, date: option, userId });
        } catch (err) {
          const prefix = newValue ? '送信失敗: ' : '取り消し失敗: ';
          showError(prefix + err.message);
          processingSpecial.delete(option);
          render(j);
          return;
        }
        specialVoteStore.set(storePrefix, j.formId, newValue);
        const held = j[countKey] ?? 0;
        j[countKey] = newValue ? held + 1 : Math.max(0, held - 1);
        processingSpecial.delete(option);
        render(j);
        await refreshFromServer(j);
      };

    const calendarProps = {
      options: j.options,
      counts,
      voted,
      maxVotes,
      minAttendees: j.minAttendees ?? null,
      specialCounts: SPECIAL_OPTIONS.map(spec => j[spec.countKey] ?? 0),
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

    SPECIAL_OPTIONS.forEach(spec => {
      const props = {
        option: spec.option,
        label: spec.label,
        active: specialVoteStore.get(spec.storePrefix, j.formId),
        count: j[spec.countKey] ?? 0,
        maxCount,
        processing: processingSpecial.has(spec.option),
        onToggle: specialToggle(spec),
      };
      const existing = specialButtons.get(spec.option);
      if (existing) {
        existing.update(props);
        return;
      }
      const button = createSpecialVoteButton(props);
      specialButtons.set(spec.option, button);
      specialVoteRow.append(button.element);
    });
  }
  return app;
}
