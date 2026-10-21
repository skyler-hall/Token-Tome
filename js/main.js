/**
 * main.js
 * Starts the site: loads the data, then turns on each feature.
 *
 * Every feature lives in its own file and receives the shared `app`
 * object. Features add the functions others need to `app`, for
 * example entry-card.js adds app.openEntry so the game, the word
 * list, and the saved list can all open a word.
 *
 *   tabs.js         Dictionary / Play / Fun facts / Saved
 *   saved.js        saved words
 *   entry-card.js   the big word card, share, random word
 *   dictionary.js   word list, sorting, search, paging, letter index
 *   word-of-day.js  daily word
 *   splitter.js     "See how the model reads it"
 *   game.js         "How many tokens?"
 *   facts.js        fun facts and chart
 */
import { DATA_FILES } from './config.js';
import { byId } from './utils.js';
import { createVocab } from './vocab.js';
import { initTabs } from './tabs.js';
import { initSaved } from './saved.js';
import { initEntryCard } from './entry-card.js';
import { initDictionary } from './dictionary.js';
import { initWordOfDay } from './word-of-day.js';
import { initSplitter } from './splitter.js';
import { initGame } from './game.js';
import { initFacts } from './facts.js';

/**
 * Load data. The single-file build (scripts/bundle-single-file.mjs)
 * puts the data right in the page as window.__TOKEN_TOME_DATA__;
 * otherwise it's fetched from the data/ folder.
 */
async function loadData() {
  if (window.__TOKEN_TOME_DATA__) return window.__TOKEN_TOME_DATA__;
  const fetchJSON = (url) => fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.json();
  });
  const [vocab, gameWords, funFacts] = await Promise.all([
    fetchJSON(DATA_FILES.vocab),
    fetchJSON(DATA_FILES.gameWords),
    fetchJSON(DATA_FILES.funFacts),
  ]);
  return { vocab, gameWords, funFacts };
}

async function start() {
  let data;
  try {
    data = await loadData();
  } catch (error) {
    byId('guide-words').textContent = 'The dictionary couldn’t load. Try refreshing the page.';
    console.error(error);
    return;
  }

  const app = { vocab: createVocab(data.vocab) };

  // Order matters: features listed first provide functions the later ones use.
  initTabs(app);
  initSaved(app);
  initEntryCard(app);
  initDictionary(app);
  initWordOfDay(app);
  initSplitter(app);
  initGame(app, data.gameWords);
  initFacts(app, data.funFacts);

  app.openFromLink(false); // open a word if the link ends in #1234
}

start();
