/* ==========================================================================
   brief.js — The Brief

   Sheet 1 of a set of three. The Brief is drawn as a technical drawing: a
   bordered sheet on graph paper, a ruler across the top that is also the
   navigation, a title block with the particulars, numbered figures, dimension
   lines, and notes in the margin with leader lines back to what they are
   about. Meadow Desktop and Field Trip are sheets 2 and 3 of the same set.

   The page can be read before any of this runs: every project's reasoning
   sits in a native <details>, so it opens from the keyboard with no script.
   What the script adds on top:

     1  scroll spy for the ruler
     2  blocks rising in as they arrive, from a base state that is visible
     3  the email signature inking itself, once

   Facts come from js/content.js and are never edited on the way through.
   ========================================================================== */

window.Brief = (function () {
  'use strict';

  const C = window.PORTFOLIO;
  const OPT = 'assets/images/opt/';

  const esc = (v) =>
    String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* a few content strings carry an entity for the desktop's innerHTML */
  const plain = (v) => String(v).replace(/&amp;/g, '&');

  const outside = (href) => String(href).startsWith('http');
  const ext = (href) => (outside(href) ? ' target="_blank" rel="noopener noreferrer"' : '');
  const newTab = (href) => (outside(href) ? '<span class="visually-hidden"> (opens in a new tab)</span>' : '');

  /* technology reads as one line of prose, never as a row of chips */
  const dotted = (list) => (list || []).map(esc).join(' &middot; ');

  /* The drawn art is decoration, so every picture here is alt="". The only
     images with alt text are the project screenshots, and theirs was written
     in content.js. */
  const pic = (name, cls, size) =>
    `<picture><source type="image/webp" srcset="${OPT}${name}.webp" />` +
    `<img class="${cls}" src="${OPT}${name}.png" width="${size || 360}" height="${size || 360}" alt="" decoding="async" /></picture>`;

  /* the cat has no PNG derivative; its fallback is the rebuilt GIF */
  const catPic = (cls) =>
    `<picture><source type="image/webp" srcset="${OPT}cat-morning-no-music.webp" />` +
    `<img class="${cls}" src="assets/images/cat-morning-no-music.gif" width="300" height="300" alt="" decoding="async" /></picture>`;

  /* --- the set of sheets ---------------------------------------------------
     The three profiles are one numbered set, in the chooser's order. The
     fallbacks only matter if modes.js has not registered them. */

  const MODES = window.Modes || null;
  const SHEETS = (MODES && MODES.ids) || ['brief', 'meadow', 'field-trip'];
  const FALLBACK = {
    brief: { name: 'The Brief', icon: 'the-brief' },
    meadow: { name: 'Meadow Desktop', icon: 'meadow-desktop' },
    'field-trip': { name: 'Field Trip', icon: 'field-trip' }
  };
  const spec = (id) => (MODES && MODES.spec && MODES.spec[id]) || FALLBACK[id];
  const sheetNo = (id) => SHEETS.indexOf(id) + 1;
  const SHEET_OF = `${sheetNo('brief')} of ${SHEETS.length}`;
  const OTHERS = SHEETS.filter((id) => id !== 'brief');

  /* --- line work -----------------------------------------------------------
     Every stroke on the page is drawn slightly off true, the way a pen goes. */

  /* One filter: it nudges a ruled border a pixel or two either way so the
     border reads as drawn. The seed is fixed, so the wobble is identical on
     every load. */
  const DEFS =
    '<svg class="brief-defs" width="0" height="0" aria-hidden="true" focusable="false">' +
    '<filter id="briefWobble" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="2" seed="4" result="wobble" />' +
    '<feDisplacementMap in="SourceGraphic" in2="wobble" scale="4.5" xChannelSelector="R" yChannelSelector="G" />' +
    '</filter></svg>';

  const POINTER =
    '<svg class="mark__pointer" viewBox="0 0 14 10" aria-hidden="true" focusable="false">' +
    '<path d="M 1.5 1.8 C 4.5 2, 9.5 1.6, 12.5 1.9 C 10.6 4.4, 8.8 6.6, 7 8.6 C 5.1 6.4, 3.3 4.2, 1.5 1.8 Z" />' +
    '</svg>';

  const UNDER =
    '<svg class="mark__under" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<path d="M 1.5 5.4 C 20 3.2, 38 6.4, 56 4.4 S 86 3.4, 98.5 4.6" />' +
    '</svg>';

  const CHEVRON =
    '<svg class="hook__chev" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M 5.6 2.8 C 7.8 4.6, 9.6 6.3, 11.2 8 C 9.5 9.8, 7.6 11.5, 5.4 13.2" />' +
    '</svg>';

  const OUT =
    '<svg class="out" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
    '<path d="M 2.8 9.3 C 4.9 7.1, 6.9 5.2, 9 3.1 M 4.4 2.9 C 6 2.8, 7.6 2.9, 9.2 3 C 9.3 4.6, 9.2 6.1, 9.1 7.7" />' +
    '</svg>';

  const RESUME =
    '<svg class="reach__icon reach__icon--drawn" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<path d="M 8.2 3.6 C 13 3.4, 17.6 3.7, 20.6 3.5 L 25.4 8.6 C 25.6 15, 25.2 22.4, 25.5 28.4 ' +
    'C 19.6 28.7, 13.4 28.3, 8 28.6 C 8.3 20, 7.9 11.4, 8.2 3.6 Z" />' +
    '<path d="M 20.4 3.8 C 20.2 5.6, 20.5 7.2, 20.3 8.8 C 22 8.7, 23.6 8.9, 25.2 8.7" />' +
    '<path d="M 11.8 13.6 C 15 13.4, 18 13.7, 21.2 13.5 M 11.8 17.8 C 15 17.6, 18.2 17.9, 21.4 17.7 M 11.8 22 C 13.8 21.9, 15.6 22.1, 17.6 22" />' +
    '</svg>';

  /* the ring the cat sits in, over in the title block */
  const RING =
    '<svg class="checked__ring" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<path d="M 32 4.2 C 47.6 3.6, 60.2 15.4, 59.8 31.6 C 59.4 47.8, 47 60.4, 31.2 59.8 C 15.6 59.2, 4 46.6, 4.4 31 C 4.8 16.4, 16.2 4.8, 30.4 4.4" />' +
    '</svg>';

  /* the signature under the email address: one pass, and a flick at the end */
  const SIG =
    '<svg class="sig" viewBox="0 0 320 26" aria-hidden="true" focusable="false">' +
    '<path pathLength="1" d="M 6 16.5 C 44 9.5, 82 18.5, 124 12.6 S 204 7.4, 246 13 S 298 17.6, 314 8.4 C 306 13.6, 299 18, 290 21.8" />' +
    '</svg>';

  /* ----------------------------------------------------------------- ruler */

  const MARKS = [
    { id: 'work', label: 'work', icon: 'icon-work' },
    { id: 'experience', label: 'experience', icon: 'icon-about' },
    { id: 'toolbox', label: 'toolbox', icon: 'icon-links' },
    { id: 'contact', label: 'contact', icon: 'icon-contact' }
  ];

  function ruler() {
    return `<header class="ruler">
        <p class="ruler__id">${esc(C.profile.name)}</p>
        <nav class="ruler__nav" aria-label="On this sheet">
          <ul class="marks">
            ${MARKS.map(
              (m) => `<li><a class="mark" href="#brief-${m.id}" data-spy="${m.id}">
                ${pic(m.icon, 'mark__icon')}<span class="mark__text">${esc(m.label)}${UNDER}</span>${POINTER}
              </a></li>`
            ).join('')}
          </ul>
        </nav>
        <div class="ruler__switch"></div>
        <span class="ruler__ticks" aria-hidden="true"></span>
      </header>`;
  }

  /* ------------------------------------------------------ hero, title block */

  function hero() {
    return `<section class="hero" aria-labelledby="briefName">
        <h1 class="hero__name" id="briefName">${esc(C.profile.name)}</h1>
        <p class="hero__role">${esc(C.profile.taglinePlain)}</p>
        <p class="hero__lede">${esc(C.brief.lede)}</p>
      </section>`;
  }

  const reachList = () =>
    [
      { label: 'email', href: C.links.email, art: pic('email', 'reach__icon', 300) },
      { label: 'github', href: C.links.github, art: pic('github', 'reach__icon', 300) },
      { label: 'linkedin', href: C.links.linkedin, art: pic('linked-in', 'reach__icon', 300) },
      C.links.resume ? { label: 'résumé', href: C.links.resume, art: RESUME } : null
    ]
      .filter(Boolean)
      .map(
        (r) => `<li><a class="reach" href="${esc(r.href)}"${ext(r.href)}>${r.art}<span class="reach__name">${esc(r.label)}</span>${newTab(
          r.href
        )}</a></li>`
      )
      .join('');

  /* The cat signs the drawing. Meadow Desktop has it down as quality
     assurance, so it is the one who checked this sheet. */
  const checkedBy = () =>
    `<span class="checked">
          <span class="checked__seat">${RING}${catPic('checked__art')}</span>
          <span class="checked__name">the cat</span>
        </span>`;

  /* The way off this sheet. Understated on purpose: the thumbnail the chooser
     uses, the sheet number, and the name. The scribble is only drawn on hover
     and on focus, and the focus ring comes from the one :focus-visible rule
     every control on the sheet shares.

     The href is an ordinary `?mode=` anchor, which is the one thing it has to
     be: modes.js listens for a click on any such anchor anywhere in the app
     and switches profiles in place, so this takes the same path as "switch
     profile" and never reloads the page. Written as a real link rather than a
     button so middle-click, cmd-click and "copy link" all still work, and so
     it is a link with nothing scripted about it if modes.js never arrives.

     "Open" is a visually-hidden prefix rather than an aria-label, so the
     accessible name reads "Open sheet 2, Meadow Desktop" and still contains
     every word that is on screen. */
  const sheetLink = (id) =>
    `<li><a class="sheets__link" href="?mode=${id}">
        <span class="visually-hidden">Open </span>
        <span class="sheets__frame">${pic(spec(id).icon, 'sheets__thumb')}</span>
        <span class="sheets__text">
          <span class="sheets__no">sheet ${sheetNo(id)}<span class="visually-hidden">,</span></span>
          <span class="sheets__name">${esc(spec(id).name)}${UNDER}</span>
        </span>
      </a></li>`;

  function titleBlock() {
    const p = C.profile;
    return `<div class="tb">
        <dl class="tb__grid">
          <div class="tb__cell tb__cell--by"><dt>drawn by</dt><dd class="tb__big">${esc(p.name)}</dd></div>
          <div class="tb__cell tb__cell--check"><dt>checked by</dt><dd class="tb__check">${checkedBy()}</dd></div>
          <div class="tb__cell tb__cell--sheet">
            <dt>sheet</dt>
            <dd>
              <span class="tb__big">${SHEET_OF}</span>
              <ul class="sheets">
                ${OTHERS.map((id) => sheetLink(id)).join('')}
              </ul>
            </dd>
          </div>
          <div class="tb__cell tb__cell--drawing"><dt>drawing</dt><dd>${esc(spec('brief').name)}</dd></div>
          <div class="tb__cell tb__cell--school"><dt>school</dt><dd>${esc(p.school)}, ${esc(p.location)}</dd></div>
          <div class="tb__cell tb__cell--year"><dt>year</dt><dd>${esc(p.classYear)}</dd></div>
          <div class="tb__cell tb__cell--reach"><dt>reach</dt><dd><ul class="reaches">${reachList()}</ul></dd></div>
        </dl>
      </div>`;
  }

  /* ---------------------------------------------------------------- plates */

  const head = (id, text, icon) =>
    `<h2 class="sec__h" id="${id}-h" data-rise>${pic(icon, 'sec__icon')}<span>${esc(text)}</span></h2>`;

  function qLink(label, href) {
    return `<a class="q-link" href="${esc(href)}"${ext(href)}>${esc(label)}${outside(href) ? OUT : ''}${newTab(href)}</a>`;
  }

  /* a drafting dimension: the before at one tick, the after at the other */
  const measure = (m) => `<p class="dim">
      <span class="dim__label">${esc(m.label)}<span class="visually-hidden">:</span></span>
      <span class="dim__from">${esc(m.from)}</span>
      <span class="dim__line" aria-hidden="true"></span>
      <span class="visually-hidden"> to </span>
      <span class="dim__to">${esc(m.to)}</span>
    </p>`;

  /* The project's question, and its answer one click away. A native
     <details>: keyboard-first, and it needs no script to open. */
  function hook(p) {
    const groups = [
      ['engineering', p.engineeringDecisions],
      ['product', p.productDecisions]
    ].filter((g) => g[1] && g[1].length);
    if (!groups.length && !p.learned) return '';
    return `<details class="hook">
        <summary class="hook__q">${CHEVRON}<span class="hook__text">${esc(p.openLabel || 'the decisions behind it')}</span></summary>
        <div class="hook__a">
          ${groups
            .map(
              (g) => `<h4 class="hook__k">${g[0]}</h4>
              <ul class="hook__list">${g[1].map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
            )
            .join('')}
          ${p.learned ? `<h4 class="hook__k">learned</h4><p class="hook__learned">${esc(p.learned)}</p>` : ''}
        </div>
      </details>`;
  }

  function plate(p, n, wide) {
    const id = `brief-p-${p.id}`;
    /* what it is, when it was built, and where it stands: the bar carries the
       short version, the way a drawing sheet does */
    const bar = [p.kind, p.year ? `built ${p.year}` : '', p.state ? `status: ${p.state}` : ''].filter(Boolean).join(' · ');
    /* the reason there is no demo is part of the drawing, so it is a note on
       it with a leader line, not small print underneath */
    const note = p.missing;
    const shot = wide && p.visual;
    const links = (p.links || []).map((l) => qLink(l.label, l.href)).join('');

    return `<article class="plate" aria-labelledby="${id}" data-rise>
        <div class="plate__box">
          <span class="plate__tick plate__tick--a" aria-hidden="true"></span>
          <span class="plate__tick plate__tick--b" aria-hidden="true"></span>
          <p class="plate__bar">
            <span aria-hidden="true">fig. ${String(n).padStart(2, '0')} &middot; ${esc(p.id)}</span>
            <span>${esc(bar)}</span>
          </p>
          <div class="plate__body">
            ${
              shot
                ? `<figure class="plate__figure">
                    <span class="plate__img"><img src="${esc(p.visual.src)}" width="${p.visual.width}" height="${p.visual.height}"
                      alt="${esc(p.visual.alt)}" loading="lazy" decoding="async" /></span>
                    ${p.measure ? measure(p.measure) : ''}
                  </figure>`
                : ''
            }
            <h3 class="plate__title" id="${id}">${esc(p.title)}</h3>
            ${hook(p)}
            <p class="plate__sub">${esc(wide ? p.subtitle : p.preview || p.subtitle)}</p>
            ${!shot && p.measure ? measure(p.measure) : ''}
            <p class="plate__stack"><span class="visually-hidden">Built with: </span>${dotted(p.stack)}</p>
            ${links ? `<p class="plate__links">${links}</p>` : ''}
          </div>
        </div>
        ${note ? `<p class="callout"><span class="callout__k">note</span>${esc(note)}</p>` : ''}
      </article>`;
  }

  /* -------------------------------------------------------------- sections */

  /* `data-section` is the ruler mark a section lights up. Sections that are
     not on the ruler borrow the nearest one that is. */

  function work() {
    const list = C.brief.featured.map(C.project).filter(Boolean);
    return `<section class="sec" id="brief-work" data-section="work" aria-labelledby="brief-work-h">
        ${head('brief-work', 'selected work', 'icon-work')}
        <div class="plates">${list.map((p, i) => plate(p, i + 1, true)).join('')}</div>
      </section>`;
  }

  function more() {
    const offset = C.brief.featured.length;
    const list = C.brief.alsoBuilt.map(C.project).filter(Boolean);
    return `<section class="sec" id="brief-more" data-section="work" aria-labelledby="brief-more-h">
        ${head('brief-more', 'also built', 'icon-faq')}
        <div class="plates plates--small">${list.map((p, i) => plate(p, offset + i + 1, false)).join('')}</div>
      </section>`;
  }

  function experience() {
    return `<section class="sec" id="brief-experience" data-section="experience" aria-labelledby="brief-experience-h">
        ${head('brief-experience', 'experience', 'icon-about')}
        <ul class="jobs">
          ${C.experiences
            .map(
              (x) => `<li class="job" data-rise>
                <div class="job__head">
                  <h3 class="job__title"><span class="job__org">${esc(x.org)}</span><span class="job__slash" aria-hidden="true">/</span><span
                    class="visually-hidden">, </span><span class="job__role">${esc(x.role)}</span></h3>
                  <p class="job__when">${esc(x.date)}</p>
                </div>
                <ul class="job__did">${x.whatIDid.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
                ${x.measure ? measure(x.measure) : ''}
                <p class="job__why">${esc(x.mattered)}</p>
                <p class="job__tools"><span class="visually-hidden">Tools: </span>${dotted(x.tags)}</p>
              </li>`
            )
            .join('')}
        </ul>
      </section>`;
  }

  function toolbox() {
    return `<section class="sec" id="brief-toolbox" data-section="toolbox" aria-labelledby="brief-toolbox-h">
        ${head('brief-toolbox', 'toolbox', 'icon-links')}
        <ul class="tools" data-rise>
          ${C.skills
            .map(
              (g) => `<li class="tools__line"><span class="tools__k">${esc(g.title)}<span class="visually-hidden">: </span></span><span
                class="tools__v">${dotted(g.items)}</span></li>`
            )
            .join('')}
        </ul>
      </section>`;
  }

  function education() {
    const p = C.profile;
    return `<section class="sec" id="brief-education" data-section="toolbox" aria-labelledby="brief-education-h">
        ${head('brief-education', 'education + awards', 'the-brief')}
        <div class="edu" data-rise>
          <div>
            <h3 class="edu__h">education</h3>
            <p class="edu__lead">${esc(plain(p.degree))}</p>
            ${p.minor ? `<p class="edu__minor">${esc(plain(p.minor))} minor</p>` : ''}
            <p class="edu__note">${esc(p.school)}, ${esc(p.location)}</p>
            <p class="edu__note">${esc(p.classYear)} &middot; GPA ${esc(p.gpa)}</p>
          </div>
          <div>
            <h3 class="edu__h">awards</h3>
            <ul class="edu__list">${C.about.awards.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>`;
  }

  /* the drawing closes the way a drawing does: with a block in the corner */
  function contact() {
    return `<section class="sec" id="brief-contact" data-section="contact" aria-labelledby="brief-contact-h">
        ${head('brief-contact', 'contact', 'icon-contact')}
        <div class="end" data-rise>
          <p class="end__say">${esc(C.contact.body)}</p>
          <div class="tb tb--end">
            <dl class="tb__grid">
              <div class="tb__cell tb__cell--mail"><dt>write to</dt><dd class="end__mail"><a href="${esc(C.links.email)}">${esc(
      C.links.emailPlain
    )}${SIG}</a></dd></div>
              <div class="tb__cell tb__cell--else"><dt>elsewhere</dt><dd class="end__links">
                ${C.links.resume ? qLink('résumé', C.links.resume) : ''}
                ${qLink('GitHub', C.links.github)}
                ${qLink('LinkedIn', C.links.linkedin)}
              </dd></div>
              <div class="tb__cell tb__cell--next"><dt>continues on</dt><dd class="end__links">
                ${OTHERS.map(
                  (id) =>
                    `<a class="q-link" href="?mode=${id}"><span class="visually-hidden">Open </span>sheet ${sheetNo(
                      id
                    )}, ${esc(spec(id).name)}</a>`
                ).join('')}
              </dd></div>
            </dl>
          </div>
        </div>
      </section>`;
  }

  function page() {
    return `${DEFS}
      <div class="sheet">
        ${ruler()}
        <main class="page" id="briefMain" tabindex="-1">
          ${hero()}
          ${titleBlock()}
          ${work()}
          ${more()}
          ${experience()}
          ${toolbox()}
          ${education()}
          ${contact()}
        </main>
        <footer class="sheet__foot">
          <p>built by hand. no framework, no build step.</p>
          <p>${esc(spec('brief').name)} &middot; sheet ${SHEET_OF}</p>
        </footer>
      </div>
`;
  }

  /* ------------------------------------------------------------- lifecycle */

  let host = null;
  let controller = null;
  let observers = [];
  let timers = {};
  let reduce = null;

  const $ = (sel) => host.querySelector(sel);

  const on = (el, type, fn, opts) =>
    el && el.addEventListener(type, fn, Object.assign({ signal: controller.signal }, opts || {}));

  const later = (name, fn, ms) => {
    clearTimeout(timers[name]);
    timers[name] = setTimeout(fn, ms);
  };

  /* 1 ---------------------------------------------------------- scroll spy */

  function wireSpy() {
    const links = Array.from(host.querySelectorAll('.mark'));
    const sections = Array.from(host.querySelectorAll('section[data-section]'));
    if (!links.length || !sections.length) return;

    let current;
    const mark = (id) => {
      if (id === current) return;
      current = id;
      links.forEach((a) => (a.dataset.spy === id ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    };

    /* Sections are spaced with padding rather than margin, so they touch: a
       thin band 40% of the way down the screen always sits inside exactly one
       of them once the hero has scrolled past. The last section can be too
       short to ever reach that band, so the bottom of the page counts as it. */
    const inBand = new Set();
    const settle = () => {
      const doc = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        mark(sections[sections.length - 1].dataset.section);
        return;
      }
      const hit = sections.filter((s) => inBand.has(s));
      mark(hit.length ? hit[hit.length - 1].dataset.section : null);
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? inBand.add(e.target) : inBand.delete(e.target)));
          settle();
        },
        { rootMargin: '-40% 0px -59% 0px' }
      );
      sections.forEach((s) => io.observe(s));
      observers.push(io);
    }

    let queued = false;
    on(
      window,
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          if (host) settle();
        });
      },
      { passive: true }
    );
  }

  /* 2 ---------------------------------------------------------------- rise */

  /* Nothing is ever hidden while it waits. A block stays exactly as laid out
     until the observer says it is arriving, and only then plays a short
     animation that starts faded and ends at its ordinary state. If the
     observer never fires, the block was simply visible all along. Blocks
     already on screen when the page opens are left alone. */
  function wireRise() {
    if (reduce.matches || !('IntersectionObserver' in window)) return;
    const seen = new WeakSet();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target;
          if (!seen.has(el)) {
            seen.add(el);
            if (e.isIntersecting) io.unobserve(el);
            return;
          }
          if (!e.isIntersecting) return;
          io.unobserve(el);
          if (reduce.matches || document.visibilityState !== 'visible') return;
          const done = (ev) => {
            if (ev && ev.target !== el) return;
            el.classList.remove('is-rising');
            el.removeEventListener('animationend', done);
          };
          el.classList.add('is-rising');
          el.addEventListener('animationend', done);
          later('rise', () => host && host.querySelectorAll('.is-rising').forEach((r) => r.classList.remove('is-rising')), 1200);
        });
      },
      /* a hair below the fold, so the switch to faded happens off screen */
      { rootMargin: '0px 0px 24px 0px' }
    );
    host.querySelectorAll('[data-rise]').forEach((el) => io.observe(el));
    observers.push(io);
  }

  /* 3 ----------------------------------------------------------- signature */

  /* The underline is drawn in the stylesheet. When the address is about to
     scroll into view, a one-off animation re-inks it from nothing; if the
     address was already on screen, or motion is reduced, it just stays drawn. */
  function wireSignature() {
    const sig = $('.sig');
    if (!sig || reduce.matches || !('IntersectionObserver' in window)) return;
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (first) {
          first = false;
          if (e.isIntersecting) {
            io.disconnect();
            return;
          }
        }
        if (!e.isIntersecting) return;
        io.disconnect();
        if (reduce.matches || document.visibilityState !== 'visible') return;
        sig.classList.add('is-inking');
      },
      { rootMargin: '0px 0px 40px 0px' }
    );
    io.observe(sig);
    observers.push(io);
  }

  function start(mountPoint, opts) {
    host = mountPoint;
    controller = new AbortController();
    observers = [];
    timers = {};
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    host.innerHTML = page();

    const slot = $('.ruler__switch');
    if (slot && window.Modes) slot.appendChild(window.Modes.switchControl('switch-profile--brief'));

    wireSpy();
    window.scrollTo(0, 0);
    wireRise();
    wireSignature();

    /* Moving focus to the content only helps somebody who just picked this
       profile: the control they used has gone, so focus needs a new home.
       modes.js asks for focus on a cold load too, and there it would skip the
       skip link and the ruler, so the first Tab would land halfway down the
       page. go() is the only path that records { mode } in history, and a
       reload keeps that state, so a reload is treated as a cold load. */
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const arrived = history.state && history.state.mode === 'brief' && !(nav && nav.type === 'reload');
    if (opts && opts.focus && arrived) $('#briefMain').focus({ preventScroll: true });
  }

  function stop() {
    if (controller) controller.abort();
    controller = null;
    observers.forEach((o) => o.disconnect());
    observers = [];
    Object.keys(timers).forEach((k) => clearTimeout(timers[k]));
    timers = {};
    if (host) host.innerHTML = '';
    host = null;
  }

  return { start, stop };
})();
