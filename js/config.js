/**
 * config.js
 * Settings you might want to change, all in one place.
 */

/** How many words show on each page of the dictionary. */
export const WORDS_PER_PAGE = 160;

/** How many page numbers to show on each side of the current page. */
export const PAGE_NUMBERS_EACH_SIDE = 2;

/** Data files (loaded at startup). */
export const DATA_FILES = {
  vocab: 'data/vocab.json',
  gameWords: 'data/game-words.json',
  funFacts: 'data/fun-facts.json',
};

/**
 * The tokenizer used by the "See how the model reads it" box.
 * Pinned to an exact version so it can never change on its own.
 */
export const TOKENIZER_URL = 'https://cdn.jsdelivr.net/npm/llama3-tokenizer-js@1.2.0/+esm';

/** Keys for things saved in the visitor's browser. */
export const STORAGE_KEYS = {
  savedWords: 'tokentome-saved',
  highScore: 'tokentome-best',
};

/** Regular tokens are 0..127,999. Above that are special tokens. */
export const REGULAR_TOKEN_COUNT = 128000;

/** Site name, used in share messages. */
export const SITE_NAME = 'Token Tome';

/**
 * Plain-English names for each one-letter "kind" code in vocab.json.
 * See scripts/build-vocab.mjs for how each kind is decided.
 */
export const KIND_LABELS = {
  W: 'word',
  w: 'word piece',
  C: 'capitalized word',
  c: 'capitalized piece',
  n: 'number',
  p: 'punctuation',
  s: 'whitespace',
  b: 'byte fragment',
  x: 'control token',
  r: 'reserved token',
  i: 'invisible character',
  m: 'combining mark',
};

/** Description shown in the entry card for each kind (labeled kinds use their own text). */
export const KIND_DESCRIPTIONS = {
  W: 'A whole word that starts with a space, so the model sees it as one piece.',
  w: 'No space in front, so it’s used when text is glued to something before it, like the middle or end of a word, or right after a symbol.',
  C: 'A capitalized word with a leading space, like at the start of a sentence or a name.',
  c: 'A capitalized piece with no space in front, like at the very start of a message.',
  n: 'Numbers are split into chunks of up to three digits.',
  p: 'Punctuation and symbols get their own entries too.',
  s: 'Spaces, tabs, and line breaks are tokens as well.',
};

/**
 * Dictionary sections, in A-to-Z order. The index matches the
 * "sections" numbers in vocab.json. `tab` is the short label shown
 * in the letter index.
 */
export const SECTIONS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({ name: letter, tab: letter })),
  { name: 'Symbols and numbers', tab: '#' },
  { name: 'Other scripts', tab: 'Other' },
  { name: 'Byte fragments', tab: 'Bytes' },
  { name: 'Special tokens', tab: 'Special' },
];

/** In "By number" mode, the letter index jumps in steps of this many IDs. */
export const NUMBER_INDEX_STEP = 10000;
