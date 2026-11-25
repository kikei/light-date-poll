import { el } from '../utils/dom.js';

/**
 * Create the opening question: two buttons over the vote screen.
 * The cost of a first answer is one tap either way, so declining is no
 * harder than showing interest, and silence stops being the cheap option.
 * @param {Object} params
 * @param {(choice: string) => void} params.onChoose
 * @param {{ choice: string, label: string, note: string }[]} params.choices
 * @param {boolean} params.hidden - Start dismissed, for a return visit.
 * @returns {{ element: HTMLElement, setBusy: Function }}
 */
export function createEntryGate({
  choices = [],
  onChoose,
  hidden = false,
} = {}) {
  // A second line under each label: the two answers start with 参加 and
  // end with ない, so at a glance they have the same shape and only the
  // middle differs. Saying what each one means gives them distinct
  // silhouettes without ranking one above the other.
  const buttons = choices.map(choice =>
    el(
      'button',
      {
        class: `entry-gate-btn entry-gate-btn--${choice.choice}`,
        type: 'button',
        onclick: () => {
          if (typeof onChoose === 'function') onChoose(choice.choice);
        },
      },
      el('span', { class: 'entry-gate-label' }, choice.label),
      el('span', { class: 'entry-gate-note' }, choice.note || '')
    )
  );

  const panel = el('div', { class: 'entry-gate-panel' }, ...buttons);
  const element = el(
    'div',
    {
      class: 'entry-gate',
      role: 'dialog',
      'aria-modal': 'true',
      hidden,
    },
    panel
  );

  const setBusy = busy => {
    buttons.forEach(button => {
      button.disabled = busy;
    });
    panel.classList.toggle('busy', busy);
  };

  return { element, setBusy };
}
