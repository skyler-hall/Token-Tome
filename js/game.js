/**
 * game.js
 * "How many tokens?" Shows a word, the visitor guesses how many
 * tokens it splits into. Tracks score, streak, and a saved high score.
 *
 * Words come from data/game-words.json (built from game-words.txt
 * by scripts/build-game-words.mjs).
 */
import { STORAGE_KEYS } from './config.js';
import { byId, storage, tokenChipsHTML } from './utils.js';

const CHOICES = [1, 2, 3, 4, 5]; // 5 means "5 or more"

export function initGame(app, gameWords) {
  const els = {
    score: byId('game-score'),
    best: byId('game-best'),
    word: byId('game-word'),
    choices: byId('game-choices'),
    result: byId('game-result'),
    next: byId('game-next'),
  };

  const score = { right: 0, played: 0, streak: 0, best: storage.get(STORAGE_KEYS.highScore, 0) };
  let order = [];
  let position = 0;
  let current = null;
  let answered = false;

  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  function showScores(newBest = false) {
    els.score.textContent = `Score ${score.right} of ${score.played}  ·  Streak ${score.streak}`;
    els.best.innerHTML = `${newBest ? 'New high score!' : 'High score:'} <b>${score.best}</b> in a row`;
  }

  function nextWord() {
    if (position >= order.length) { order = shuffle(gameWords.map((_, i) => i)); position = 0; }
    current = gameWords[order[position++]];
    answered = false;
    els.word.textContent = current.word;
    els.result.innerHTML = '';
    els.next.hidden = true;
    els.choices.innerHTML = CHOICES.map((n) => `<button data-guess="${n}">${n === 5 ? '5+' : n}</button>`).join('');
  }

  function guess(button) {
    if (answered) return;
    answered = true;
    const actual = current.ids.length;
    const correctChoice = Math.min(actual, 5);
    const isRight = +button.dataset.guess === correctChoice;

    score.played++;
    let newBest = false;
    if (isRight) {
      score.right++;
      score.streak++;
      if (score.streak > score.best) {
        score.best = score.streak;
        newBest = true;
        storage.set(STORAGE_KEYS.highScore, score.best);
      }
    } else {
      score.streak = 0;
    }

    els.choices.querySelectorAll('button').forEach((b) => {
      if (+b.dataset.guess === correctChoice) b.classList.add('is-right');
      else if (b === button) b.classList.add('is-wrong');
    });
    els.result.innerHTML = `<p>${isRight ? 'Nice!' : 'Not quite.'} It’s <b>${actual}</b> token${actual > 1 ? 's' : ''}:</p>`
      + tokenChipsHTML(current.ids, app.vocab);
    els.next.hidden = false;
    showScores(newBest);
  }

  els.choices.addEventListener('click', (event) => {
    const button = event.target.closest('[data-guess]');
    if (button) guess(button);
  });
  els.next.addEventListener('click', nextWord);
  els.result.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-token-id]');
    if (chip) app.openEntry(+chip.dataset.tokenId);
  });

  showScores();
  nextWord();
}
