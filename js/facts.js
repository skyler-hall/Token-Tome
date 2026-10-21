/**
 * facts.js
 * The Fun facts tab: fact cards (text lives in data/fun-facts.json)
 * and a bar chart of what kinds of tokens make up the dictionary.
 */
import { byId, escapeHTML } from './utils.js';

/** Chart rows: label and which kind codes it adds up (see config.js KIND_LABELS). */
const CHART_GROUPS = [
  ['Word pieces', 'wc'],
  ['Whole words', 'WC'],
  ['Punctuation and symbols', 'p'],
  ['Byte fragments', 'b'],
  ['Numbers', 'n'],
  ['Whitespace', 's'],
  ['Invisible and marks', 'im'],
  ['Special tokens', 'xr'],
];

export function initFacts(app, funFacts) {
  const { vocab } = app;

  // Fact cards. "title" in the JSON overrides the shown word (used for "128 spaces").
  const grid = byId('fact-grid');
  grid.innerHTML = funFacts.map((fact) => `
    <div class="fact">
      <button class="fact__word" data-go="${fact.id}">${fact.title ? escapeHTML(fact.title) : vocab.wordHTML(fact.id)}</button>
      <div class="note">#${fact.id.toLocaleString()}</div>
      <p class="fact__text">${escapeHTML(fact.text)}</p>
    </div>`).join('');
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-go]');
    if (button) app.openEntry(+button.dataset.go);
  });

  // Bar chart
  const counts = {};
  for (let id = 0; id < vocab.count; id++) counts[vocab.kind(id)] = (counts[vocab.kind(id)] || 0) + 1;
  const rows = CHART_GROUPS.map(([label, codes]) => [label, [...codes].reduce((sum, code) => sum + (counts[code] || 0), 0)]);
  const biggest = Math.max(...rows.map(([, total]) => total));
  byId('type-chart').innerHTML = rows.map(([label, total]) => `
    <div class="chart__row" role="listitem" aria-label="${label}: ${total.toLocaleString()} tokens">
      <span aria-hidden="true">${label}</span>
      <div class="chart__track"><div class="chart__fill" style="width:${Math.max(0.5, (total / biggest) * 100).toFixed(1)}%"></div></div>
      <span class="chart__num" aria-hidden="true">${total.toLocaleString()}</span>
    </div>`).join('');
}
