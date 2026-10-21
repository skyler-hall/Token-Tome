/**
 * build-vocab.mjs
 * ---------------------------------------------------------------
 * Step 1 of 2 for rebuilding data/vocab.json.
 *
 * Reads every token from the Llama 3 tokenizer and writes:
 *   - the display text for each token
 *   - a one-letter "kind" code for each token (see KIND CODES)
 *   - which dictionary section it belongs to (A-Z, symbols, etc.)
 *   - the A-to-Z sort order
 *   - plain-English labels for byte fragments and special tokens
 *
 * Step 2 (label-invisible.py) then renames invisible characters.
 * Run both with:  npm run build:data
 *
 * To support a NEW model later, swap the tokenizer import below and
 * update TOTAL_REGULAR_TOKENS and SPECIAL_TOKEN_INFO.
 * ---------------------------------------------------------------
 */
import tokenizer from 'llama3-tokenizer-js';
import fs from 'fs';

const OUT_FILE = new URL('../data/vocab.json', import.meta.url);

/** Regular tokens are 0..127,999. IDs above that are special tokens. */
const TOTAL_REGULAR_TOKENS = 128000;

/**
 * KIND CODES (one letter per token, stored as one long string):
 *   W word (starts with a space)               w word piece
 *   C capitalized word (starts with a space)   c capitalized piece
 *   n number   p punctuation   s whitespace
 *   b byte fragment   x control token   r reserved token
 *   i invisible character   m combining mark   (added in step 2)
 */

/** Plain-English names for the special control tokens. */
const SPECIAL_TOKEN_INFO = {
  128000: ['start of text', 'Marks the very beginning of everything the model reads.'],
  128001: ['end of text', 'Tells the model the whole text is over.'],
  128004: ['padding', 'Filler used in training to make batches the same length.'],
  128006: ['start of speaker name', 'Opens the label for who is talking: system, user, or assistant.'],
  128007: ['end of speaker name', 'Closes the speaker label.'],
  128008: ['end of message', 'Ends a message when the model is waiting on a tool to answer.'],
  128009: ['end of turn', 'Says the speaker is done. This is how the model knows to stop talking.'],
  128010: ['python tag', 'Signals the model is about to write code for a tool.'],
};

// ---------------------------------------------------------------
// Byte helpers
// Llama 3 stores each token as "byte-level" text. These helpers turn
// it back into real bytes so we can tell complete characters apart
// from fragments of emoji or other multi-byte characters.
// ---------------------------------------------------------------
function buildByteDecoder() {
  const bs = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = bs.slice();
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++; }
  }
  const map = {};
  bs.forEach((b, i) => { map[String.fromCharCode(cs[i])] = b; });
  return map;
}
const byteOf = buildByteDecoder();
const tokenBytes = (id) => [...tokenizer.vocabById[id]].map((c) => byteOf[c]);
const hex = (bytes) => bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
const strictDecoder = new TextDecoder('utf-8', { fatal: true });
const isContinuationByte = (b) => b >= 0x80 && b < 0xc0;
const sequenceLength = (b) => (b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1);

// ---------------------------------------------------------------
// Example characters for byte fragments ("part of 😂 😍 😊").
// Prefers popular characters, then ones that are their own token
// (a sign they are common), then everything else.
// ---------------------------------------------------------------
const POPULAR = [...'😂❤😍🤣😊🙏😭😘👍😅👏🔥🤖🎉✨💯🌸⭐☀🍕🚀💡🎵🐱🌍😎🥰🤔👀💀🙌🎶🌙🍎🏠⚡✅❌→←★♥€£¥©®™°±×÷√∞≈≠≤≥•…“”‘’—–éèêëàâäçñöüßøåáíóúãõőűłœ一人大中日本国我的是你好こんにちはありがとうカタアイ한국어안녕Привет мирαβγδπΣΩשלוםمرحباनमस्तेสวัสดี'];
const popularRank = new Map();
POPULAR.forEach((c, i) => { const cp = c.codePointAt(0); if (!popularRank.has(cp)) popularRank.set(cp, i); });

