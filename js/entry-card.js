/**
 * entry-card.js
 * The big card that opens when you tap a word. Shows the word, its
 * type, ID, raw bytes, neighbors, and buttons to save or share it.
 *
 * Exposes to the rest of the app:
 *   app.openEntry(id, { scroll })   open a word's card
 *   app.openRandom()                open a random word
 *   app.refreshSaveButton()         update "Save word" / "Saved ✓"
 *
 * Each word also has its own link: the page URL + "#1820".
 */
import { SITE_NAME } from './config.js';
import { byId, escapeHTML, scrollBehavior, copyText } from './utils.js';

export function initEntryCard(app) {
  const { vocab } = app;
  const card = byId('entry-card');
  let currentId = null;

  /** A neighbor-word button, like "‹ ·the (279)". */
  const neighborButton = (id, label) => `<button class="link-btn" data-go="${id}">${escapeHTML(label)}</button>`;

  function cardHTML(id) {
    const gloss = vocab.gloss(id);
    const bytes = vocab.rawBytes(id);
    const alphaPos = vocab.alphaPosition(id);
    const prevAZ = alphaPos > 0 ? vocab.alphaOrder[alphaPos - 1] : null;
    const nextAZ = alphaPos < vocab.count - 1 ? vocab.alphaOrder[alphaPos + 1] : null;

    return `
      <h2 class="entry-card__word" tabindex="-1" aria-label="${escapeHTML(vocab.screenReaderLabel(id))}">${vocab.wordHTML(id, { forScreenReaders: false })}</h2>
      ${gloss ? `<div class="tech entry-card__tech">&#92; ${escapeHTML(gloss[0])} &#92;</div>` : ''}
      <p class="entry-card__desc">${escapeHTML(vocab.description(id))}</p>
      <dl class="entry-card__facts">
        <dt>Token ID</dt><dd><b>${id.toLocaleString()}</b></dd>
        <dt>Type</dt><dd><i>${vocab.kindLabel(id)}</i></dd>
        ${bytes ? `<dt>Raw bytes</dt><dd class="tech">${bytes}</dd>` : ''}
        <dt>By number</dt><dd>
          ${id > 0 ? neighborButton(id - 1, `‹ ${vocab.plainText(id - 1)} (${id - 1})`) : ''}
          ${id < vocab.count - 1 ? neighborButton(id + 1, `${vocab.plainText(id + 1)} (${id + 1}) ›`) : ''}
        </dd>
        <dt>A to Z</dt><dd>
          ${prevAZ !== null ? neighborButton(prevAZ, `‹ ${vocab.plainText(prevAZ)}`) : ''}
          ${nextAZ !== null ? neighborButton(nextAZ, `${vocab.plainText(nextAZ)} ›`) : ''}
        </dd>
      </dl>
      <div class="entry-card__actions">
        <button class="btn" data-action="save">Save word</button>
        <button class="btn" data-action="share">Share this word</button>
        <button class="btn" data-action="random">Another random word</button>
        <button class="btn" data-action="show-in-list">Show in the list</button>
        <button class="btn" data-action="close">Close</button>
      </div>`;
  }

  function openEntry(id, { scroll = true } = {}) {
    app.setTab('dictionary', { scrollToTop: false });
    id = Math.max(0, Math.min(vocab.count - 1, id | 0));
    currentId = id;
    card.innerHTML = cardHTML(id);
    card.hidden = false;
    app.refreshSaveButton();

    // Move focus to the word so screen readers announce it
    card.querySelector('.entry-card__word').focus({ preventScroll: true });
    // Give the word its own link (#1820) without adding browser history
    try { history.replaceState(null, '', '#' + id); } catch { /* ignore */ }
    if (scroll) card.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }

  function closeEntry() {
    card.hidden = true;
    currentId = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
  }

  /** Random word (skips invisible ones, which look blank). */
  function openRandom() {
    let id;
    do { id = Math.floor(Math.random() * vocab.regularCount); } while (['i', 'm'].includes(vocab.kind(id)));
    openEntry(id);
  }

  // ---------------------------------------------------------------
  // Sharing: phone share menu if available, otherwise copy, and if
  // copying is blocked, show a text box the visitor can copy from.
  // ---------------------------------------------------------------
  async function shareWord(id, button) {
    const url = location.href.split('#')[0] + '#' + id;
    const word = vocab.plainText(id);
    const message = `I found “${word}” on ${SITE_NAME}. To an AI it’s token #${id.toLocaleString()} (${vocab.kindLabel(id)}).`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${SITE_NAME}: ${word}`, text: message, url });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return; // visitor closed the menu
      }
    }
    if (await copyText(`${message} ${url}`)) {
      button.textContent = 'Copied!';
      setTimeout(() => { button.textContent = 'Share this word'; }, 2000);
    } else {
      showCopyBox(`${message} ${url}`);
    }
  }

  function showCopyBox(text) {
    card.querySelector('.entry-card__copybox')?.remove();
    const box = document.createElement('div');
    box.className = 'entry-card__copybox';
    box.innerHTML = '<div class="note">Copy this to share:</div><input type="text" readonly>';
    const input = box.querySelector('input');
    input.value = text;
    card.appendChild(box);
    input.focus();
    input.select();
  }

  // ---------------------------------------------------------------
  // Clicks inside the card
  // ---------------------------------------------------------------
  card.addEventListener('click', (event) => {
    const neighbor = event.target.closest('[data-go]');
    if (neighbor) { openEntry(+neighbor.dataset.go, { scroll: false }); return; }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action || currentId === null) return;
    if (action === 'save') app.toggleSaved(currentId);
    if (action === 'share') shareWord(currentId, event.target);
    if (action === 'random') openRandom();
    if (action === 'show-in-list') app.showInList(currentId);
    if (action === 'close') closeEntry();
  });

  // Open a word from a link like ...#1820
  function openFromLink(scroll) {
    const match = location.hash.match(/^#(\d+)$/);
    if (match) openEntry(+match[1], { scroll });
  }
  window.addEventListener('hashchange', () => openFromLink(true));

  // The "Random word" button in the toolbar
  byId('random-word').addEventListener('click', openRandom);

  app.openEntry = openEntry;
  app.openRandom = openRandom;
  app.refreshSaveButton = () => {
    const button = card.querySelector('[data-action="save"]');
    if (button && currentId !== null) button.textContent = app.isSaved(currentId) ? 'Saved ✓' : 'Save word';
  };
  app.openFromLink = openFromLink;
}
