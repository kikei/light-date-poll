import { el, set } from '../utils/dom.js';
import * as formStore from '../storage/form-store.js';
import * as nicknameStore from '../storage/nickname-store.js';
import * as noaStore from '../storage/none-of-above-store.js';
import * as userStore from '../storage/user-store.js';
import * as voteStore from '../storage/vote-store.js';
import {
  getForm,
  getRespondents,
  vote,
  unvote,
  setNoneOfAbove,
  unsetNoneOfAbove,
} from '../api-client.js';
import { renderCalendar } from '../components/calendar.js';
import { createStatusBar } from '../components/status-bar.js';
import { createRespondents } from '../components/participants.js';
import { createNoneOfAboveButton } from '../components/none-of-above-button.js';

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
  const statusBar = createStatusBar({
    voteCount: 0,
    maxVotes: null,
  });
  const errorMessage = el('div', {
    class: 'error-message',
    style: 'display:none',
  });
  const calendarContainer = el('div');
  const noaButtonContainer = el('div');
  const respondentsComponent = createRespondents({
    respondents: [],
  });

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
        calendarContainer,
        noaButtonContainer
      ),
      el('div', { class: 'card' }, respondentsComponent.element)
    )
  );
  if (editButton) app.append(editButton);
  let calendarComponent = null;
  let noaButton = null;

  async function fetchAndUpdateRespondents() {
    try {
      const data = await getRespondents({ formId });
      respondentsComponent.update({
        respondents: data.respondents || [],
      });
    } catch (err) {
      console.error('Failed to fetch respondents:', err);
    }
  }

  (async () => {
    try {
      const j = await getForm({ formId });
      head.append(el('div', { class: 'muted form-message' }, j.message || ''));
      render(j);
      await fetchAndUpdateRespondents();
    } catch (err) {
      calendarContainer.innerHTML = '<p>読み込み失敗</p>';
    }
  })();

  let processingDate = null;
  let processingNoa = false;

  function render(j) {
    const voted = voteStore.get(j.formId);
    const noaActive = noaStore.get(j.formId);
    const voteCount = voted.length;
    const maxVotes =
      j.maxVotes === undefined || j.maxVotes === null ? null : j.maxVotes;
    const noaCount = j.noneOfAboveCount ?? 0;

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
        await fetchAndUpdateRespondents();
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
        await vote({
          formId: j.formId,
          date,
          userId,
          nickname,
        });
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
      await fetchAndUpdateRespondents();
    };

    const handleNoaToggle = async newValue => {
      if (processingNoa) return;
      if (newValue) {
        const nickname = nicknameInput.value.trim();
        if (!nickname) {
          showNicknameError();
          return;
        }
        processingNoa = true;
        render(j);
        try {
          await setNoneOfAbove({
            formId: j.formId,
            userId,
            nickname,
          });
        } catch (err) {
          showError('送信失敗: ' + err.message);
          processingNoa = false;
          render(j);
          return;
        }
        nicknameStore.saveLastNickname(nickname);
        noaStore.set(j.formId, true);
        j.noneOfAboveCount = noaCount + 1;
        processingNoa = false;
        render(j);
        await fetchAndUpdateRespondents();
      } else {
        processingNoa = true;
        render(j);
        try {
          await unsetNoneOfAbove({
            formId: j.formId,
            userId,
          });
        } catch (err) {
          showError('取り消し失敗: ' + err.message);
          processingNoa = false;
          render(j);
          return;
        }
        noaStore.set(j.formId, false);
        j.noneOfAboveCount = Math.max(0, noaCount - 1);
        processingNoa = false;
        render(j);
        await fetchAndUpdateRespondents();
      }
    };

    const calendarProps = {
      options: j.options,
      counts,
      voted,
      maxVotes,
      noneOfAboveCount: noaCount,
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
      set(noaButtonContainer, noaButton.element);
    } else {
      noaButton.update(noaProps);
    }
  }
  return app;
}
