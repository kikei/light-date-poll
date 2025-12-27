import { el, set } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import * as nicknameStore from '../storage/nickname-store.js';
import * as userStore from '../storage/user-store.js';
import * as voteStore from '../storage/vote-store.js';
import { getForm, getParticipants, vote, unvote } from '../api-client.js';
import { renderCalendar } from '../components/calendar.js';
import { createStatusBar } from '../components/status-bar.js';
import { createParticipants } from '../components/participants.js';

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
  const nicknameId = `nickname-${formId}`;
  const nicknameInput = el('input', {
    id: nicknameId,
    type: 'text',
    value: nicknameStore.getLastNickname(),
    placeholder: '名前を入力',
  });
  const nicknameError = el(
    'div',
    { class: 'field-error' },
    'ニックネームを入力してください'
  );
  const nicknameField = el(
    'div',
    { class: 'form-group-inline' },
    el('label', { for: nicknameId }, 'ニックネーム'),
    nicknameInput,
    nicknameError
  );

  const showNicknameError = () => {
    nicknameInput.classList.add('input-error');
    nicknameError.classList.add('visible');
  };

  const hideNicknameError = () => {
    nicknameInput.classList.remove('input-error');
    nicknameError.classList.remove('visible');
  };

  nicknameInput.addEventListener('input', hideNicknameError);
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
  const statusBar = createStatusBar({ voteCount: 0, maxVotes: null });
  const errorMessage = el('div', {
    class: 'error-message',
    style: 'display:none',
  });
  const calendarContainer = el('div');
  const participantsComponent = createParticipants({ participants: [] });

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
        nicknameField,
        errorMessage,
        statusBar.element,
        calendarContainer
      ),
      el('div', { class: 'card' }, participantsComponent.element)
    )
  );
  if (editButton) app.append(editButton);
  let calendarComponent = null;

  async function fetchAndUpdateParticipants() {
    try {
      const data = await getParticipants({ formId });
      participantsComponent.update({ participants: data.participants || [] });
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  }

  (async () => {
    try {
      const j = await getForm({ formId });
      head.append(el('div', { class: 'muted form-message' }, j.message || ''));
      render(j);
      await fetchAndUpdateParticipants();
    } catch (err) {
      calendarContainer.innerHTML = '<p>読み込み失敗</p>';
    }
  })();

  let processingDate = null;

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
          await unvote({ formId: j.formId, date, userId });
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
        await fetchAndUpdateParticipants();
        return;
      }
      const nickname = nicknameInput.value.trim();
      if (!nickname) {
        showNicknameError();
        processingDate = null;
        render(j);
        return;
      }
      try {
        await vote({ formId: j.formId, date, userId, nickname });
      } catch (err) {
        showError('投票失敗: ' + err.message);
        processingDate = null;
        render(j);
        return;
      }
      nicknameStore.saveLastNickname(nickname);
      voteStore.add(j.formId, date);
      j.counts[date] = (j.counts[date] || 0) + 1;
      processingDate = null;
      render(j);
      await fetchAndUpdateParticipants();
    };
    const calendarProps = {
      options: j.options,
      counts,
      voted,
      maxVotes,
      processingDate,
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
