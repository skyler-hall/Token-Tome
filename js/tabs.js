/**
 * tabs.js
 * The Dictionary / Play / Fun facts / Saved tabs in the top right.
 * Each part of the page is tagged with data-view="..." in index.html,
 * and CSS shows only the parts for the active tab.
 *
 * Exposes: app.setTab(name, { scrollToTop })
 */
export function initTabs(app) {
  const tabs = document.querySelectorAll('.tab[data-tab]');

  function setTab(name, { scrollToTop = true } = {}) {
    if (document.body.dataset.activeView === name) return;
    document.body.dataset.activeView = name;
    tabs.forEach((tab) => {
      if (tab.dataset.tab === name) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    if (scrollToTop) window.scrollTo(0, 0);
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
  app.setTab = setTab;
}
