/**
 * word-of-day.js
 * Picks one real whole word each day. Everyone sees the same word on
 * the same day, and it changes at midnight UTC.
 */
import { byId, onActivate } from './utils.js';

/** Only pick friendly words: lowercase, 6 to 12 letters, with a leading space. */
const GOOD_WORD = /^ [a-z]{6,12}$/;

export function initWordOfDay(app) {
  const { vocab } = app;

  const pool = [];
  for (let id = 0; id < vocab.regularCount; id++) {
    if (vocab.kind(id) === 'W' && GOOD_WORD.test(vocab.rawText(id))) pool.push(id);
  }
  const dayNumber = Math.floor(Date.now() / 86400000);
  const shuffledDay = (dayNumber * 2654435761) >>> 0; // spreads days out so neighbors don't get similar words
  const id = pool[shuffledDay % pool.length];

  byId('word-of-day-word').innerHTML = vocab.wordHTML(id);
  byId('word-of-day-meta').innerHTML =
    `<span class="token-id">${id.toLocaleString()}</span> &nbsp;<i class="kind">${vocab.kindLabel(id)}</i> &nbsp;Tap to look it up`;
  onActivate(byId('word-of-day'), () => app.openEntry(id));
}
