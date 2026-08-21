/* ==========================================================================
   main.js — Meadow Desktop

   A desktop in a meadow. The desktop is the site: one screen, no page scroll,
   everything else in windows launched from the five icons.

     1  helpers and state
     2  the scene: time of day, the draggable sun, sky decoration
     3  audio (never constructed until somebody opts in)
     4  window chrome: open, close, drag, maximize, focus
     5  window content: about, links, work, notes, contact
     6  project detail (a child window)
     7  routing (hashes name the open window, no separate pages)
     8  the cat, the peeking doodle, the bus to Field Trip
     9  start / stop

   Content comes from js/content.js and is treated as trusted markup: it is a
   file in this repository, not user input. Anything from the URL is looked up
   against a known id before it is used.
   ========================================================================== */

window.MeadowDesktop = (function () {
  'use strict';

  const C = window.PORTFOLIO;

  /* 1 --------------------------------------------------- helpers + state */

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, v) => {
    const t = clamp((v - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };

  const esc = (v) =>
    String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* Deterministic decoration: the sky is the same on every load. */
  const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const store = window.Prefs;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isNarrow = () => window.innerWidth <= 720;

  const KEYS = {
    time: 'meadow.time.v2',
    lens: 'meadow.lens.v1',
    sound: 'meadow.sound.v1'
  };

  const WINDOWS = ['about', 'links', 'work', 'notes', 'contact'];
  const LENS_IDS = ['engineering', 'product'];

  const state = {
    lens: 'engineering',
    time: 0,
    sound: false,
    music: false,
    route: { type: 'home' }
  };

  const otherLens = (id) => (id === 'product' ? 'engineering' : 'product');

  let running = false;
  let signal = null; // AbortController signal for every listener start() adds
  let controller = null;
  let host = null;

  /* Elements, looked up on start so the module can be loaded before the DOM
     section is revealed. */
  let root, celestial, themeToggle, themeToggleImg, peekImg, peekSource;
  let panel, detail, zoomBtn, catBtn, catImg, catSource, catBubble;

  /* 2 --------------------------------------------------------------- scene */

  /* Evenly spaced stops from noon to midnight. The violet stop is not
     decoration: peach mixed straight into navy passes through brown. */
  const PHASE = {
    skyTop: ['#cbeeff', '#ffd8b5', '#4b3f6b', '#111827'],
    skyBot: ['#f1faf4', '#f7c7ab', '#7d5f7e', '#243b5a'],
    grassFar: ['#b8cb8a', '#a4b978', '#4d5568', '#223850'],
    grassNear: ['#9fbd76', '#879f63', '#3c4453', '#182a3f']
  };
  const UI = {
    winBg: ['#fdfaf2', '#17233a'],
    winHeader: ['#2d2c29', '#101827'],
    winText: ['#2d2c29', '#f0f4fb'],
    winBorder: ['#2d2c29', '#eaf6ff'],
    accent: ['#d96e34', '#aef0ff'],
    accentInk: ['#a8501f', '#bdeeff']
  };

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const mix = (from, to, t) => {
    const a = hexToRgb(from);
    const b = hexToRgb(to);
    return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
  };
  const phase = (stops, p) => {
    const span = 1 / (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(clamp(p) / span));
    return mix(stops[i], stops[i + 1], (clamp(p) - i * span) / span);
  };

  /* The sun travels an arc across the top of the sky, clear of the window. */
  function arcAt(p) {
    const narrow = isNarrow();
    const x0 = narrow ? 0.8 : 0.88;
    const x1 = narrow ? 0.52 : 0.4;
    return {
      x: lerp(x0, x1, p) * window.innerWidth,
      y: (0.055 + 0.075 * Math.sin(Math.PI * p)) * window.innerHeight
    };
  }

  let lampOn = false;

  /* Halfway between cream and navy there is no ink colour that clears 4.5:1
     against the paper, so the windows have two states and cross between them
     rather than resting in the middle. The hysteresis stops a slow drag from
     flickering. */
  function lampState(rawNight) {
    lampOn = rawNight >= (lampOn ? 0.47 : 0.53);
    return lampOn ? 0.92 : 0;
  }

  function applyTime(p, opts) {
    const options = opts || {};
    state.time = clamp(p);
    const t = state.time;

    const uiNight = lampState(smoothstep(0.55, 1, t));
    const moonFade = smoothstep(0.36, 1, t);
    const sunFade = t < 0.5 ? 1 - t * 0.22 : clamp(1 - (t - 0.5) / 0.34);
    const set = (name, value) => root.style.setProperty(name, value);

    set('--theme-progress', t.toFixed(3));
    set('--dusk-opacity', clamp(1 - Math.abs(t - 0.34) / 0.3).toFixed(3));
    set('--night-opacity', smoothstep(0.45, 1, t).toFixed(3));
    set('--star-opacity', (smoothstep(0.3, 1, t) * 0.95).toFixed(3));
    set('--cloud-opacity', (0.72 * (1 - smoothstep(0.28, 0.9, t))).toFixed(3));
    set('--firefly-opacity', smoothstep(0.52, 1, t).toFixed(3));
    set('--sun-opacity', sunFade.toFixed(3));
    set('--moon-opacity', moonFade.toFixed(3));
    set('--sun-scale', (1 - t * 0.14).toFixed(3));
    set('--moon-scale', (0.82 + moonFade * 0.2).toFixed(3));

    const lowness = Math.sin(Math.PI * t);
    set('--shadow-x', `${(10 + lowness * 4).toFixed(1)}px`);
    set('--shadow-y', `${(13 + lowness * 5).toFixed(1)}px`);

    set('--sky-top', phase(PHASE.skyTop, t));
    set('--sky-bot', phase(PHASE.skyBot, t));
    set('--grass-far', phase(PHASE.grassFar, t));
    set('--grass-near', phase(PHASE.grassNear, t));
    set('--win-bg', mix(UI.winBg[0], UI.winBg[1], uiNight));
    set('--win-header', mix(UI.winHeader[0], UI.winHeader[1], uiNight));
    set('--win-text', mix(UI.winText[0], UI.winText[1], uiNight));
    set('--win-border', mix(UI.winBorder[0], UI.winBorder[1], uiNight));
    set('--accent', mix(UI.accent[0], UI.accent[1], uiNight));
    set('--accent-ink', mix(UI.accentInk[0], UI.accentInk[1], uiNight));

    const pos = arcAt(t);
    set('--celestial-x', `${Math.round(pos.x)}px`);
    set('--celestial-y', `${Math.round(pos.y)}px`);

    root.classList.toggle('dark', uiNight > 0);

    celestial.setAttribute('aria-valuenow', String(Math.round(t * 100)));
    celestial.setAttribute('aria-valuetext', t < 0.3 ? 'daytime' : t < 0.7 ? 'dusk' : 'night');

    const iconSrc = `assets/images/opt/${t >= 0.7 ? 'light-mode' : 'dark-mode'}.png`;
    if (!themeToggleImg.src.endsWith(iconSrc)) themeToggleImg.src = iconSrc;
    themeToggle.setAttribute('aria-label', t >= 0.7 ? 'Switch the meadow back to daytime' : 'Switch the meadow to night');

    const peekName = t >= 0.75 ? 'peeking-sleeping-profile' : 'peeking-profile';
    if (!peekImg.src.endsWith(`${peekName}.png`)) {
      peekImg.src = `assets/images/opt/${peekName}.png`;
      peekSource.srcset = `assets/images/opt/${peekName}.webp`;
    }

    $('#constellation').classList.toggle('is-found', t >= 0.72);
    updateCatArt();

    if (options.persist !== false) store.set(KEYS.time, Number(t.toFixed(3)));
  }

  let timeFrame = null;
  function animateTime(target, duration) {
    if (timeFrame) cancelAnimationFrame(timeFrame);
    if (reduceMotion.matches) {
      applyTime(target);
      return;
    }
    const from = state.time;
    const to = clamp(target);
    const started = performance.now();
    const ms = duration || 620;
    const step = (now) => {
      const k = clamp((now - started) / ms);
      applyTime(lerp(from, to, 1 - Math.pow(1 - k, 3)), { persist: k === 1 });
      if (k < 1) timeFrame = requestAnimationFrame(step);
    };
    timeFrame = requestAnimationFrame(step);
  }

  function initCelestial() {
    let dragging = false;
    const on = (el, type, fn, opts) =>
      el.addEventListener(type, fn, Object.assign({ signal: signal }, opts || {}));

    const progressFromX = (clientX) => {
      const narrow = isNarrow();
      const x0 = narrow ? 0.8 : 0.88;
      const x1 = narrow ? 0.52 : 0.4;
      return clamp((x0 - clientX / window.innerWidth) / (x0 - x1));
    };

    on(celestial, 'pointerdown', (e) => {
      dragging = true;
      celestial.classList.add('is-dragging');
      celestial.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    on(celestial, 'pointermove', (e) => {
      if (dragging) applyTime(progressFromX(e.clientX), { persist: false });
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      celestial.classList.remove('is-dragging');
      if (celestial.hasPointerCapture(e.pointerId)) celestial.releasePointerCapture(e.pointerId);
      applyTime(state.time);
    };
    on(celestial, 'pointerup', endDrag);
    on(celestial, 'pointercancel', endDrag);

    on(celestial, 'keydown', (e) => {
      const step = e.shiftKey ? 0.2 : 0.08;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); applyTime(state.time - step); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); applyTime(state.time + step); }
      else if (e.key === 'Home') { e.preventDefault(); animateTime(0); }
      else if (e.key === 'End') { e.preventDefault(); animateTime(1); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        animateTime(state.time >= 0.6 ? 0 : 1);
        sfx('theme');
      }
    });

    on(themeToggle, 'click', () => {
      animateTime(state.time >= 0.6 ? 0 : 1);
      sfx('theme');
    });

    let resizeFrame = null;
    on(window, 'resize', () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        applyTime(state.time, { persist: false });
        busPlace();
      });
    });
  }

  function buildSky() {
    const rand = seeded(20260804);
    let starHtml = '';
    for (let i = 0; i < 58; i += 1) {
      const size = (rand() * 2.4 + 1).toFixed(2);
      starHtml += `<span class="star" style="width:${size}px;height:${size}px;left:${(rand() * 100).toFixed(2)}%;top:${(
        rand() * 52
      ).toFixed(2)}%;animation-delay:${(rand() * 3).toFixed(2)}s"></span>`;
    }
    $('#stars').innerHTML = starHtml;

    let flyHtml = '';
    for (let i = 0; i < 6; i += 1) {
      flyHtml += `<span class="firefly" style="left:${(8 + rand() * 84).toFixed(1)}%;top:${(58 + rand() * 16).toFixed(
        1
      )}%;animation-delay:${(rand() * 6).toFixed(2)}s"></span>`;
    }
    $('#fireflies').innerHTML = flyHtml;

    const pts = [
      [22, 74], [30, 48], [44, 60], [66, 56], [86, 44], [92, 70],
      [120, 78], [140, 62], [150, 84], [128, 104], [78, 100], [40, 96]
    ];
    let art = pts
      .map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`;
      })
      .join('');
    art += pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i % 3 === 0 ? 1.9 : 1.3}"/>`).join('');
    art += '<text x="18" y="126">FELIS SCRIBA</text>';
    $('#constellationArt').innerHTML = art;
  }

  /* 3 --------------------------------------------------------------- audio */
  /* Nothing here exists until somebody turns sound on. No autoplay path. */

  let audio = null;
  let ctx = null;

  function ensureAudio() {
    if (audio) return audio;
    const click = new Audio('assets/sounds/click.mp3');
    click.preload = 'auto';
    const music = new Audio('assets/sounds/background-music.mp3');
    music.preload = 'none';
    music.loop = true;
    music.volume = 0;
    audio = { click, music };
    return audio;
  }

  function sfx(kind) {
    if (!state.sound) return;
    const a = ensureAudio();
    if (kind === 'click') {
      a.click.currentTime = 0;
      a.click.play().catch(() => {});
      return;
    }
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const tone = (type, f0, f1, gain, dur, delay) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(f0, now + delay);
        osc.frequency.exponentialRampToValueAtTime(f1, now + delay + dur);
        g.gain.setValueAtTime(gain, now + delay);
        g.gain.exponentialRampToValueAtTime(0.008, now + delay + dur);
        osc.start(now + delay);
        osc.stop(now + delay + dur);
      };
      if (kind === 'open') tone('sine', 260, 520, 0.075, 0.14, 0);
      else if (kind === 'close') tone('sine', 440, 220, 0.07, 0.12, 0);
      else if (kind === 'theme') { tone('sine', 550, 1100, 0.055, 0.2, 0); tone('sine', 825, 1650, 0.035, 0.16, 0.04); }
    } catch (err) {
      /* no web audio here; the site keeps working */
    }
  }

  function initSound() {
    const btn = $('#soundToggle');
    const img = $('#soundToggleImg');
    const paint = () => {
      img.src = `assets/images/opt/sound-${state.sound ? 'on' : 'off'}.png`;
      btn.setAttribute('aria-pressed', String(state.sound));
      btn.setAttribute('aria-label', `Sound effects and music: currently ${state.sound ? 'on' : 'off'}`);
    };
    paint();
    btn.addEventListener('click', () => {
      state.sound = !state.sound;
      store.set(KEYS.sound, state.sound);
      paint();
      if (state.sound) { ensureAudio(); sfx('click'); }
      else stopMusic('meadow muted');
    }, { signal: signal });
  }

  /* 4 -------------------------------------------------------- window chrome */

  let suppressRoute = false;

  function openDialog(dialog) {
    if (dialog.open) return;
    dialog.classList.remove('is-placed');
    dialog.style.left = '';
    dialog.style.top = '';
    dialog.showModal();
    const body = dialog.querySelector('.win__body');
    body.scrollTop = 0;
    body.focus({ preventScroll: true });
    sfx('open');
  }

  function closeDialog(dialog) {
    if (!dialog.open) return;
    suppressRoute = true;
    dialog.close();
    suppressRoute = false;
  }

  /* Every dismissal goes through here rather than through the dialog's
     `close` event: some engines do not fire that event for a scripted close,
     which left the address bar pointing at a window nobody could see. */
  function requestClose(dialog) {
    if (!dialog.open) return;
    sfx('close');
    closeDialog(dialog);
    if (dialog === detail && panel.open) {
      setRoute(`#/${currentPanel}`, true);
      /* back to the card you opened, not to the top of the list. the lens
         switch rebuilds the panel, so the button may no longer exist. */
      if (detailOpener && document.contains(detailOpener)) detailOpener.focus({ preventScroll: true });
      else panel.querySelector('.win__body').focus({ preventScroll: true });
      detailOpener = null;
    } else {
      goHome();
    }
  }

  function initWindows() {
    [panel, detail].forEach((dialog) => {
      dialog.addEventListener('close', () => {
        if (!suppressRoute) goHome();
      }, { signal: signal });
      dialog.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        requestClose(dialog);
      }, { signal: signal });
      dialog.addEventListener('click', (e) => {
        if (e.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        const inside =
          e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
        if (!inside) requestClose(dialog);
      }, { signal: signal });
      $('[data-close]', dialog).addEventListener('click', () => requestClose(dialog), { signal: signal });
      makeDraggable(dialog);
    });

    zoomBtn.addEventListener('click', () => {
      const zoomed = panel.classList.toggle('is-zoomed');
      panel.classList.remove('is-placed');
      panel.style.left = '';
      panel.style.top = '';
      zoomBtn.setAttribute('aria-pressed', String(zoomed));
      zoomBtn.setAttribute('aria-label', zoomed ? 'Restore window size' : 'Maximize window');
      zoomBtn.textContent = zoomed ? '[ ▫ ]' : '[ □ ]';
    }, { signal: signal });
  }

  /* Desktop windows stay draggable, because that is the point of a desktop.
     On a phone they are full-screen sheets and there is nowhere to drag to. */
  function makeDraggable(dialog) {
    const bar = $('.win__bar', dialog);
    let dragging = false;
    let offX = 0;
    let offY = 0;

    bar.addEventListener('pointerdown', (e) => {
      if (isNarrow() || e.target.closest('button') || dialog.classList.contains('is-zoomed')) return;
      const box = dialog.getBoundingClientRect();
      dragging = true;
      offX = e.clientX - box.left;
      offY = e.clientY - box.top;
      dialog.classList.add('is-placed');
      dialog.style.left = `${box.left}px`;
      dialog.style.top = `${box.top}px`;
      bar.setPointerCapture(e.pointerId);
    }, { signal: signal });
    bar.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dialog.style.left = `${clamp(e.clientX - offX, -dialog.offsetWidth + 140, window.innerWidth - 90)}px`;
      dialog.style.top = `${clamp(e.clientY - offY, 4, window.innerHeight - 60)}px`;
    }, { signal: signal });
    const stop = (e) => {
      if (!dragging) return;
      dragging = false;
      if (bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId);
    };
    bar.addEventListener('pointerup', stop, { signal: signal });
    bar.addEventListener('pointercancel', stop, { signal: signal });
  }

  /* 5 ------------------------------------------------------ window content */

  const linkAttrs = (href) => (href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '');

  function actionLink(link, cls) {
    const external = link.href.startsWith('http');
    return `<a class="btn ${cls || 'btn--small'}" href="${esc(link.href)}"${linkAttrs(link.href)}>${esc(link.label)}${
      external
        ? '<span class="btn__ext" aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span>'
        : ''
    }</a>`;
  }

  function aboutHtml() {
    const a = C.about;
    return `<section class="about-hero">
        <picture>
          <source type="image/webp" srcset="assets/images/opt/about-profile.webp" />
          <img src="assets/images/opt/about-profile.png" width="560" height="560"
            alt="A drawn portrait of Tabish: dark curly hair, round glasses." decoding="async" />
        </picture>
        <div>
          <h3>${esc(a.heading)}</h3>
          <p class="sub">${a.sub}</p>
        </div>
      </section>
      <p>${esc(a.intro)}</p>
      <ul>${a.doing.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      <p class="label">education</p>
      <p>${a.education}</p>
      <p class="label">awards</p>
      <ul>${a.awards.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      <p class="label">currently exploring</p>
      <ul>${a.exploring.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      <p class="label">languages</p>
      <p>${esc(a.languages)}</p>
      <p class="label">other interests</p>
      <ul>${a.interests.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      <p>if you are building something useful and need a careful web person, send me an email at
        <a href="${esc(C.links.email)}">${esc(C.links.emailPlain)}</a>.</p>`;
  }

  function linksHtml() {
    const pill = (href, icon, label, sub) =>
      `<a class="link-pill" href="${esc(href)}"${linkAttrs(href)}>
          <picture>
            <source type="image/webp" srcset="assets/images/opt/${icon}.webp" />
            <img src="assets/images/opt/${icon}.png" width="300" height="300" alt="" decoding="async" />
          </picture>
          <span>${esc(label)}</span>
          <span class="link-sub">${esc(sub)}</span>
        </a>`;
    return `<div class="links-grid">
        ${pill(C.links.email, 'email', 'email', C.links.emailPlain)}
        ${pill(C.links.github, 'github', 'github', 'TabishNavaid')}
        ${pill(C.links.linkedin, 'linked-in', 'linkedin', 'tabish-navaid')}
        ${C.links.resume ? pill(C.links.resume, 'icon-work', 'résumé', 'one page, pdf') : ''}
      </div>`;
  }

  /* --- work --- */

  function shot(project) {
    if (!project.visual) return '';
    return `<figure class="work-card__shot">
        <img src="${esc(project.visual.src)}" width="${project.visual.width}" height="${project.visual.height}"
          alt="${esc(project.visual.alt)}" decoding="async" />
      </figure>`;
  }

  function projectCard(project) {
    const lensPoints =
      state.lens === 'engineering' ? project.engineeringDecisions || [] : project.productDecisions || [];
    const points = (lensPoints.length ? lensPoints : project.built || []).slice(0, 2);
    const links = (project.links || []).map((l) => actionLink(l)).join('');
    return `<article class="work-card${project.featured ? ' work-card--featured' : ''}">
        ${shot(project)}
        <div class="work-card__body">
          <h4 class="work-card__title"><span>${esc(project.title)}</span></h4>
          <p class="work-card__desc">${esc(project.preview)}</p>
          <ul class="work-card__points">${points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          <ul class="chip-row">${(project.stack || []).map((s) => `<li class="chip">${esc(s)}</li>`).join('')}</ul>
          <div class="work-card__actions">
            <button class="btn btn--small" type="button" data-project="${esc(project.id)}">${esc(
              project.openLabel || 'the full write-up'
            )}</button>
            ${links}
          </div>
        </div>
      </article>`;
  }

  function experienceCard(item) {
    return `<article class="work-card">
        <div class="work-card__body">
          <h4 class="work-card__title">
            <span>${esc(item.title)}</span><span class="work-card__date">${esc(item.date)}</span>
          </h4>
          <p class="work-card__desc">${esc(item.preview)}</p>
          <ul class="chip-row">${item.tags.map((t) => `<li class="chip">${esc(t)}</li>`).join('')}</ul>
          <div class="work-card__actions">
            <button class="btn btn--small" type="button" data-experience="${esc(item.id)}">what I did there</button>
          </div>
        </div>
      </article>`;
  }

  function workHtml() {
    const featured = C.projects.filter((p) => p.featured);
    const rest = C.projects.filter((p) => !p.featured);
    return `<div class="work-top">
        <h3>${C.projects.length} projects, ${C.experiences.length} jobs</h3>
        <div class="lens">
          <span id="lensLabel">show</span>
          <div class="lens__switch" role="radiogroup" aria-labelledby="lensLabel">
            <label class="lens__option">
              <input type="radio" name="lens" value="engineering" ${state.lens === 'engineering' ? 'checked' : ''} />
              <span>engineering</span>
            </label>
            <label class="lens__option">
              <input type="radio" name="lens" value="product" ${state.lens === 'product' ? 'checked' : ''} />
              <span>product</span>
            </label>
          </div>
        </div>
      </div>
      <p>Cards lead with a decision rather than a feature list. The switch changes which kind of decision
        comes first.</p>
      <div class="btn-row">
        ${actionLink({ label: 'Email me', href: C.links.email }, 'btn')}
        ${actionLink({ label: 'GitHub', href: C.links.github }, 'btn')}
        ${actionLink({ label: 'LinkedIn', href: C.links.linkedin }, 'btn')}
        ${C.links.resume ? actionLink({ label: 'Résumé', href: C.links.resume }, 'btn') : ''}
      </div>

      <p class="label">featured</p>
      <div class="work-grid">${featured.map(projectCard).join('')}</div>

      <p class="label">experience</p>
      <div class="work-grid">${C.experiences.map(experienceCard).join('')}</div>

      <p class="label">more projects</p>
      <div class="work-grid">${rest.map(projectCard).join('')}</div>

      <p class="label">skills</p>
      <div class="skill-groups">
        ${C.skills
          .map(
            (g) =>
              `<section class="skill-group"><h4>${esc(g.title)}</h4>
                 <ul class="chip-row">${g.items.map((i) => `<li class="chip">${esc(i)}</li>`).join('')}</ul>
               </section>`
          )
          .join('')}
      </div>`;
  }

  /* --- notes --- */

  function notesHtml() {
    const items = C.notes
      .map((n, i) => {
        const body = n.list
          ? `<ul>${n.list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
          : `<p>${esc(n.a)}</p>`;
        return `<button class="accordion__q" type="button" aria-expanded="false" aria-controls="note-${i}">${esc(
          n.q
        )}</button>
          <div class="accordion__a" id="note-${i}" hidden>${body}</div>`;
      })
      .join('');

    return `<h3>notes</h3>
      <p class="sub">short answers, mostly the ones people ask twice.</p>
      <div class="accordion">${items}</div>`;
  }

  function contactHtml() {
    return `<div class="contact-box">
        <h3>${esc(C.contact.heading)}</h3>
        <p>${esc(C.contact.body)}</p>
        <div class="btn-row">${actionLink({ label: 'send me an email!', href: C.links.email }, 'btn btn--primary')}</div>
        <p class="label" style="text-align:center">status</p>
        <p style="margin:0">${esc(C.contact.status)}</p>
      </div>`;
  }

  const PANEL_HTML = { about: aboutHtml, links: linksHtml, work: workHtml, notes: notesHtml, contact: contactHtml };
  let currentPanel = null;
  let opener = null;
  let detailOpener = null;

  function openPanel(id) {
    if (!WINDOWS.includes(id)) return;
    closeDialog(detail);
    currentPanel = id;
    $('#panelBarTitle').textContent = id;
    $('#panelBody').innerHTML = PANEL_HTML[id]();
    panel.classList.toggle('is-wide', id === 'work');
    zoomBtn.hidden = id !== 'work';

    if (id === 'notes') bindAccordions($('#panelBody'));
    if (id === 'work') bindLens();

    openDialog(panel);
  }

  function bindAccordions(scope) {
    $$('.accordion__q', scope).forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        const p = document.getElementById(btn.getAttribute('aria-controls'));
        if (p) p.hidden = open;
      }, { signal: signal });
    });
  }

  function bindLens() {
    $$('input[name="lens"]', $('#panelBody')).forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        state.lens = input.value;
        store.set(KEYS.lens, state.lens);
        const scrollTop = $('#panelBody').scrollTop;
        $('#panelBody').innerHTML = workHtml();
        bindLens();
        $('#panelBody').scrollTop = scrollTop;
        if (detail.open && currentDetail) renderDetail(currentDetail.kind, currentDetail.id, true);
        sfx('click');
      }, { signal: signal });
    });
  }

  /* 6 ------------------------------------------------------ project detail */

  let currentDetail = null;

  function section(key, title, body, badge) {
    return `<section class="detail-section" data-key="${esc(key)}">
        <h4>${badge ? `<span class="chip">${esc(badge)}</span> ` : ''}${esc(title)}</h4>${body}
      </section>`;
  }

  const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

  function projectDetailHtml(p) {
    const blocks = {
      problem: () => section('problem', 'Problem', `<p>${esc(p.problem)}</p>`),
      built: () => section('built', 'What I built', list(p.whatIBuilt)),
      stack: () => section('stack', 'Tech stack', `<p>${esc(p.techStack)}</p>`),
      product: () =>
        p.productDecisions && p.productDecisions.length
          ? section('product', 'Product decisions', list(p.productDecisions), 'product')
          : '',
      engineering: () =>
        p.engineeringDecisions && p.engineeringDecisions.length
          ? section('engineering', 'Engineering decisions', list(p.engineeringDecisions), 'engineering')
          : '',
      learned: () => section('learned', 'What I learned', `<p>${esc(p.learned)}</p>`)
    };

    const figure = p.visual
      ? `<figure class="detail-figure"><img src="${esc(p.visual.src)}" width="${p.visual.width}" height="${
          p.visual.height
        }" alt="${esc(p.visual.alt)}" decoding="async" /></figure>`
      : '';

    const links = (p.links || []).map((l) => actionLink(l)).join('');

    return `<h3>${esc(p.title)}</h3>
      <p class="sub">${esc(p.subtitle)}</p>
      ${p.note ? `<p class="sub">${esc(p.note)}</p>` : ''}
      ${figure}
      ${C.lenses[state.lens].order.map((k) => (blocks[k] ? blocks[k]() : '')).join('')}
      ${links ? section('links', 'Links', `<div class="btn-row">${links}</div>`) : ''}
      ${p.missing ? `<p class="note-missing">${esc(p.missing)}</p>` : ''}
      <p class="detail-lens-note">
        <span>showing ${esc(state.lens)} first.</span>
        <button class="btn btn--small" type="button" data-lens-set="${esc(otherLens(state.lens))}">
          show ${esc(otherLens(state.lens))} first
        </button>
      </p>`;
  }

  function experienceDetailHtml(x) {
    return `<h3>${esc(x.title)}</h3>
      <p class="sub">${esc(x.date)}</p>
      ${section('built', 'What I did', list(x.whatIDid))}
      ${section('stack', 'Tools / skills', `<p>${esc(x.tools)}</p>`)}
      ${section('learned', 'Why it mattered', `<p>${esc(x.mattered)}</p>`)}`;
  }

  function renderDetail(kind, id, keepScroll) {
    const item = kind === 'experience' ? C.experience(id) : C.project(id);
    if (!item) return false;
    const body = $('#detailBody');
    const top = keepScroll ? body.scrollTop : 0;
    body.innerHTML = kind === 'experience' ? experienceDetailHtml(item) : projectDetailHtml(item);
    $('#detailBarTitle').textContent = item.title.toLowerCase();
    if (keepScroll) body.scrollTop = top;
    currentDetail = { kind, id };
    return true;
  }

  function openDetail(kind, id) {
    if (!renderDetail(kind, id, false)) return;
    openDialog(detail);
  }

  /* 7 -------------------------------------------------------------- routing */
  /* Hashes name the open window. They never produce a separate page. */

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    if (!raw) return { type: 'home' };
    const parts = raw.split('/').filter(Boolean);
    if (parts[0] === 'work' && parts[1]) {
      const p = C.project(parts[1]);
      if (p) return { type: 'project', id: p.id };
      const e = C.experience(parts[1]);
      if (e) return { type: 'experience', id: e.id };
      return { type: 'panel', id: 'work' };
    }
    if (WINDOWS.includes(parts[0])) return { type: 'panel', id: parts[0] };
    return { type: 'home' };
  }

  function applyRoute() {
    if (!running) return;
    state.route = parseHash();
    if (state.route.type === 'panel') {
      openPanel(state.route.id);
    } else if (state.route.type === 'project' || state.route.type === 'experience') {
      if (currentPanel !== 'work' || !panel.open) openPanel('work');
      openDetail(state.route.type, state.route.id);
    } else {
      closeDialog(detail);
      closeDialog(panel);
      currentPanel = null;
      if (opener && document.contains(opener)) opener.focus();
      opener = null;
    }
  }

  function setRoute(hash, replace) {
    const url = `${location.pathname}${location.search}${hash}`;
    if (replace) history.replaceState({}, '', url);
    else history.pushState({ meadow: true }, '', url);
  }

  function navigate(hash) {
    if (location.hash === hash) { applyRoute(); return; }
    setRoute(hash, false);
    applyRoute();
  }

  function goHome() {
    history.replaceState({}, '', `${location.pathname}${location.search}`);
    state.route = { type: 'home' };
    currentPanel = null;
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  /* 8 -------------------------------- cat, doodle, and the bus to Field Trip */

  let catTimer = null;
  let lastCatSpoke = 0;

  function catSay(message, force) {
    const now = Date.now();
    if (!force && now - lastCatSpoke < 6000) return;
    lastCatSpoke = now;
    catBubble.textContent = message;
    catBubble.classList.add('is-visible');
    clearTimeout(catTimer);
    catTimer = setTimeout(() => catBubble.classList.remove('is-visible'), 3600);
  }

  function updateCatArt() {
    const time = state.time >= 0.65 ? 'night' : 'morning';
    const music = state.music ? 'music' : 'no-music';
    const base = `cat-${time}-${music}`;
    const webp = `assets/images/opt/${base}.webp`;
    if (catSource.srcset === webp) return;
    catSource.srcset = webp;
    catImg.src = `assets/images/${base}.gif`;
  }

  function stopMusic(message) {
    if (!audio) return;
    const a = audio;
    const from = a.music.volume;
    let step = 0;
    const fade = setInterval(() => {
      step += 1;
      a.music.volume = Math.max(0, from * (1 - step / 10));
      if (step >= 10) { clearInterval(fade); a.music.pause(); }
    }, 34);
    state.music = false;
    catBtn.classList.remove('is-playing');
    catBtn.setAttribute('aria-label', 'Play background music');
    updateCatArt();
    if (message) catSay(message, true);
  }

  async function startMusic() {
    if (!state.sound) { catSay('sound switch first?', true); return; }
    const a = ensureAudio();
    try {
      await a.music.play();
      state.music = true;
      catBtn.classList.add('is-playing');
      catBtn.setAttribute('aria-label', 'Pause background music');
      updateCatArt();
      let step = 0;
      const fade = setInterval(() => {
        step += 1;
        a.music.volume = Math.min(0.22, 0.22 * (step / 10));
        if (step >= 10) clearInterval(fade);
      }, 34);
      catSay('tiny soundtrack activated', true);
    } catch (err) {
      catSay('music file not here yet', true);
    }
  }

  function initCat() {
    catBtn.addEventListener('click', () => (state.music ? stopMusic('meadow muted') : startMusic()), { signal: signal });
  }

  function initPeek() {
    const peek = $('#profilePeek');
    const message = $('#peekMessage');
    const win = $('#deskWindow');
    let timer = null;

    peek.addEventListener('click', () => {
      if (peek.classList.contains('is-hiding') || win.classList.contains('is-talking')) return;
      sfx('click');
      clearTimeout(timer);
      if (state.time >= 0.75) {
        message.textContent = 'just five more minutes 人´∀｀)';
        win.classList.add('is-talking');
        timer = setTimeout(() => win.classList.remove('is-talking'), 2400);
        return;
      }
      message.textContent = 'brb';
      win.classList.add('is-talking');
      peek.classList.add('is-hiding');
      timer = setTimeout(() => {
        peek.classList.remove('is-hiding');
        win.classList.remove('is-talking');
      }, 4200);
    }, { signal: signal });
  }

  /* The bus. An explicit state machine, because a CSS delay chain gets one
     tab-switch wrong and then the bus lives in the wrong place forever.

       hidden → arriving → parked → departing → cooldown → arriving → …

     Positions are integers, timings are wall-clock, and the click target is
     switched off whenever the bus is not actually standing at the stop. */

  const BUS = {
    state: 'hidden',
    x: -280,
    since: 0,
    frame: null,
    el: null,
    btn: null
  };

  const BUS_OFF = -280;
  const BUS_PARK = 22;
  const BUS_SPEED = 108;   // px per second
  const BUS_WAIT = 18000;  // how long it stands there
  const BUS_GONE = 11000;  // how long before it comes back

  function busEnter(state, now) {
    BUS.state = state;
    BUS.since = now;
    const parked = state === 'parked';
    if (BUS.el) BUS.el.classList.toggle('is-parked', parked);
    /* the bubble belongs to a bus that is present; it goes before the bus does */
    if (BUS.btn) {
      const reachable = state === 'parked' || state === 'arriving';
      BUS.btn.disabled = !reachable;
      BUS.btn.setAttribute('aria-hidden', reachable ? 'false' : 'true');
    }
  }

  function busPlace() {
    if (BUS.el) BUS.el.style.setProperty('--bus-x', `${Math.round(BUS.x)}px`);
  }

  function busStep(now) {
    const dt = now - BUS.since;
    switch (BUS.state) {
      case 'arriving':
        BUS.x = BUS_OFF + (dt / 1000) * BUS_SPEED;
        if (BUS.x >= BUS_PARK) { BUS.x = BUS_PARK; busEnter('parked', now); }
        break;
      case 'parked':
        BUS.x = BUS_PARK;
        if (dt >= BUS_WAIT) busEnter('departing', now);
        break;
      case 'departing':
        BUS.x = BUS_PARK + (dt / 1000) * BUS_SPEED;
        if (BUS.x > window.innerWidth + 260) { BUS.x = window.innerWidth + 260; busEnter('cooldown', now); }
        break;
      case 'cooldown':
        if (dt >= BUS_GONE) { BUS.x = BUS_OFF; busEnter('arriving', now); }
        break;
      default:
        break;
    }
    busPlace();
  }

  function initBus() {
    const stop = $('#fieldTripStop');
    const bus = $('#fieldTripBus');
    if (!stop || !bus) return;
    BUS.el = stop;
    BUS.btn = bus;
    stop.hidden = false;

    bus.addEventListener('click', () => {
      if (bus.disabled) return;
      sfx('click');
      const ready = window.Modes.prepare
        ? window.Modes.prepare('field-trip').catch(() => null)
        : Promise.resolve(null);
      if (window.BusRide && window.BusRide.start) {
        bus.disabled = true;
        if (state.music) stopMusic('field trip boarding');
        window.BusRide.start({
          reduceMotion: reduceMotion.matches,
          sound: state.sound,
          onArrive: () => ready.finally(() => window.Modes.go('field-trip')),
          onCancel: () => {
            if (BUS.state === 'parked' || BUS.state === 'arriving') bus.disabled = false;
          }
        });
      } else {
        ready.finally(() => window.Modes.go('field-trip'));
      }
    }, { signal: signal });

    if (reduceMotion.matches) {
      /* a stable invitation rather than a vehicle doing laps */
      BUS.x = BUS_PARK;
      busEnter('parked', performance.now());
      busPlace();
      return;
    }

    BUS.x = BUS_OFF;
    busEnter('arriving', performance.now());
    busPlace();

    const tick = (now) => {
      BUS.frame = null;
      if (!running) return;
      busStep(now);
      BUS.frame = requestAnimationFrame(tick);
    };
    BUS.frame = requestAnimationFrame(tick);

    /* coming back to the tab resumes from wall-clock time; the state machine
       settles itself within a frame or two rather than freezing mid-street */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !running || BUS.frame) return;
      BUS.frame = requestAnimationFrame(tick);
    }, { signal: signal });
  }

  function stopBus() {
    if (BUS.frame) cancelAnimationFrame(BUS.frame);
    BUS.frame = null;
    BUS.state = 'hidden';
    if (BUS.el) {
      BUS.el.hidden = true;
      BUS.el.classList.remove('is-parked');
    }
    BUS.el = null;
    BUS.btn = null;
  }

  /* 9 ------------------------------------------------------- start / stop */

  function initGlobalClicks() {
    host.addEventListener('click', (e) => {
      const lensSet = e.target.closest('[data-lens-set]');
      if (lensSet) {
        state.lens = lensSet.dataset.lensSet;
        store.set(KEYS.lens, state.lens);
        if (currentPanel === 'work' && panel.open) {
          $('#panelBody').innerHTML = workHtml();
          bindLens();
        }
        if (currentDetail) renderDetail(currentDetail.kind, currentDetail.id, false);
        sfx('click');
        return;
      }

      const win = e.target.closest('[data-window]');
      if (win) {
        opener = win;
        sfx('click');
        navigate(`#/${win.dataset.window}`);
        return;
      }

      const project = e.target.closest('[data-project]');
      if (project) { detailOpener = project; navigate(`#/work/${project.dataset.project}`); return; }

      const exp = e.target.closest('[data-experience]');
      if (exp) { detailOpener = exp; navigate(`#/work/${exp.dataset.experience}`); }
    }, { signal: signal });

    window.addEventListener('hashchange', applyRoute, { signal: signal });
    window.addEventListener('popstate', applyRoute, { signal: signal });
  }

  function mountSwitchControl() {
    const slot = $('.win-header__right');
    if (!slot || slot.querySelector('.switch-profile')) return;
    slot.insertBefore(window.Modes.switchControl('switch-profile--bar'), slot.firstChild);
  }

  function start(mountPoint) {
    if (running) return;
    host = mountPoint;
    controller = new AbortController();
    signal = controller.signal;
    running = true;

    root = document.documentElement;
    celestial = $('#celestial');
    themeToggle = $('#themeToggle');
    themeToggleImg = $('#themeToggleImg');
    peekImg = $('#peekImg');
    peekSource = $('#peekSource');
    panel = $('#panelDialog');
    detail = $('#detailDialog');
    zoomBtn = $('[data-zoom]', panel);
    catBtn = $('#cat');
    catImg = $('#catImg');
    catSource = $('#catSource');
    catBubble = $('#catBubble');

    const savedLens = store.get(KEYS.lens, 'engineering');
    state.lens = LENS_IDS.includes(savedLens) ? savedLens : 'engineering';
    state.time = clamp(Number(store.get(KEYS.time, 0)) || 0);
    state.sound = store.get(KEYS.sound, false) === true;

    $('#tagline').innerHTML = C.profile.tagline;

    mountSwitchControl();
    buildSky();
    initCelestial();
    applyTime(state.time, { persist: false });
    initSound();
    initWindows();
    initCat();
    initPeek();
    initBus();
    initGlobalClicks();
    applyRoute();
  }

  function stop() {
    if (!running) return;
    running = false;
    stopBus();
    if (timeFrame) cancelAnimationFrame(timeFrame);
    clearTimeout(catTimer);
    if (state.music) stopMusic();
    closeDialog(detail);
    closeDialog(panel);
    currentPanel = null;
    currentDetail = null;
    opener = null;
    detailOpener = null;
    if (controller) controller.abort();
    controller = null;
    signal = null;
    root.classList.remove('dark');
  }

  return { start, stop };
})();
