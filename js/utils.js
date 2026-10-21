/**
 * utils.js
 * Small helpers shared by every feature.
 */

/** Shortcut for document.getElementById. */
export const byId = (id) => document.getElementById(id);

/** Make text safe to put inside HTML (stops anyone injecting code). */
export function escapeHTML(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Smooth scrolling, unless the visitor turned on "reduce motion". */
export function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/** Run Enter or Space key presses like a click (for role="button" elements). */
export function onActivate(element, handler) {
  element.addEventListener('click', handler);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(event);
    }
  });
}

/** Wait until the user stops typing before running `fn`. */
export function debounce(fn, waitMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

/**
 * Browser storage that never crashes. Storage can be blocked
 * (private mode, embedded viewers), so every call is wrapped.
 */
export const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage blocked: the feature still works, it just won't remember */
    }
  },
};

/**
 * Copy text to the clipboard. Tries the modern way first, then an
 * older method that works inside more embedded viewers.
 * Resolves true if the copy worked.
 */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the older method */
    }
  }
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'absolute';
    box.style.left = '-9999px';
    document.body.appendChild(box);
    box.select();
    const worked = document.execCommand('copy');
    box.remove();
    return worked;
  } catch {
    return false;
  }
}

/** Build the colored token blocks used by the splitter, game, and saved list. */
export function tokenChipsHTML(ids, vocab) {
  return ids
    .map((id, i) => {
      const label = vocab.isFragment(id) ? 'byte' : vocab.plainText(id);
      return `<button class="chip ${i % 2 ? 'chip--b' : 'chip--a'}" data-token-id="${id}" title="#${id} ${escapeHTML(vocab.kindLabel(id))}">${escapeHTML(label)}</button>`;
    })
    .join('');
}