const candidates = [];
function addCandidate(cp) {
  const ch = String.fromCodePoint(cp);
  if (/[\p{L}\p{N}\p{S}\p{P}]/u.test(ch)) candidates.push({ cp, ch, bytes: [...new TextEncoder().encode(ch)] });
}
for (let cp = 0x80; cp < 0x10000; cp++) if (cp < 0xd800 || cp > 0xdfff) addCandidate(cp);
for (let cp = 0x1f000; cp < 0x1fb00; cp++) addCandidate(cp);
for (let cp = 0x20000; cp < 0x20100; cp++) addCandidate(cp);

const rank = new Map();
for (const c of candidates) {
  let r;
  if (popularRank.has(c.cp)) r = popularRank.get(c.cp);
  else {
    const ids = tokenizer.encode(c.ch, { bos: false, eos: false });
    r = ids.length === 1 ? 1000 + ids[0] : 1e7 + c.cp;
  }
  rank.set(c.cp, r);
}
const pickExamples = (list) => list.sort((a, b) => rank.get(a.cp) - rank.get(b.cp)).slice(0, 3);

/** Name the "family" of a character, like "emoji" or "Korean letter". */
function familyOf(cp) {
  if (cp >= 0x1f000) return cp >= 0x20000 ? 'Chinese character' : 'emoji';
  if (cp < 0x250) return 'accented letter';
  if (cp < 0x370) return 'phonetic symbol';
  if (cp < 0x400) return 'Greek letter';
  if (cp < 0x530) return 'Cyrillic letter';
  if (cp < 0x590) return 'Armenian letter';
  if (cp < 0x600) return 'Hebrew letter';
  if (cp < 0x700) return 'Arabic letter';
  if (cp >= 0x900 && cp < 0xe00) return 'Indic letter';
  if (cp >= 0xe00 && cp < 0xe80) return 'Thai letter';
  if (cp >= 0x10a0 && cp < 0x1100) return 'Georgian letter';
  if ((cp >= 0x1100 && cp < 0x1200) || (cp >= 0xac00 && cp < 0xd7b0) || (cp >= 0x3130 && cp < 0x3190)) return 'Korean letter';
  if (cp >= 0x1e00 && cp < 0x1f00) return 'accented letter';
  if (cp >= 0x1f00 && cp < 0x2000) return 'Greek letter';
  if (cp >= 0x2000 && cp < 0x2070) return 'punctuation mark';
  if (cp >= 0x20a0 && cp < 0x20d0) return 'currency sign';
  if (cp >= 0x2190 && cp < 0x2200) return 'arrow';
  if (cp >= 0x2200 && cp < 0x2300) return 'math symbol';
  if (cp >= 0x2600 && cp < 0x2800) return 'symbol';
  if (cp >= 0x3040 && cp < 0x3100) return 'Japanese kana';
  if (cp >= 0x3000 && cp < 0x3040) return 'CJK punctuation';
  if ((cp >= 0x4e00 && cp < 0xa000) || (cp >= 0x3400 && cp < 0x4dc0)) return 'Chinese character';
  if (cp >= 0xff00 && cp < 0xfff0) return 'full-width character';
  return /\p{L}/u.test(String.fromCodePoint(cp)) ? 'letter' : 'symbol';
}
function familyOfList(list) {
  const counts = {};
  list.forEach((c) => { const f = familyOf(c.cp); counts[f] = (counts[f] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return 'character';
  if (sorted.length > 1 && sorted[0][1] < list.length * 0.8) return 'character';
  return sorted[0][0];
}

/** Describe a byte fragment: a label like "emoji start" plus examples. */
const fragmentCache = new Map();
function describeFragment(bytes) {
  let h = 0;
  while (h < bytes.length && isContinuationByte(bytes[h])) h++;
  let tail = [];
  for (let j = bytes.length - 1; j >= h; j--) {
    if (!isContinuationByte(bytes[j])) {
      if (bytes[j] >= 0xc0 && bytes.length - j < sequenceLength(bytes[j])) tail = bytes.slice(j);
      break;
    }
  }
  const head = bytes.slice(0, h);
  const middle = new TextDecoder().decode(new Uint8Array(bytes.slice(h, bytes.length - tail.length)));
  const key = head.join(',') + '|' + tail.join(',');

  if (!fragmentCache.has(key)) {
    const startsWith = (a, p) => p.every((x, i) => a[i] === x);
    const endsWith = (a, p) => a.length >= p.length && p.every((x, i) => a[a.length - p.length + i] === x);
    let part = 'piece';
    let matches = [];
    if (tail.length && !head.length) { part = 'start'; matches = candidates.filter((c) => startsWith(c.bytes, tail)); }
    else if (head.length && !tail.length) { part = 'end'; matches = candidates.filter((c) => endsWith(c.bytes, head) && c.bytes.length > head.length); }
    else if (head.length && tail.length) { part = 'end'; matches = candidates.filter((c) => endsWith(c.bytes, head)); }
    fragmentCache.set(key, { part, family: matches.length ? familyOfList(matches) : 'character', examples: pickExamples(matches) });
  }
  const { part, family, examples } = fragmentCache.get(key);
  let label = head.length && tail.length ? family + ' end, then start' : family + ' ' + part;
  if (middle.trim()) label += ' + ' + middle.trim();
  if (/^\s/.test(middle) && !head.length) label = ' ' + label;
  return { label, examples: examples.map((e) => e.ch).join(' ') };
}

/** One-letter kind code for a normal (fully readable) token. */
function kindOf(text) {
  if (/^\s+$/.test(text)) return 's';
  if (/^ ?\d+$/.test(text)) return 'n';
  if (/^ ?[^\p{L}\p{N}]+$/u.test(text)) return 'p';
  if (/^ ?\p{Lu}\p{Ll}*$/u.test(text)) return text.startsWith(' ') ? 'C' : 'c';
  return text.startsWith(' ') ? 'W' : 'w';
}

// ---------------------------------------------------------------
// Build every entry
// ---------------------------------------------------------------
const words = [];   // display text (or plain-English label)
const kinds = [];   // one-letter kind codes
const glosses = {}; // id -> [technical form, short description]

for (let id = 0; id < TOTAL_REGULAR_TOKENS; id++) {
  const bytes = tokenBytes(id);
  let text = null;
  try { text = strictDecoder.decode(new Uint8Array(bytes)); } catch { /* a byte fragment */ }

  if (text !== null) {
    words.push(text);
    kinds.push(kindOf(text));
  } else {
    const { label, examples } = describeFragment(bytes);
    words.push(label);
    kinds.push('b');
    glosses[id] = [hex(bytes), examples];
  }
}

for (let id = TOTAL_REGULAR_TOKENS; id < tokenizer.vocabById.length; id++) {
  const technical = tokenizer.vocabById[id];
  if (SPECIAL_TOKEN_INFO[id]) {
    words.push(SPECIAL_TOKEN_INFO[id][0]);
    kinds.push('x');
    glosses[id] = [technical, SPECIAL_TOKEN_INFO[id][1]];
  } else {
    words.push('unused slot ' + technical.match(/(\d+)/)[1]);
    kinds.push('r');
    glosses[id] = [technical, 'Saved by Meta for a future job. Never used in normal text.'];
  }
}

// ---------------------------------------------------------------
// Sections and A-to-Z order
// Sections 0-25 are A-Z, then 26 symbols and numbers, 27 other
// scripts, 28 byte fragments, 29 special tokens.
// ---------------------------------------------------------------
const plainKey = (t) => t.replace(/^\s+/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function sectionOf(id) {
  if (kinds[id] === 'x' || kinds[id] === 'r') return 29;
  if (kinds[id] === 'b') return 28;
  const c = plainKey(words[id])[0] || '';
  if (c >= 'a' && c <= 'z') return c.charCodeAt(0) - 97;
  if (!c || /[\p{N}\p{P}\p{S}\s]/u.test(c)) return 26;
  return 27;
}
const sections = words.map((_, id) => sectionOf(id));
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const sortKey = words.map((t) => t.replace(/^\s+/, ''));
const alphaOrder = [...words.keys()].sort((a, b) =>
  sections[a] - sections[b] ||
  (sections[a] === 29 ? (kinds[a] === kinds[b] ? a - b : kinds[a] === 'x' ? -1 : 1) : 0) ||
  collator.compare(sortKey[a], sortKey[b]) ||
  a - b);

const output = {
  meta: { model: 'Llama 3', usedBy: 'Llama 3, 3.1, and 3.2' },
  words,
  kinds: kinds.join(''),
  sections,
  alphaOrder,
  glosses,
};
fs.writeFileSync(OUT_FILE, JSON.stringify(output));
console.log(`Wrote ${words.length} tokens to data/vocab.json`);
