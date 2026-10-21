/**
 * dictionary.js
 * The main word list: A-to-Z or by-number sorting, search, paging,
 * guide words, and the letter index.
 *
 * Exposes to the rest of the app:
 *   app.showInList(id)  jump the list to the page holding this word
 */
import { WORDS_PER_PAGE, PAGE_NUMBERS_EACH_SIDE, SECTIONS, NUMBER_INDEX_STEP } from './config.js';
import { byId, escapeHTML, debounce, scrollBehavior } from './utils.js';

export function initDictionary(app) {
  const { vocab } = app;

  const els = {
    list: byId('word-list'),
    index: byId('letter-index'),
    search: byId('search'),
    sortAZ: byId('sort-az'),
    sortNumber: byId('sort-number'),
    count: byId('entry-count'),
    guideWords: byId('guide-words'),
    pageLabel: byId('page-label'),
    pageNums: byId('page-nums'),
    first: byId('page-first'),
    prev: byId('page-prev'),
    next: byId('page-next'),
    last: byId('page-last'),
  };

  // Current state of the list
  const state = {
    sort: 'az',          // 'az' or 'number'
    query: '',           // search text
    ids: vocab.alphaOrder, // the IDs being shown, in order
    page: 0,
  };

  const baseOrder = () => (state.sort === 'az' ? vocab.alphaOrder : vocab.numberOrder);
  const pageCount = () => Math.max(1, Math.ceil(state.ids.length / WORDS_PER_PAGE));

  // ---------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------

  /** HTML for one dictionary row. */
  function rowHTML(id) {
    const labeled = vocab.isLabeled(id);
    const gloss = vocab.gloss(id);
    const tech = labeled ? ` <span class="tech">&#92; ${escapeHTML(gloss[0])} &#92;</span>` : '';
    // Byte fragments show "part of 😂 😍"; reserved slots skip the repeated sentence.
    let glossLine = '';
    if (labeled && vocab.kind(id) !== 'r') {
      const text = vocab.isFragment(id)
        ? (gloss[1] ? 'part of ' + gloss[1] : 'a leftover piece with no full character')
        : gloss[1];
      glossLine = `<div class="row__gloss">${escapeHTML(text)}</div>`;
    }
    return `<div class="row" data-id="${id}" role="button" tabindex="0">`
      + `<span class="row__word${labeled ? ' row__word--labeled' : ''}">${vocab.wordHTML(id)}${tech}</span>`
      + `<span class="row__meta"><span class="kind">${vocab.kindLabel(id)}</span><span class="token-id">${id.toLocaleString()}</span></span>`
      + glossLine
      + '</div>';
  }

  /** Draw the current page of words, guide words, pager, and index highlight. */
  function render(highlightSection = null) {
    const totalPages = pageCount();
    state.page = Math.min(Math.max(state.page, 0), totalPages - 1);
    const start = state.page * WORDS_PER_PAGE;
    const end = Math.min(start + WORDS_PER_PAGE, state.ids.length);

    if (!state.ids.length) {
      els.list.innerHTML = `<p class="empty-msg">No token contains “${escapeHTML(state.query)}”. The model would build it out of smaller pieces.</p>`;
      els.guideWords.textContent = 'No matches';
      els.pageLabel.textContent = '';
    } else {
      let html = '<div class="word-columns">';
      for (let i = start; i < end; i++) {
        const id = state.ids[i];
        // Big section letter ("A", "B"...) where a new section begins (A-to-Z mode only)
        const sectionStarts = state.sort === 'az' && !state.query && (i === 0 || vocab.section(state.ids[i - 1]) !== vocab.section(id));
        if (sectionStarts) {
          html += `<div class="section-letter" id="section-${vocab.section(id)}">${SECTIONS[vocab.section(id)].name}</div>`;
        }
        html += rowHTML(id);
      }
      els.list.innerHTML = html + '</div>';
      // Guide words, like the top corners of a printed dictionary page
      els.guideWords.textContent = `${vocab.plainText(state.ids[start])} to ${vocab.plainText(state.ids[end - 1])}`;
      els.pageLabel.textContent = `Page ${(state.page + 1).toLocaleString()} of ${totalPages.toLocaleString()}`;
    }

    renderPager(totalPages);
    els.count.textContent = state.query
      ? `${state.ids.length.toLocaleString()} matches`
      : `${vocab.count.toLocaleString()} entries`;
    highlightIndex(highlightSection);
    markCutOffWords();
  }

  /** « ‹ 2 3 [4] 5 6 › » */
  function renderPager(totalPages) {
    let html = '';
    for (let p = state.page - PAGE_NUMBERS_EACH_SIDE; p <= state.page + PAGE_NUMBERS_EACH_SIDE; p++) {
      if (p < 0 || p >= totalPages) continue;
      const current = p === state.page ? ' aria-current="page"' : '';
      html += `<button data-page="${p}"${current}>${(p + 1).toLocaleString()}</button>`;
    }
    els.pageNums.innerHTML = html;
    els.first.disabled = els.prev.disabled = state.page === 0;
    els.last.disabled = els.next.disabled = state.page >= totalPages - 1;
  }

  /** Long words get cut off with "…"; mark them so a tap expands them. */
  function markCutOffWords() {
    els.list.querySelectorAll('.row__word:not(.row__word--labeled)').forEach((word) => {
      if (word.scrollWidth > word.clientWidth + 1) {
        word.classList.add('is-cut');
        word.title = 'Tap to see the full word';
      }
    });
  }

  // ---------------------------------------------------------------
  // Letter index (A-Z sidebar, or 0k-120k in number mode)
  // ---------------------------------------------------------------
  function buildIndex() {
    if (state.sort === 'az') {
      els.index.innerHTML = SECTIONS.map((section, i) => {
        // The spoken name must include the visible text (for voice control)
        const label = section.name.startsWith(section.tab) || section.tab.length === 1 ? section.name : `${section.tab}, ${section.name}`;
        return `<button data-section="${i}" class="${section.tab.length > 1 ? 'is-word' : ''}" aria-label="${label}">${section.tab}</button>`;
      }).join('');
    } else {
      const steps = Math.ceil(vocab.count / NUMBER_INDEX_STEP);
      let html = '';
      for (let i = 0; i < steps; i++) html += `<button data-section="${i}" class="is-word">${(i * NUMBER_INDEX_STEP) / 1000}k</button>`;
      els.index.innerHTML = html;
    }
  }

  /** Highlight the index button for the section at the top of this page. */
  function highlightIndex(forced) {
    let current = forced;
    if (current === null && state.ids.length && !state.query) {
      const firstId = state.ids[state.page * WORDS_PER_PAGE];
      current = state.sort === 'az' ? vocab.section(firstId) : Math.floor(firstId / NUMBER_INDEX_STEP);
    }
    els.index.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('is-current', !state.query && +button.dataset.section === current);
    });
  }

  function jumpToSection(sectionNumber) {
    clearSearch();
    let position;
    if (state.sort === 'az') {
      position = state.ids.findIndex((id) => vocab.section(id) >= sectionNumber);
    } else {
      position = Math.min(sectionNumber * NUMBER_INDEX_STEP, vocab.count - 1);
    }
    state.page = Math.floor(Math.max(position, 0) / WORDS_PER_PAGE);
    render(sectionNumber);
    const heading = state.sort === 'az' && byId('section-' + sectionNumber);
    (heading || els.list).scrollIntoView({ block: 'start' });
  }

  // ---------------------------------------------------------------
  // Sorting and search
  // ---------------------------------------------------------------
  function setSort(sort) {
    state.sort = sort;
    els.sortAZ.setAttribute('aria-pressed', sort === 'az');
    els.sortNumber.setAttribute('aria-pressed', sort === 'number');
    buildIndex();
    applySearch();
  }

  /** Filter by the search text. Exact matches go to the top. */
  function applySearch() {
    state.page = 0;
    const base = baseOrder();
    if (!state.query) {
      state.ids = base;
      render();
      return;
    }
    const q = state.query.toLowerCase().replace(/^·/, '');
    const matches = base.filter((id) => {
      const gloss = vocab.gloss(id);
      return vocab.rawText(id).toLowerCase().includes(q) || (gloss && gloss[0].toLowerCase().includes(q));
    });
    const exact = (id) => (vocab.rawText(id).trim().toLowerCase() === q ? 0 : 1);
    state.ids = matches.sort((a, b) => exact(a) - exact(b)); // stable sort keeps A-Z order within groups
    render();
  }

  function clearSearch() {
    if (!state.query) return;
    state.query = '';
    els.search.value = '';
    state.ids = baseOrder();
  }

  // ---------------------------------------------------------------
  // Paging
  // ---------------------------------------------------------------
  function goToPage(page) {
    state.page = page;
    render();
    // Keep the reader at the list instead of jumping to the very top
    const guide = els.guideWords.parentNode;
    if (guide.getBoundingClientRect().top < 0) guide.scrollIntoView({ block: 'start' });
  }

  // ---------------------------------------------------------------
  // Event wiring
  // ---------------------------------------------------------------
  els.sortAZ.addEventListener('click', () => setSort('az'));
  els.sortNumber.addEventListener('click', () => setSort('number'));
  els.search.addEventListener('input', debounce(() => {
    state.query = els.search.value.trim();
    applySearch();
  }, 150));

  els.first.addEventListener('click', () => goToPage(0));
  els.prev.addEventListener('click', () => goToPage(state.page - 1));
  els.next.addEventListener('click', () => goToPage(state.page + 1));
  els.last.addEventListener('click', () => goToPage(pageCount() - 1));
  els.pageNums.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (button) goToPage(+button.dataset.page);
  });

  els.index.addEventListener('click', (event) => {
    const button = event.target.closest('[data-section]');
    if (button) jumpToSection(+button.dataset.section);
  });

  // Tapping a row: expand a cut-off word first, otherwise open its entry
  els.list.addEventListener('click', (event) => {
    const word = event.target.closest('.row__word');
    if (word && word.classList.contains('is-cut') && !word.classList.contains('is-expanded')) {
      word.classList.add('is-expanded');
      word.classList.remove('is-cut');
      return;
    }
    const row = event.target.closest('.row');
    if (row) app.openEntry(+row.dataset.id);
  });
  // Keyboard: Enter or Space on a row opens it
  els.list.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.row')) {
      event.preventDefault();
      app.openEntry(+event.target.dataset.id);
    }
  });
  window.addEventListener('resize', debounce(markCutOffWords, 200));

  // Shared with other features
  app.showInList = (id) => {
    clearSearch();
    state.ids = baseOrder();
    const position = state.sort === 'az' ? vocab.alphaPosition(id) : id;
    state.page = Math.floor(position / WORDS_PER_PAGE);
    render();
    els.list.scrollIntoView({ behavior: scrollBehavior() });
  };

  buildIndex();
  render();
}
