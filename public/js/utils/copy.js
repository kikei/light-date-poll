import { el, withLoading } from './dom.js';

/**
 * Create a button that copies provided text to clipboard.
 * Optionally falls back to selecting a paired input when Clipboard API fails.
 */
export function createCopyButton({
  text,
  input,
  label = 'コピー',
  copiedLabel = 'コピー済み',
}) {
  const btn = el(
    'button',
    {
      async onclick() {
        await withLoading(btn, async () => {
          try {
            await navigator.clipboard.writeText(text);
          } catch (err) {
            if (!input) throw err;
            input.select();
            document.execCommand('copy');
          }
          btn.textContent = copiedLabel;
          await new Promise(r => setTimeout(r, 1200));
        });
      },
    },
    label
  );
  return btn;
}
