/* ==========================================================================
   modes.js — the machine the three profiles run on.

   One page, three presentation layers. This file owns:

     1  preferences (shared by every mode, namespaced, survives switching)
     2  which mode the URL is asking for
     3  the boot sequence and the profile chooser
     4  lazy loading: a mode's CSS and JS arrive when it is picked
     5  the Switch Profile control every mode plants somewhere
     6  history, so back / forward / refresh do the obvious thing

   Modes register themselves as { start(root), stop() }. Nothing about a mode
   is loaded, parsed or run until somebody logs into it.
   ========================================================================== */

(function () {
  'use strict';

  const MODES = {
    brief: {
      name: 'The Brief',
      title: 'Tabish Navaid · software engineering and product',
      icon: 'the-brief',
      blurb: 'the quickest route through my work',
      global: 'Brief',
      css: ['css/brief.css'],
      js: ['js/brief.js'],
      root: 'briefRoot',
      skip: '#briefMain'
    },
    meadow: {
      name: 'Meadow Desktop',
      title: 'welcome to tabish’s meadow',
      icon: 'meadow-desktop',
      blurb: 'the original, with windows and one supervisory cat',
      global: 'MeadowDesktop',
      css: [],
      js: ['js/soundscapes.js', 'js/bus-ride.js', 'js/main.js'],
      root: 'meadowRoot',
      skip: '#deskWindow'
    },
    'field-trip': {
      name: 'Field Trip',
      title: 'field-trip.exe · tabish town',
      icon: 'field-trip',
      blurb: 'walk around, poke at things, find out what I built',
      global: 'FieldTrip',
      css: ['css/field-trip.css'],
      js: [
        'js/soundscapes.js',
        'js/field-trip/atlas.js',
        'js/field-trip/world.js',
        'js/field-trip/interiors.js',
        'js/field-trip/panels.js',
        'js/field-trip/game.js'
      ],
      root: 'fieldTripRoot',
      skip: '#gameApp'
    }
  };

  const ORDER = ['brief', 'meadow', 'field-trip'];
  /* Lazy mode files change often while the three experiences are being tuned.
     A version on those URLs prevents an older cached game.js from loading
     beside a newer modes.js and then failing to register its profile. */
  const ASSET_VERSION = '20260913-voice2';
  const BOOT_MS = 780;
  /* matches --curtain in css/styles.css and CURTAIN in the game */
  const CURTAIN_MS = 200;

  /* 1 -------------------------------------------------------- preferences */
  /* One store, namespaced keys. Switching profiles never clears any of it. */

  const Prefs = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        /* private mode. not fatal. */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        /* ignore */
      }
    }
  };

  const LAST_MODE = 'portfolio.mode.v1';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* 2 ------------------------------------------------------------ the URL */

  function modeFromUrl() {
    const asked = new URLSearchParams(location.search).get('mode');
    return MODES[asked] ? asked : null;
  }

  /* 4 ------------------------------------------------------- lazy loading */

  const loaded = {};

  function assetUrl(url) {
    const next = new URL(url, location.href);
    next.searchParams.set('v', ASSET_VERSION);
    return next.href;
  }

  function loadOne(url, kind) {
    if (loaded[url]) return loaded[url];
    loaded[url] = new Promise((resolve, reject) => {
      let el;
      if (kind === 'css') {
        el = document.createElement('link');
        el.rel = 'stylesheet';
        el.href = assetUrl(url);
      } else {
        el = document.createElement('script');
        el.src = assetUrl(url);
      }
      el.addEventListener('load', () => resolve(url));
      el.addEventListener('error', () => {
        delete loaded[url];
        el.remove();
        reject(new Error('could not load ' + url));
      });
      document.head.appendChild(el);
    });
    return loaded[url];
  }

  async function loadMode(id) {
    const spec = MODES[id];
    await Promise.all(spec.css.map((u) => loadOne(u, 'css')));
    /* scripts in order: the game's atlas and world are read by game.js */
    for (const url of spec.js) await loadOne(url, 'js');
    return window[spec.global];
  }

  /* 5 ------------------------------------------------- switch profile bit */

  function switchControl(extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'switch-profile' + (extraClass ? ' ' + extraClass : '');
    btn.innerHTML =
      '<span class="switch-profile__face" aria-hidden="true">' +
      '<svg viewBox="0 0 20 20" focusable="false">' +
      '<circle cx="10" cy="7" r="3.2"/><path d="M3.8 17c.7-3.4 3.2-5.2 6.2-5.2s5.5 1.8 6.2 5.2"/>' +
      '</svg></span>' +
      '<span class="switch-profile__label">switch profile</span>';
    btn.addEventListener('click', () => toChooser());
    return btn;
  }

  /* 3 + 6 --------------------------------------- boot, chooser, and state */

  const boot = document.getElementById('boot');
  const chooser = document.getElementById('chooser');
  const startup = document.getElementById('bootStartup');
  const chooserList = document.getElementById('chooserList');
  /* on a phone the arrow keys are not the news */
  const chooserHint = document.getElementById('chooserHint');
  if (chooserHint && window.matchMedia('(pointer: coarse)').matches) {
    chooserHint.textContent = 'tap a profile to log in.';
  }
  const skipLink = document.querySelector('.skip-link');
  const root = document.documentElement;

  let active = null; // { id, module }
  let starting = null;

  function setChrome(id) {
    root.dataset.mode = id || 'chooser';
    document.title = id ? MODES[id].title : 'Tabish Navaid | Software Engineering & Product Portfolio';
    if (skipLink) skipLink.href = id ? MODES[id].skip : '#chooserTitle';
  }

  async function stopActive() {
    if (!active) return;
    try {
      if (active.module && active.module.stop) active.module.stop();
    } catch (err) {
      /* a mode that fails to stop must not block the next one */
    }
    const host = document.getElementById(MODES[active.id].root);
    if (host) host.hidden = true;
    active = null;
  }

  /* A half-loaded profile is not a useful recovery screen. Keep the reason
     in developer tools, then hand the visitor to the site's real 404 page. */
  function failed(id, err) {
    const detail = id + ' could not start' + (err && err.message ? ': ' + err.message : '');
    if (window.PortfolioFail) window.PortfolioFail(detail);
    else location.replace('/404.html');
  }

  async function enter(id, opts) {
    const options = opts || {};
    if (!MODES[id]) return;
    if (active && active.id === id) return;

    /* Loading a mode is asynchronous. The token prevents a slow earlier load
       from mounting after the visitor has already picked another profile. */
    const token = {};
    starting = token;
    const from = active ? active.id : null;
    boot.hidden = true;
    await stopActive();
    setChrome(id);
    Prefs.set(LAST_MODE, id);

    let module;
    try {
      module = await loadMode(id);
      if (!module || !module.start) throw new Error(MODES[id].name + ' did not register');
    } catch (err) {
      if (starting !== token) return;
      failed(id, err);
      return;
    }
    if (starting !== token) return; /* somebody switched while we were loading */

    const host = document.getElementById(MODES[id].root);
    host.hidden = false;
    active = { id: id, module: module };
    try {
      const result = module.start(host, { focus: options.focus === true });
      if (result && typeof result.catch === 'function') result.catch((err) => failed(id, err));
    } catch (err) {
      failed(id, err);
      return;
    }

    /* Arriving somewhere gets the same length as a door in Field Trip. Only
       when you came from somewhere: a cold load should paint immediately. */
    if (from && !reduceMotion.matches && host.animate) {
      host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CURTAIN_MS, easing: 'ease' });
    }
  }

  function showChooser(opts) {
    const options = opts || {};
    starting = {};
    stopActive();
    setChrome(null);
    boot.hidden = false;

    /* The last mode is only a focus hint. The chooser never opens a profile
       until a visitor selects it. */
    const last = Prefs.get(LAST_MODE, 'meadow');
    const buttons = Array.from(chooserList.querySelectorAll('.profile'));
    buttons.forEach((b) => b.classList.toggle('is-last', b.dataset.mode === last));

    const reveal = () => {
      startup.hidden = true;
      chooser.hidden = false;
      boot.classList.add('is-ready');
      if (options.focus !== false) {
        const target = buttons.find((b) => b.dataset.mode === last) || buttons[0];
        if (target) target.focus({ preventScroll: true });
      }
    };

    if (options.instant || reduceMotion.matches) {
      reveal();
      return;
    }
    startup.hidden = false;
    chooser.hidden = true;
    boot.classList.remove('is-ready');
    setTimeout(reveal, BOOT_MS);
  }

  function toChooser() {
    const url = location.pathname;
    if (location.search || location.hash) history.pushState({ chooser: true }, '', url);
    showChooser({ instant: false });
  }

  function go(id) {
    const url = location.pathname + '?mode=' + encodeURIComponent(id);
    history.pushState({ mode: id }, '', url);
    enter(id, { focus: true });
  }

  /* The meadow bus can load the town while its road game is running. Apart
     from making arrival instant, this catches a failed asset before the mode
     switch and leaves loadOne able to retry it. */
  function prepare(id) {
    if (!MODES[id]) return Promise.reject(new Error('unknown profile'));
    return loadMode(id);
  }

  function applyUrl(opts) {
    const options = opts || {};
    const id = modeFromUrl();
    if (id) enter(id, options);
    else showChooser(options);
  }

  /* --- chooser wiring --- */

  chooserList.addEventListener('click', (e) => {
    const btn = e.target.closest('.profile');
    if (btn) go(btn.dataset.mode);
  });

  chooserList.addEventListener('keydown', (e) => {
    const buttons = Array.from(chooserList.querySelectorAll('.profile'));
    const i = buttons.indexOf(document.activeElement.closest('.profile'));
    if (i < 0) return;
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % buttons.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next < 0) return;
    e.preventDefault();
    buttons[next].focus();
  });

  /* Back and forward should feel instant; only a fresh arrival boots up. */
  window.addEventListener('popstate', () => applyUrl({ focus: false, instant: true }));

  /* Anchors anywhere in the app can ask for a mode. */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="?mode="]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || link.target === '_blank') return;
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    const id = new URLSearchParams(url.search).get('mode');
    if (!MODES[id]) return;
    e.preventDefault();
    go(id);
  });

  window.Prefs = Prefs;
  window.Modes = {
    ids: ORDER,
    spec: MODES,
    /* Field Trip's atlases are ordinary image URLs, so a deploy that changes
       one would otherwise hand a cached PNG to a fresh frame table and draw
       the wrong rectangle out of it. Same stamp as the scripts. */
    asset: assetUrl,
    go: go,
    prepare: prepare,
    toChooser: toChooser,
    switchControl: switchControl,
    current: () => (active ? active.id : null),
    reduceMotion: reduceMotion
  };

  applyUrl({ focus: true });
})();
