# 📖 Token Tome

**tok·en tome** *n.* \ˈtō-kən ˈtōm\ a dictionary of every token an AI model reads, with the number it sees for each one

Language models don't read letters. They read numbered pieces of words called **tokens**. Token Tome lists all 128,256 tokens in Meta's Llama 3 vocabulary (used by Llama 3, 3.1, and 3.2) in a classic dictionary style.

**Live site:** https://skyler-hall.github.io/token-tome/

---

## Contents

1. [Features](#features)
2. [Run it on your computer](#run-it-on-your-computer)
3. [Project layout](#project-layout)
4. [How the code fits together](#how-the-code-fits-together)
5. [The data files](#the-data-files)
6. [Common updates](#common-updates)
7. [Credits](#credits)
8. [Copyright](#copyright)

---

## Features

- **Dictionary:** browse every token A to Z or by number, with a letter index on the side
- **Search:** find any word, with exact matches shown first
- **Entry cards:** tap a word to see its ID, type, raw bytes, and neighboring words
- **Sentence splitter:** type anything and see how the model breaks it into tokens
- **Readable labels:** byte fragments, invisible characters, and special tokens get plain-English names
- **Word of the day** and a **random word** button
- **Guessing game:** "How many tokens?" with a saved high score
- **Fun facts:** odd entries and a chart of what the vocabulary is made of
- **Saved words** and **share** buttons for any entry
- Works on phones, supports light and dark mode, and is screen reader friendly

---

## Run it on your computer

The site uses JavaScript modules, so it needs a small local server. Opening `index.html` by double-clicking won't load the data.

From the project folder, run either:

```
npx serve .
```

```
python3 -m http.server
```

Then open the address it prints (usually `http://localhost:3000` or `http://localhost:8000`).

---

## Project layout

```
token-tome/
├── index.html             Page structure only (no styling or logic)
├── css/
│   └── styles.css         All styling, in numbered sections (see the list at the top)
├── js/
│   ├── main.js            Starts the site: loads data, turns on each feature
│   ├── config.js          Settings in one place (page size, labels, storage keys)
│   ├── utils.js           Shared helpers (safe HTML, copy, storage, debounce)
│   ├── vocab.js           Friendly helpers around the token data
│   ├── tabs.js            Dictionary / Play / Fun facts / Saved tabs
│   ├── dictionary.js      Word list, sorting, search, paging, letter index
│   ├── entry-card.js      The big word card, share, random word
│   ├── word-of-day.js     Daily word
│   ├── splitter.js        "See how the model reads it" box
│   ├── game.js            "How many tokens?" game
│   ├── facts.js           Fun facts and the chart
│   └── saved.js           Saved words
├── data/
│   ├── vocab.json         Every token (generated, don't edit by hand)
│   ├── game-words.txt     Game words, one per line (edit this)
│   ├── game-words.json    Generated from game-words.txt
│   └── fun-facts.json     Fun fact cards (edit this)
├── scripts/
│   ├── build-vocab.mjs         Rebuilds vocab.json from the tokenizer
│   ├── label-invisible.py      Names invisible tokens (step 2 of the rebuild)
│   ├── build-game-words.mjs    Rebuilds game-words.json
│   └── bundle-single-file.mjs  Builds a one-file version in dist/
├── netlify.toml           Netlify hosting settings
└── package.json           Build commands and tool versions
```

Every file starts with a comment explaining what it does, and the main functions inside are commented too.

---

## How the code fits together

1. `index.html` loads `css/styles.css` and `js/main.js`.
2. `main.js` loads the three data files, then turns on each feature in order.
3. Every feature gets the same shared `app` object. Features add functions to it that other features need:

| Function | Added by | Used by |
|---|---|---|
| `app.vocab` | `main.js` | everything |
| `app.setTab(name)` | `tabs.js` | entry card |
| `app.isSaved(id)`, `app.toggleSaved(id)` | `saved.js` | entry card |
| `app.openEntry(id)`, `app.openRandom()` | `entry-card.js` | list, game, facts, saved, splitter, word of the day |
| `app.showInList(id)` | `dictionary.js` | entry card |

**Tabs:** each part of the page in `index.html` has a `data-view="..."` tag (`dictionary`, `play`, `facts`, or `saved`). Switching tabs changes `data-active-view` on the `<body>`, and the CSS hides everything not in the active tab.

**Word links:** every word has its own link, the page address plus `#` and the token number, like `#1820`. Opening that link opens the word.

---

## The data files

**`data/vocab.json`** is built by the scripts, never by hand. It holds:

| Field | What it is |
|---|---|
| `words` | Display text for each token number (or a plain-English label) |
| `kinds` | One letter per token for its type, like `W` word or `b` byte fragment. The full list is in `js/config.js` |
| `sections` | Which section each token is filed under (A to Z, symbols, other scripts, bytes, special) |
| `alphaOrder` | Every token number, sorted A to Z |
| `glosses` | Extra info for labeled tokens: the technical form and a short description |

**`data/game-words.txt`** and **`data/fun-facts.json`** are meant to be edited directly.

---

## Common updates

| I want to... | Do this |
|---|---|
| Change colors | Edit the variables at the top of `css/styles.css` |
| Change how many words show per page | Edit `WORDS_PER_PAGE` in `js/config.js` |
| Change a type's name or description | Edit `KIND_LABELS` or `KIND_DESCRIPTIONS` in `js/config.js` |
| Add or remove game words | Edit `data/game-words.txt`, then run `npm install` and `npm run build:game` |
| Add a fun fact | Add an entry to `data/fun-facts.json` (`id` is the token number) |
| Update the "Last updated" date | Edit the footer near the bottom of `index.html` |
| Rebuild the token data | Run `npm install`, then `npm run build:data` (needs Node and Python 3) |
| Support a new model | Swap the tokenizer in `scripts/build-vocab.mjs`, rebuild, and update the text in `index.html` |
| Make a single-file version | Run `npm run build:single`. The result is `dist/token-tome.html` |

---

## Credits

Built with Meta Llama 3. Token data comes from Meta's Llama 3 tokenizer, used under the [Llama 3 Community License](https://www.llama.com/llama3/license/). This project is not affiliated with Meta.

The sentence splitter uses [llama3-tokenizer-js](https://github.com/belladoreai/llama3-tokenizer-js) (MIT license), loaded the first time someone types in the box.

---

## Copyright

© 2026 [Skyler Hall](https://github.com/skyler-hall). All rights reserved.

The code and design of this project may not be copied, modified, or reused without permission. Token data is from Meta's Llama 3 tokenizer and is covered by its own license.
