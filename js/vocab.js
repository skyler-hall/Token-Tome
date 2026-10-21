/**
 * vocab.js
 * Wraps the raw data from data/vocab.json with easy-to-read helpers,
 * so the rest of the site never has to know how the data is packed.
 *
 * vocab.json contains:
 *   words       display text for each token ID (or a plain-English label)
 *   kinds       one long string, one letter per token (see config.js KIND_LABELS)
 *   sections    section number for each token (see config.js SECTIONS)
 *   alphaOrder  every token ID, sorted A to Z
 *   glosses     { id: [technical form, description] } for labeled tokens
 */
import { KIND_LABELS, KIND_DESCRIPTIONS, REGULAR_TOKEN_COUNT } from './config.js';
import { escapeHTML } from './utils.js';

export function createVocab(data) {
  const { words, kinds, sections, alphaOrder, glosses } = data;
  const count = words.length;

  /** Every ID in number order: [0, 1, 2, ...] */
  const numberOrder = Array.from({ length: count }, (_, i) => i);

  /** Where each ID sits in the A-to-Z order (for "previous/next word"). */
  const alphaPosition = new Int32Array(count);
  alphaOrder.forEach((id, position) => { alphaPosition[id] = position; });

  const kind = (id) => kinds[id];
  const gloss = (id) => glosses[id] || null;

  /** Labeled tokens show a name instead of their raw text (fragments, invisible, special). */
  const isLabeled = (id) => Boolean(glosses[id]);
  const isFragment = (id) => kinds[id] === 'b';
  const isWhitespace = (id) => kinds[id] === 's';
  const startsWithSpace = (id) => words[id].charAt(0) === ' ' && !isWhitespace(id);

  /** Text to display, with tabs, line breaks, and spaces made visible. */
  function displayText(id) {
    const text = words[id];
    if (isLabeled(id)) return text;
    if (isWhitespace(id)) {
      return text.replace(/ /g, '␣').replace(/\n/g, '↵').replace(/\t/g, '⇥').replace(/\r/g, '⏎');
    }
    return text.replace(/\n/g, '↵').replace(/\t/g, '⇥');
  }

  /** Display text with a "·" for a leading space, as plain text. */
  function plainText(id) {
    const text = displayText(id);
    return startsWithSpace(id) ? '·' + text.slice(1) : text;
  }

  /** Display text as HTML, with the leading-space dot styled and hidden from screen readers. */
  function wordHTML(id, { forScreenReaders = true } = {}) {
    const text = displayText(id);
    if (!startsWithSpace(id)) return escapeHTML(text);
    const dot = '<span class="lead-space" aria-hidden="true">·</span>';
    const spoken = forScreenReaders ? '<span class="sr-only">space, </span>' : '';
    return dot + spoken + escapeHTML(text.slice(1));
  }

  /** What a screen reader says for this token, like "the, starts with a space, word, token 279". */
  function screenReaderLabel(id) {
    const name = isWhitespace(id) && !isLabeled(id) ? 'whitespace' : words[id].trim();
    const space = startsWithSpace(id) && !isLabeled(id) ? ', starts with a space' : '';
    return `${name}${space}, ${KIND_LABELS[kinds[id]]}, token ${id}`;
  }

  /** Raw bytes in hex, like "74 68 65". Empty for special and invisible tokens (they show U+ codes instead). */
  function rawBytes(id) {
    if (isFragment(id)) return glosses[id][0].replace(/^20 /, '');
    if (isLabeled(id)) return '';
    return Array.from(new TextEncoder().encode(words[id]), (b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  }

  /** One-sentence explanation shown in the entry card. */
  function description(id) {
    const g = gloss(id);
    if (isFragment(id)) {
      return g[1] ? `Part of ${g[1]}. Only makes sense once joined with other pieces.` : 'A leftover piece with no full character.';
    }
    if (g) return g[1];
    return KIND_DESCRIPTIONS[kinds[id]] || '';
  }

  return {
    count,
    regularCount: REGULAR_TOKEN_COUNT,
    alphaOrder,
    numberOrder,
    alphaPosition: (id) => alphaPosition[id],
    rawText: (id) => words[id],
    section: (id) => sections[id],
    kind,
    kindLabel: (id) => KIND_LABELS[kinds[id]],
    gloss,
    isLabeled,
    isFragment,
    startsWithSpace,
    displayText,
    plainText,
    wordHTML,
    screenReaderLabel,
    rawBytes,
    description,
  };
}
