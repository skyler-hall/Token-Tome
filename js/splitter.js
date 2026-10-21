/**
 * splitter.js
 * The "See how the model reads it" box. Splits whatever you type
 * into tokens using the real Llama 3 tokenizer.
 *
 * The tokenizer is about 3 MB, so it only downloads the first time
 * someone types in the box (see TOKENIZER_URL in config.js).
 */
import { TOKENIZER_URL } from './config.js';
import { byId, debounce, tokenChipsHTML } from './utils.js';

const HINT = 'Each colored block is one token. Tap one to look it up.';

export function initSplitter(app) {
  const input = byId('splitter-input');
  const chips = byId('splitter-chips');
  const note = byId('splitter-note');
  let tokenizerPromise = null;

  function loadTokenizer() {
    if (!tokenizerPromise) {
      note.textContent = 'Loading the tokenizer…';
      tokenizerPromise = import(TOKENIZER_URL)
        .then((module) => module.default)
        .catch((error) => { tokenizerPromise = null; throw error; }); // allow a retry
    }
    return tokenizerPromise;
  }

  async function split() {
    const text = input.value;
    if (!text) {
      chips.innerHTML = '';
      note.textContent = HINT;
      return;
    }
    try {
      const tokenizer = await loadTokenizer();
      const ids = tokenizer.encode(text, { bos: false, eos: false });
      chips.innerHTML = tokenChipsHTML(ids, app.vocab);
      note.textContent = `${ids.length} tokens from ${Array.from(text).length} characters. Tap a token to look it up.`;
    } catch {
      note.textContent = 'The tokenizer couldn’t load. Check your connection and try again.';
    }
  }

  input.addEventListener('input', debounce(split, 120));
  chips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-token-id]');
    if (chip) app.openEntry(+chip.dataset.tokenId);
  });
}
