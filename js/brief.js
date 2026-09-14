/* ==========================================================================
   brief.js — The Brief

   The recruiter's route, set as an editorial page rather than a stack of
   cards.

   The orange line is a gesture, not a border. It appears five times, does one
   job each time, and is absent everywhere else:

     1  a hook under the name, flicking up towards the portrait
     2  a short lead-in from the hero to "selected work"
     3  the rule the project navigation hangs from
     4  the experience timeline, with a stop per organisation
     5  the underline of the email address

   Each stroke is its own <path>, measured from the laid-out page rather than
   hard-coded, and each draws itself as its own part of the page arrives. No
   stroke exists to keep another one company.

   Everything else here is layout and the two interactive pieces the page
   needs: a carousel and a tab strip.

   Facts come from js/content.js and are never edited on the way through.
   ========================================================================== */

window.Brief = (function () {
  'use strict';

  const C = window.PORTFOLIO;

  const esc = (v) =>
    String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const outside = (href) => String(href).startsWith('http');
  const ext = (href) => (outside(href) ? ' target="_blank" rel="noopener noreferrer"' : '');

  const quiet = (label, href) =>
    `<a class="q-link" href="${esc(href)}"${ext(href)}>${esc(label)}${
      outside(href) ? '<span class="q-link__out" aria-hidden="true">↗</span>' +
        '<span class="visually-hidden"> (opens in a new tab)</span>' : ''
    }</a>`;

  /* technology reads as prose, not as a row of chips */
  const dotted = (list) => (list || []).map(esc).join(' &middot; ');

  /* links, and separately the honest reason there are none: a note reads as a
     caption under the links, never as another link beside them */
  const linksOf = (p) => (p.links || []).map((l) => quiet(l.label, l.href)).join('');
  const noteOf = (p) => p.status || p.missing || '';

  /* --- the three drawn details -------------------------------------------
     Line work in the same ink as the strokes, each one attached to something
     that is actually nearby: the project you are on, the tier of tools that
     is still growing, and the envelope you are about to write to. */

  const RING =
    '<svg class="idx__ring" viewBox="0 0 56 34" aria-hidden="true" focusable="false">' +
    '<path d="M 39 5.2 C 27 1.2, 9.5 3.4, 6 12.6 C 2.8 21.2, 12.5 30.6, 27.5 31 ' +
    'C 42.5 31.4, 51.5 24.6, 49.2 15.4 C 47.6 8.6, 41 4.4, 31 3.4 ' +
    'C 25.6 2.9, 21.4 3.6, 18 5.4" /></svg>';

  const SPROUT =
    '<svg class="sprout" viewBox="0 0 24 28" aria-hidden="true" focusable="false">' +
    '<path class="sprout__stem" d="M 12 27 C 12 21, 12 15, 12 7.5" />' +
    '<path class="sprout__leaf sprout__leaf--l" d="M 12 15.5 C 7 15.5, 3.5 12, 3.5 7 C 8.5 7.5, 12 10.5, 12 15.5" />' +
    '<path class="sprout__leaf sprout__leaf--r" d="M 12 11 C 16.5 11, 19.5 8, 19.5 3.8 C 15 4.4, 12 7, 12 11" />' +
    '</svg>';

  const WHOOSH =
    '<svg class="end__whoosh" viewBox="0 0 40 46" aria-hidden="true" focusable="false">' +
    '<path d="M 3 9 C 9 6.5, 13 6.5, 17 9" />' +
    '<path d="M 0 23 C 7 20.5, 12 20.5, 17 23" />' +
    '<path d="M 4 37 C 10 34.5, 14 34.5, 18 37" />' +
    '</svg>';

  /* 1 --------------------------------------------------------------- hero */

  function hero() {
    return `<section class="hero" aria-labelledby="brief-name">
        <h1 class="hero__name" id="brief-name" data-ink="name">${esc(C.profile.name)}</h1>
        <div class="hero__body">
          <p class="hero__role">${esc(C.profile.taglinePlain)}</p>
          <p class="hero__meta">${esc(C.profile.school)} &middot; ${esc(C.profile.classYear)} &middot; ${esc(
      C.profile.location
    )}</p>
          <p class="hero__lede">${esc(C.brief.lede)}</p>
          <p class="hero__do">
            <a class="cta" href="${esc(C.links.email)}">email me</a>
            <span class="hero__also">
              ${C.links.resume ? quiet('résumé', C.links.resume) : ''}
              ${quiet('GitHub', C.links.github)}
              ${quiet('LinkedIn', C.links.linkedin)}
            </span>
          </p>
          <p class="hero__mail"><a href="${esc(C.links.email)}">${esc(C.links.emailPlain)}</a></p>
        </div>
        <div class="hero__face" aria-hidden="true">
          <picture>
            <source type="image/webp" srcset="assets/images/opt/profile.webp" />
            <img src="assets/images/opt/profile.jpg" width="376" height="376" alt=""
              decoding="async" fetchpriority="high" />
          </picture>
        </div>
      </section>`;
  }

  /* 2 ------------------------------------------------------- featured work */

  function shot(p) {
    if (p.visual) {
      return `<figure class="shot">
          <img src="${esc(p.visual.src)}" width="${p.visual.width}" height="${p.visual.height}"
            alt="${esc(p.visual.alt)}" loading="lazy" decoding="async" />
        </figure>`;
    }
    /* the one featured project with nothing to show gets a set title page
       rather than an empty frame */
    return `<figure class="shot shot--set" aria-hidden="true">
        <p class="shot__set-title">${esc(p.title)}</p>
        <p class="shot__set-meta">${dotted(p.stack)}</p>
      </figure>`;
  }

  function lens(label, items) {
    if (!items || !items.length) return '';
    return `<div class="proof__lens">
        <p class="proof__key">${esc(label)}</p>
        ${items.slice(0, 2).map((i) => `<p class="proof__line">${esc(i)}</p>`).join('')}
      </div>`;
  }

  function slide(p, i, total) {
    const n = String(i + 1).padStart(2, '0');
    return `<article class="slide" id="brief-slide-${i}" data-project="${esc(p.id)}"
        aria-roledescription="slide" aria-label="${n} of ${total}, ${esc(p.title)}">
        ${shot(p)}
        <div class="slide__text">
          <p class="slide__idx" aria-hidden="true">${RING}<b>${n}</b></p>
          <h3 class="slide__title">${esc(p.title)}</h3>
          <p class="slide__sub">${esc(p.subtitle)}</p>
          <p class="slide__meta">
            <span class="slide__year">${esc(p.year || '')}</span>
            <span class="slide__stack">${dotted(p.stack)}</span>
          </p>
          <div class="proof">
            ${lens('engineering', p.engineeringDecisions)}
            ${lens('product', p.productDecisions)}
          </div>
          <p class="slide__links">${linksOf(p)}</p>
          ${noteOf(p) ? `<p class="slide__note">${esc(noteOf(p))}</p>` : ''}
        </div>
      </article>`;
  }

  function work() {
    const list = C.brief.featured.map(C.project).filter(Boolean);
    const total = list.length;
    return `<section class="sec sec--work" id="brief-work" aria-labelledby="brief-work-h">
        <h2 class="sec__h" id="brief-work-h" data-ink="dot">selected work</h2>

        <div class="stage" role="group" aria-roledescription="carousel" aria-label="Featured projects">
          <div class="stage__view">
            <div class="stage__track">${list.map((p, i) => slide(p, i, total)).join('')}</div>
          </div>

          <div class="rail">
            <p class="rail__now" aria-hidden="true">
              <b id="briefCount">01</b><span class="rail__of">/ ${String(total).padStart(2, '0')}</span>
            </p>
            <div class="rail__steps" role="tablist" aria-label="Choose a featured project">
              ${list
                .map(
                  (p, i) => `<button class="step" type="button" role="tab" data-go="${i}"
                    id="brief-step-${i}" aria-controls="brief-slide-${i}"
                    aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}">
                    <span class="visually-hidden">${esc(p.title)}</span>
                    <span class="step__mark" aria-hidden="true"></span>
                  </button>`
                )
                .join('')}
            </div>
            <div class="rail__moves">
              <button class="move" type="button" data-step="-1" aria-label="Previous project">
                <span aria-hidden="true">&#8592;</span>
              </button>
              <button class="move" type="button" data-step="1" aria-label="Next project">
                <span aria-hidden="true">&#8594;</span>
              </button>
            </div>
          </div>
          <p class="visually-hidden" role="status" aria-live="polite" id="briefSlideStatus"></p>
        </div>
      </section>`;
  }

  /* 3 ----------------------------------------------------------- the index */

  function index() {
    const rest = C.brief.alsoBuilt.map(C.project).filter(Boolean);
    const offset = C.brief.featured.length;
    return `<section class="sec sec--index" id="brief-more" aria-labelledby="brief-more-h">
        <h2 class="sec__h" id="brief-more-h">also built</h2>
        <ol class="index">
          ${rest
            .map(
              (p, i) => `<li class="entry">
                <span class="entry__n" aria-hidden="true">${String(offset + i + 1).padStart(2, '0')}</span>
                <h3 class="entry__t">${esc(p.title)}</h3>
                <p class="entry__y">${esc(p.year || '')}</p>
                <p class="entry__d">${esc(p.preview || p.subtitle)}</p>
                <p class="entry__s">${dotted(p.stack)}</p>
                ${linksOf(p) ? `<p class="entry__l">${linksOf(p)}</p>` : ''}
                ${noteOf(p) ? `<p class="entry__note">${esc(noteOf(p))}</p>` : ''}
              </li>`
            )
            .join('')}
        </ol>
      </section>`;
  }

  /* 4 --------------------------------------------------------- experience */

  function experience() {
    const list = C.experiences;
    return `<section class="sec sec--exp" id="brief-experience" aria-labelledby="brief-exp-h">
        <h2 class="sec__h" id="brief-exp-h" data-ink="dot">experience</h2>
        <div class="time">
          <div class="time__marks" role="tablist" aria-label="Where I have worked" aria-orientation="vertical">
            ${list
              .map(
                (x, i) => `<button class="mark" type="button" role="tab" id="brief-tab-${i}"
                  aria-controls="brief-panel-${i}" aria-selected="${i === 0 ? 'true' : 'false'}"
                  tabindex="${i === 0 ? '0' : '-1'}" data-tab="${i}">
                  <span class="mark__org">${esc(x.org)}</span>
                  <span class="mark__role">${esc(x.role)}</span>
                  <span class="mark__when">${esc(x.date)}</span>
                </button>`
              )
              .join('')}
          </div>
          <div class="time__body">
            ${list
              .map(
                (x, i) => `<div class="post" role="tabpanel" id="brief-panel-${i}"
                  aria-labelledby="brief-tab-${i}" tabindex="0"${i === 0 ? '' : ' hidden'}>
                  <h3 class="post__role">${esc(x.role)}</h3>
                  <p class="post__at">${esc(x.org)}<span class="post__when">${esc(x.date)}</span></p>
                  <ul class="post__did">${x.whatIDid.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
                  <p class="post__key">why it mattered</p>
                  <p class="post__why">${esc(x.mattered)}</p>
                  <p class="post__tools">${dotted(x.tags)}</p>
                </div>`
              )
              .join('')}
          </div>
        </div>
      </section>`;
  }

  /* 5 ------------------------------------------------------------ toolbox */

  const TIER = ['t1', 't2', 't3'];

  function toolbox() {
    return `<section class="sec sec--tools" id="brief-skills" aria-labelledby="brief-skills-h">
        <h2 class="sec__h" id="brief-skills-h">toolbox</h2>
        <div class="tiers">
          ${C.skills
            .map(
              (g, i) => `<div class="tier tier--${TIER[i] || 't3'}">
                <h3 class="tier__h">${i === 1 ? SPROUT : ''}<span>${esc(g.title)}</span></h3>
                <p class="tier__list">${dotted(g.items)}</p>
              </div>`
            )
            .join('')}
        </div>
        <div class="ledger">
          <div class="ledger__col ledger__col--edu">
            <h3 class="ledger__h">education</h3>
            <p class="ledger__lead">${esc(C.profile.degree.replace('&amp;', '&'))}</p>
            <p class="ledger__note">${esc(C.profile.school)}, ${esc(C.profile.location)}</p>
            <p class="ledger__note">${esc(C.profile.classYear)} &middot; GPA ${esc(C.profile.gpa)}</p>
          </div>
          <div class="ledger__col ledger__col--awards">
            <h3 class="ledger__h">awards</h3>
            <ul class="ledger__list">${C.about.awards.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>`;
  }

  /* 6 ------------------------------------------------------------ closing */

  function closing() {
    return `<section class="sec sec--end" id="brief-contact" aria-labelledby="brief-contact-h">
        <h2 class="sec__h" id="brief-contact-h">contact</h2>
        <div class="end">
          <div class="end__body">
            <p class="end__say">${esc(C.contact.body)}</p>
            <p class="end__mail"><a href="${esc(C.links.email)}" data-ink="mail">${esc(C.links.emailPlain)}</a></p>
            <p class="end__do">
              <a class="cta" href="${esc(C.links.email)}">email me</a>
              <span class="hero__also">
                ${C.links.resume ? quiet('résumé', C.links.resume) : ''}
                ${quiet('GitHub', C.links.github)}
                ${quiet('LinkedIn', C.links.linkedin)}
              </span>
            </p>
          </div>
          <div class="end__stamp" aria-hidden="true">
            ${WHOOSH}
            <picture>
              <source type="image/webp" srcset="assets/images/opt/email.webp" />
              <img src="assets/images/opt/email.png" width="300" height="300" alt="" decoding="async" loading="lazy" />
            </picture>
          </div>
        </div>
      </section>`;
  }

  /* ---------------------------------------------------------------- page */

  function page() {
    return `<header class="top" id="briefTop">
        <div class="wrap top__in">
          <a class="top__me" href="#briefMain">tabish navaid</a>
          <nav class="top__nav" id="briefNav" aria-label="Sections">
            <a href="#brief-work">work</a>
            <a href="#brief-experience">experience</a>
            <a href="#brief-skills">toolbox</a>
            <a href="#brief-contact">contact</a>
          </nav>
          <span class="top__switch"></span>
        </div>
        <span class="top__progress" aria-hidden="true"><i id="briefProgress"></i></span>
      </header>

      <main class="wrap" id="briefMain" tabindex="-1">
        <svg class="ink" id="briefInk" aria-hidden="true" focusable="false" width="0" height="0"></svg>
        ${hero()}
        ${work()}
        ${index()}
        ${experience()}
        ${toolbox()}
        ${closing()}
      </main>

      <footer class="foot">
        <div class="wrap foot__in">
          <p>This is the short version. There’s also a desktop with a cat on it, and a pixel town you can walk around.</p>
          <p class="foot__modes">
            <a href="?mode=meadow">meadow desktop</a>
            <a href="?mode=field-trip">field trip</a>
          </p>
        </div>
      </footer>`;
  }

  /* ------------------------------------------------------------ the ink */

  const SVG_NS = 'http://www.w3.org/2000/svg';

  let host = null;
  let controller = null;
  let observers = [];
  let reduce = null;
  /* one entry per stroke: the <path>, its length, and the two scroll
     positions between which it draws itself */
  let strokes = [];
  let rebuildQueued = false;

  const on = (el, type, fn, opts) =>
    el && el.addEventListener(type, fn, Object.assign({ signal: controller.signal }, opts || {}));

  const n1 = (v) => Math.round(v * 10) / 10;

  function buildInk() {
    rebuildQueued = false;
    const main = host.querySelector('#briefMain');
    const svg = host.querySelector('#briefInk');
    if (!main || !svg) return;

    const base = main.getBoundingClientRect();
    const boxOf = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: b.left - base.left, r: b.right - base.left, t: b.top - base.top, b: b.bottom - base.top };
    };
    const box = (sel) => boxOf(host.querySelector(sel));

    /* a heading's element box is the width of the column, not the width of
       the word: the hook has to know where the letters actually stop */
    const inkBox = (sel) => {
      const el = host.querySelector(sel);
      if (!el || !el.firstChild) return box(sel);
      const range = document.createRange();
      range.selectNodeContents(el);
      const b = range.getBoundingClientRect();
      range.detach && range.detach();
      if (!b.width) return box(sel);
      return { l: b.left - base.left, r: b.right - base.left, t: b.top - base.top, b: b.bottom - base.top };
    };

    const W = base.width;
    /* the layout height, never scrollHeight: this svg is an absolutely placed
       child of main, so measuring scrollHeight would feed its own size back in
       and grow the document on every pass */
    const H = base.height;
    const railX = parseFloat(getComputedStyle(main).getPropertyValue('--rail-x')) || 22;
    const edge = W - Math.max(8, railX * 0.6);

    const out = [];
    /* `from` and `to` are y positions on the page: the stroke is undrawn
       above the first and complete below the second */
    const add = (d, from, to) => { if (d) out.push({ d: d, from: from, to: to }); };

    /* 1 — the hook around the name. It comes down the margin beside the first
       letter, turns under the word, dips and lifts the way a pen does, and
       flicks up towards the portrait rather than continuing anywhere. */
    const name = inkBox('[data-ink="name"]');
    const face = box('.hero__face');
    if (name) {
      const y = name.b + 13;
      const x0 = Math.max(railX + 4, name.l - 34);
      /* the flick stops short of the portrait instead of running behind it */
      const roomTo = face && face.l > name.r ? face.l - 22 : name.r + 40;
      /* on a narrow page the flick has to stay on the paper */
      const x1 = Math.max(name.l + 40, Math.min(name.r + 30, roomTo, edge - 32));
      const w = x1 - x0;
      const yIn = Math.max(4, name.t + (name.b - name.t) * 0.34);
      add(
        `M ${n1(x0 - 12)} ${n1(yIn)} ` +
          `C ${n1(x0 - 15)} ${n1(yIn + (y - yIn) * 0.55)}, ${n1(x0 - 13)} ${n1(y - 12)}, ${n1(x0)} ${n1(y - 6)} ` +
          `C ${n1(x0 + w * 0.11)} ${n1(y + 6)}, ${n1(x0 + w * 0.3)} ${n1(y + 8)}, ${n1(x0 + w * 0.52)} ${n1(y + 2.5)} ` +
          `C ${n1(x0 + w * 0.72)} ${n1(y - 2)}, ${n1(x0 + w * 0.88)} ${n1(y - 3)}, ${n1(x1)} ${n1(y + 3)} ` +
          `C ${n1(x1 + 24)} ${n1(y + 9)}, ${n1(x1 + 27)} ${n1(y - 15)}, ${n1(x1 + 2)} ${n1(y - 23)}`,
        y - 230,
        y - 30
      );
    }

    /* 2 — the lead-in. It leaves the hero out to the right of the type, swings
       back down into the margin and lands on the "selected work" dot. Short,
       and going somewhere. */
    const workHead = box('#brief-work-h');
    if (workHead) {
      const y2 = workHead.t + 22;
      const below = box('.hero__body') || box('.hero') || { b: 0 };
      const y1 = Math.max(below.b + 24, y2 - 150);
      const drop = y2 - y1;
      const reach = Math.min(150, Math.max(60, drop * 1.1));
      add(
        `M ${n1(railX + reach)} ${n1(y1)} ` +
          `C ${n1(railX + reach * 0.42)} ${n1(y1 + drop * 0.06)}, ` +
          `${n1(railX - 2)} ${n1(y1 + drop * 0.34)}, ${n1(railX)} ${n1(y2)}`,
        y1 - 150,
        y2
      );
    }

    /* 3 — the rule the project navigation hangs from. One line, the width of
       the picture above it, so the controls belong to the project. */
    const rail = box('.sec--work .rail');
    if (rail) {
      const y = rail.t;
      add(
        `M ${n1(railX)} ${n1(y + 4)} ` +
          `C ${n1(railX + (edge - railX) * 0.22)} ${n1(y - 2)}, ` +
          `${n1(railX + (edge - railX) * 0.64)} ${n1(y + 3)}, ${n1(edge)} ${n1(y - 1)}`,
        y - 150,
        y + 30
      );
    }

    /* 4 — the timeline. The one place the line is structure: it runs from the
       first stop to the last, and every organisation sits on it. */
    const expHead = box('#brief-exp-h');
    const marks = Array.from(host.querySelectorAll('.mark'));
    if (marks.length > 1) {
      const dotY = (el) => {
        const b = boxOf(el);
        const cs = getComputedStyle(el, '::before');
        return b.t + (parseFloat(cs.top) || 18) + 4.5;
      };
      /* it enters the section at the heading dot and becomes the timeline */
      const yA = expHead ? expHead.t + 22 : dotY(marks[0]);
      const yB = dotY(marks[marks.length - 1]);
      const span = yB - yA;
      if (span > 20) {
        add(
          `M ${n1(railX)} ${n1(yA)} ` +
            `C ${n1(railX + 3)} ${n1(yA + span * 0.34)}, ${n1(railX - 3)} ${n1(yA + span * 0.68)}, ` +
            `${n1(railX)} ${n1(yB)}`,
          yA - 120,
          yB
        );
      }
    }

    /* 5 — the last thing it does is underline the address */
    const mail = box('[data-ink="mail"]');
    if (mail) {
      const y = mail.b + 5;
      const x0 = Math.max(railX, mail.l - 44);
      const x1 = Math.min(edge, mail.r + 12);
      const w = x1 - x0;
      if (w > 60) {
        add(
          `M ${n1(x0)} ${n1(y + 9)} ` +
            `C ${n1(x0 + w * 0.1)} ${n1(y - 2)}, ${n1(x0 + w * 0.3)} ${n1(y + 6)}, ${n1(x0 + w * 0.52)} ${n1(y + 1)} ` +
            `S ${n1(x0 + w * 0.85)} ${n1(y + 6)}, ${n1(x1)} ${n1(y + 1)}`,
          y - 200,
          y - 20
        );
      }
    }

    svg.setAttribute('width', String(Math.max(1, Math.round(W))));
    svg.setAttribute('height', String(Math.max(1, Math.round(H))));

    /* rebuild rather than patch: the strokes are cheap and the alternative is
       two sets of geometry disagreeing about the same page */
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    strokes = out.map((s) => {
      const el = document.createElementNS(SVG_NS, 'path');
      el.setAttribute('d', s.d);
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', 'currentColor');
      el.setAttribute('stroke-width', '2.5');
      el.setAttribute('stroke-linecap', 'round');
      el.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(el);
      const len = el.getTotalLength ? el.getTotalLength() : 0;
      el.style.strokeDasharray = len ? String(len) : 'none';
      el.style.strokeDashoffset = reduce.matches || !len ? '0' : String(len);
      return { el: el, len: len, from: s.from, to: s.to };
    });

    if (!reduce.matches) drawInk();

    /* the two section dots sit exactly where a stroke arrives */
    host.querySelectorAll('[data-ink="dot"]').forEach((h) => {
      h.style.setProperty('--dot-x', `${railX}px`);
    });

    /* the hand-drawn ring is one path; its length is the same in every slide */
    const ring = host.querySelector('.idx__ring path');
    if (ring && ring.getTotalLength) {
      host.style.setProperty('--ring-len', String(Math.ceil(ring.getTotalLength())));
    }
  }

  function drawInk() {
    if (!host || !strokes.length) return;
    const main = host.querySelector('#briefMain');
    if (!main) return;
    if (reduce.matches) {
      strokes.forEach((s) => { s.el.style.strokeDashoffset = '0'; });
      return;
    }
    const doc = document.documentElement;
    /* measured every time rather than cached: a stale origin is the one way
       this can silently stop tracking the page */
    const top = main.getBoundingClientRect().top + doc.scrollTop;
    const line = doc.scrollTop + window.innerHeight * 0.86 - top;
    strokes.forEach((s) => {
      const span = s.to - s.from;
      const p = span <= 0 ? (line >= s.to ? 1 : 0) : (line - s.from) / span;
      const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
      s.el.style.strokeDashoffset = String(s.len * (1 - clamped));
    });
  }

  function queueInk() {
    if (rebuildQueued) return;
    rebuildQueued = true;
    requestAnimationFrame(() => { if (host) buildInk(); });
  }

  /* ----------------------------------------------------------- carousel */

  let at = 0;
  let slides = [];
  let steps = [];

  const focusables = (el) => el.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');

  function paintSlides(say) {
    const track = host.querySelector('.stage__track');
    if (!track) return;
    track.style.transform = `translateX(${-at * 100}%)`;
    slides.forEach((el, i) => {
      const live = i === at;
      el.classList.toggle('is-on', live);
      if ('inert' in el) el.inert = !live;
      el.setAttribute('aria-hidden', live ? 'false' : 'true');
      focusables(el).forEach((f) => (live ? f.removeAttribute('tabindex') : f.setAttribute('tabindex', '-1')));
    });
    steps.forEach((s, i) => {
      s.setAttribute('aria-selected', i === at ? 'true' : 'false');
      s.tabIndex = i === at ? 0 : -1;
    });
    const count = host.querySelector('#briefCount');
    if (count) count.textContent = String(at + 1).padStart(2, '0');
    const prev = host.querySelector('[data-step="-1"]');
    const next = host.querySelector('[data-step="1"]');
    if (prev) prev.disabled = at === 0;
    if (next) next.disabled = at === slides.length - 1;
    const stage = host.querySelector('.stage');
    if (stage) stage.dataset.project = slides[at] ? slides[at].dataset.project : '';
    if (say) {
      const status = host.querySelector('#briefSlideStatus');
      if (status) status.textContent = slides[at].getAttribute('aria-label') || '';
    }
  }

  function goTo(i, opts) {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    if (next === at) return;
    at = next;
    paintSlides(true);
    if (opts && opts.focusStep && steps[at]) steps[at].focus();
  }

  function wireStage() {
    const stage = host.querySelector('.stage');
    if (!stage) return;
    slides = Array.from(stage.querySelectorAll('.slide'));
    steps = Array.from(stage.querySelectorAll('.step'));
    if (!slides.length) return;
    paintSlides(false);

    on(stage, 'click', (e) => {
      const move = e.target.closest('[data-step]');
      if (move) { goTo(at + Number(move.dataset.step)); return; }
      const go = e.target.closest('[data-go]');
      if (go) goTo(Number(go.dataset.go));
    });

    on(stage, 'keydown', (e) => {
      const inSteps = !!e.target.closest('.rail__steps');
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(at + 1, { focusStep: inSteps }); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(at - 1, { focusStep: inSteps }); }
      else if (inSteps && e.key === 'Home') { e.preventDefault(); goTo(0, { focusStep: true }); }
      else if (inSteps && e.key === 'End') { e.preventDefault(); goTo(slides.length - 1, { focusStep: true }); }
    });

    /* horizontal drags only, so a vertical scroll is never taken away */
    const view = stage.querySelector('.stage__view');
    let x0 = 0;
    let y0 = 0;
    let tracking = false;
    on(view, 'pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      tracking = true; x0 = e.clientX; y0 = e.clientY;
    });
    on(view, 'pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.6) goTo(at + (dx < 0 ? 1 : -1));
    });
    on(view, 'pointercancel', () => { tracking = false; });
  }

  /* --------------------------------------------------------------- tabs */

  function wireTabs() {
    const marks = host.querySelector('.time__marks');
    if (!marks) return;
    const tabs = Array.from(marks.querySelectorAll('.mark'));
    const posts = Array.from(host.querySelectorAll('.post'));

    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
        t.tabIndex = k === i ? 0 : -1;
      });
      posts.forEach((p, k) => { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
      if (tabs[i].scrollIntoView) tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      queueInk();
    };

    on(marks, 'click', (e) => {
      const tab = e.target.closest('.mark');
      if (tab) select(tabs.indexOf(tab), false);
    });

    on(marks, 'keydown', (e) => {
      const i = tabs.indexOf(document.activeElement.closest('.mark'));
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      select(n, true);
    });
  }

  /* ------------------------------------------------- header and progress */

  function wireTop() {
    const top = host.querySelector('#briefTop');
    const bar = host.querySelector('#briefProgress');
    const nav = host.querySelector('#briefNav');
    const heroEl = host.querySelector('.hero');
    if (!top || !bar) return;

    const links = nav ? Array.from(nav.querySelectorAll('a')) : [];
    const marks = links
      .map((a) => ({ a: a, el: host.querySelector(a.getAttribute('href')) }))
      .filter((m) => m.el);
    let current = null;

    /* the section being read is the last one past a line 45% down the screen,
       and the final one once the page bottoms out, since nothing below it can
       ever reach that line */
    const activeLink = (scrollTop, max) => {
      if (!marks.length) return null;
      if (max > 0 && scrollTop >= max - 4) return marks[marks.length - 1].a;
      const line = window.innerHeight * 0.45;
      let found = null;
      marks.forEach((m) => { if (m.el.getBoundingClientRect().top <= line) found = m.a; });
      return found;
    };

    let queued = false;
    const paint = () => {
      queued = false;
      const doc = document.documentElement;
      const y = doc.scrollTop || document.body.scrollTop;
      const max = doc.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, y / max)) : 0})`;
      if (heroEl) top.classList.toggle('is-tight', y > heroEl.offsetHeight * 0.6);
      drawInk();
      const next = activeLink(y, max);
      if (next !== current) {
        current = next;
        links.forEach((l) => (l === next ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
      }
    };

    paint();
    on(window, 'scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    }, { passive: true });
    on(window, 'resize', () => { paint(); queueInk(); }, { passive: true });
  }

  /* ---------------------------------------------------------- lifecycle */

  function start(mountPoint, opts) {
    host = mountPoint;
    controller = new AbortController();
    observers = [];
    strokes = [];
    at = 0;
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    host.innerHTML = page();

    const slot = host.querySelector('.top__switch');
    if (slot) slot.appendChild(window.Modes.switchControl('switch-profile--brief'));

    wireStage();
    wireTabs();
    wireTop();

    window.scrollTo(0, 0);
    buildInk();

    /* the strokes are measured from the finished layout, so anything that
       changes that layout has to ask for them again */
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(queueInk);
      ro.observe(host.querySelector('#briefMain'));
      observers.push(ro);
    }
    host.querySelectorAll('img').forEach((img) => {
      if (!img.complete) on(img, 'load', queueInk);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => host && queueInk());

    /* set now, not in a frame: an entrance is a nicety, legibility is not */
    if (!reduce.matches && document.visibilityState === 'visible') host.classList.add('is-fresh');

    if (opts && opts.focus) host.querySelector('#briefMain').focus({ preventScroll: true });
  }

  function stop() {
    rebuildQueued = false;
    if (controller) controller.abort();
    controller = null;
    observers.forEach((o) => o.disconnect());
    observers = [];
    slides = [];
    steps = [];
    strokes = [];
    if (host) {
      host.classList.remove('is-fresh');
      host.style.removeProperty('--ring-len');
      host.innerHTML = '';
    }
    host = null;
  }

  return { start, stop };
})();
