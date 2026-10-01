// Community library: renders /decks/index.json (built by scripts/build-library.mjs).
// Used on /library (full list with search and filters) and on the home page
// (a short preview). Everything is built with textContent, never innerHTML.
(function () {
  'use strict';

  var TYPE_LABELS = { text: 'text card', image: 'picture card', audio: 'audio card', youtube: 'video card' };
  var countryNames = null;
  try {
    countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch (e) {
    countryNames = null;
  }
  var countryName = function (code) {
    try {
      return (countryNames && countryNames.of(code)) || code;
    } catch (e) {
      return code;
    }
  };
  var fold = function (s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function sizeLabel(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function openHref(deck) {
    return '/app/?import=' + encodeURIComponent(deck.file);
  }

  function typeSummary(types) {
    return Object.keys(types)
      .map(function (t) {
        return plural(types[t], TYPE_LABELS[t] || t);
      })
      .join(' · ');
  }

  // Full card for the library page
  function deckCard(deck) {
    var card = el('article', 'deck-card');

    var head = el('div', 'deck-card-head');
    head.appendChild(el('h3', 'deck-card-name', deck.name));
    if (deck.language) head.appendChild(el('span', 'tag', deck.language));
    card.appendChild(head);

    if (deck.countries && deck.countries.length) {
      card.appendChild(
        el('p', 'deck-card-countries', 'Spoken in ' + deck.countries.slice(0, 5).map(countryName).join(', ') + (deck.countries.length > 5 ? ' and more' : ''))
      );
    }
    if (deck.description) card.appendChild(el('p', 'deck-card-desc', deck.description));

    if (deck.sample && deck.sample.length) {
      var sample = el('ul', 'deck-sample');
      sample.setAttribute('aria-label', 'Example cards');
      deck.sample.forEach(function (s) {
        var li = el('li');
        li.appendChild(el('span', 'deck-sample-front', s.front));
        li.appendChild(el('span', 'deck-sample-back', s.back));
        sample.appendChild(li);
      });
      card.appendChild(sample);
    }

    var meta = el('p', 'deck-card-meta', typeSummary(deck.types) + ' · ' + sizeLabel(deck.size));
    card.appendChild(meta);

    var credit = el('p', 'deck-card-credit');
    credit.appendChild(document.createTextNode('Shared by '));
    if (deck.authorUrl && /^https:\/\//.test(deck.authorUrl)) {
      var a = el('a', null, deck.author);
      a.href = deck.authorUrl;
      a.rel = 'noopener';
      credit.appendChild(a);
    } else {
      credit.appendChild(el('strong', null, deck.author));
    }
    credit.appendChild(document.createTextNode(' · ' + deck.licence));
    card.appendChild(credit);

    var actions = el('div', 'deck-card-actions');
    var open = el('a', 'btn btn-small', 'Open in FLUXA');
    open.href = openHref(deck);
    var dl = el('a', 'btn btn-small btn-ghost', 'Download');
    dl.href = deck.file;
    dl.setAttribute('download', deck.slug + '.fluxa');
    actions.appendChild(open);
    actions.appendChild(dl);
    card.appendChild(actions);
    return card;
  }

  // Compact row for the home page preview
  function deckRow(deck) {
    var a = el('a', 'library-row');
    a.href = openHref(deck);
    var text = el('span', 'library-row-text');
    text.appendChild(el('strong', null, deck.name));
    text.appendChild(el('span', null, (deck.language ? deck.language + ' · ' : '') + plural(deck.cardCount, 'card')));
    a.appendChild(text);
    a.appendChild(el('span', 'library-row-open', 'Open →'));
    return a;
  }

  function load() {
    return fetch('/decks/index.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ---- Home page preview -------------------------------------------------
  var preview = document.getElementById('library-preview-list');
  if (preview) {
    load()
      .then(function (data) {
        var decks = data.decks || [];
        preview.textContent = '';
        if (!decks.length) {
          preview.appendChild(el('p', 'library-preview-note', 'No decks yet. Be the first to share one.'));
          return;
        }
        decks.slice(0, 4).forEach(function (d) {
          preview.appendChild(deckRow(d));
        });
        var count = document.getElementById('library-preview-count');
        if (count) count.textContent = plural(decks.length, 'deck') + ' so far';
      })
      .catch(function () {
        preview.textContent = '';
        preview.appendChild(el('p', 'library-preview-note', 'The library couldn’t load right now.'));
      });
  }

  // ---- Library page --------------------------------------------------------
  var grid = document.getElementById('library-grid');
  if (!grid) return;
  var search = document.getElementById('library-search');
  var filters = document.getElementById('library-languages');
  var countEl = document.getElementById('library-count');
  var empty = document.getElementById('library-empty');
  var all = [];
  var language = null;

  var params = new URLSearchParams(location.search);
  if (params.get('q')) search.value = params.get('q');

  function haystack(d) {
    return fold(
      [d.name, d.language, d.description, d.author, (d.tags || []).join(' '), (d.countries || []).map(countryName).join(' ')].join(' | ')
    );
  }

  function render() {
    var q = fold(search.value.trim());
    var shown = all.filter(function (d) {
      return (!language || d.language === language) && (!q || d._search.indexOf(q) !== -1);
    });
    grid.textContent = '';
    shown.forEach(function (d) {
      grid.appendChild(deckCard(d));
    });
    countEl.textContent =
      plural(shown.length, 'deck') + (shown.length !== all.length ? ' of ' + all.length : '') + (language ? ' in ' + language : '');
    empty.hidden = shown.length > 0;
  }

  function renderFilters() {
    var langs = {};
    all.forEach(function (d) {
      if (d.language) langs[d.language] = (langs[d.language] || 0) + 1;
    });
    filters.textContent = '';
    var names = Object.keys(langs).sort();
    if (names.length < 2) return; // nothing to filter yet
    [null].concat(names).forEach(function (name) {
      var b = el('button', 'chip' + (name === language ? ' chip-on' : ''), name ? name + ' (' + langs[name] + ')' : 'All languages');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(name === language));
      b.addEventListener('click', function () {
        language = name;
        renderFilters();
        render();
      });
      filters.appendChild(b);
    });
  }

  search.addEventListener('input', render);

  load()
    .then(function (data) {
      all = (data.decks || []).map(function (d) {
        d._search = haystack(d);
        return d;
      });
      renderFilters();
      render();
    })
    .catch(function () {
      countEl.textContent = 'The library couldn’t load. Check your connection and refresh.';
    });
})();
