/**
 * saved.js
 * Words the visitor saves with the "Save word" button.
 * Stored only in their own browser (localStorage).
 *
 * Exposes: app.isSaved(id), app.toggleSaved(id)
 */
import { STORAGE_KEYS } from './config.js';
import { byId, storage, tokenChipsHTML } from './utils.js';

export function initSaved(app) {
  const list = byId('saved-list');
  let savedIds = storage.get(STORAGE_KEYS.savedWords, []);

  function render() {
    list.innerHTML = savedIds.length
      ? tokenChipsHTML(savedIds, app.vocab)
      : '<p class="note">Nothing saved yet. Open any word and tap Save word.</p>';
  }

  app.isSaved = (id) => savedIds.includes(id);
  app.toggleSaved = (id) => {
    savedIds = app.isSaved(id) ? savedIds.filter((x) => x !== id) : [id, ...savedIds];
    storage.set(STORAGE_KEYS.savedWords, savedIds);
    render();
    app.refreshSaveButton();
  };

  list.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-token-id]');
    if (chip) app.openEntry(+chip.dataset.tokenId);
  });

  render();
}
