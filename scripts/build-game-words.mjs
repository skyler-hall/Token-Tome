/**
 * build-game-words.mjs
 * ---------------------------------------------------------------
 * Turns data/game-words.txt (one word per line) into
 * data/game-words.json with the real token IDs for each word,
 * so the guessing game works without loading the tokenizer.
 *
 * To add or remove game words: edit game-words.txt, then run
 *   npm run build:game
 * ---------------------------------------------------------------
 */
import tokenizer from 'llama3-tokenizer-js';
import fs from 'fs';

const IN_FILE = new URL('../data/game-words.txt', import.meta.url);
const OUT_FILE = new URL('../data/game-words.json', import.meta.url);

const words = fs.readFileSync(IN_FILE, 'utf8')
  .split('\n')
  .map((w) => w.replace(/\r$/, ''))
  .filter(Boolean);

const entries = words.map((word) => ({ word, ids: tokenizer.encode(word, { bos: false, eos: false }) }));
fs.writeFileSync(OUT_FILE, JSON.stringify(entries, null, 1) + '\n');
console.log(`Wrote ${entries.length} game words to data/game-words.json`);
