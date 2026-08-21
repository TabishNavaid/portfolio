/* ==========================================================================
   panels.js — everything Field Trip puts inside a panel.

   One renderer, three callers: inspecting an object in the world, the map
   directory's accessible view of a room, and the toolbar buttons. Nothing in
   here knows about canvas, movement or collision.
   ========================================================================== */

window.FIELD_TRIP_PANELS = (function () {
  'use strict';

  const C = window.PORTFOLIO;
  const A = window.FIELD_TRIP_ATLAS;

  const esc = (v) =>
    String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const out = (href) => (String(href).startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '');

  const link = (l) =>
    `<a class="ft-link" href="${esc(l.href)}"${out(l.href)}>${esc(l.label)}${
      String(l.href).startsWith('http') ? '<span class="visually-hidden"> (opens in a new tab)</span>' : ''
    }</a>`;

  /* A pixel thumbnail of the thing you just looked at, cut out of the atlas
     with background-position so it stays crisp and costs no extra request. */
  function icon(sprite, scale) {
    if (!sprite) return '';
    const packs = ['rooms', 'town'];
    for (const key of packs) {
      const pack = A[key];
      if (!pack || !pack.frames[sprite]) continue;
      const f = pack.frames[sprite];
      const s = scale || 2;
      const size = frameBounds(pack);
      return (
        `<span class="ft-obj-icon" aria-hidden="true" style="` +
        `width:${f[2] * s}px;height:${f[3] * s}px;` +
        `background-image:url(${window.Modes && window.Modes.asset ? window.Modes.asset(pack.file) : pack.file});` +
        `background-size:${size[0] * s}px ${size[1] * s}px;` +
        `background-position:-${f[0] * s}px -${f[1] * s}px"></span>`
      );
    }
    return '';
  }

  const boundsCache = {};
  function frameBounds(pack) {
    if (!boundsCache[pack.file]) {
      let w = 0;
      let h = 0;
      Object.keys(pack.frames).forEach((k) => {
        const f = pack.frames[k];
        w = Math.max(w, f[0] + f[2]);
        h = Math.max(h, f[1] + f[3]);
      });
      /* the shelf packer's width is fixed; height is the last shelf */
      boundsCache[pack.file] = [pack.width || w, pack.height || h];
    }
    return boundsCache[pack.file];
  }

  /* --- section kinds ----------------------------------------------------- */

  function projectCard(p, lens) {
    const decisions = lens === 'product' ? p.productDecisions : p.engineeringDecisions;
    const links = (p.links || []).map(link);
    if (p.status) links.push(`<span class="ft-missing">${esc(p.status)}</span>`);
    else if (p.missing) links.push(`<span class="ft-missing">${esc(p.missing)}</span>`);
    return `<article class="ft-card">
        <h4>${esc(p.title)}<span>${esc(p.year || '')}</span></h4>
        <p>${esc(p.subtitle)}</p>
        ${decisions && decisions.length
          ? `<p class="ft-card__label">${lens === 'product' ? 'product decisions' : 'engineering decisions'}</p>
             <ul>${decisions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
          : ''}
        <p class="ft-chips">${(p.stack || []).map((x) => `<span>${esc(x)}</span>`).join('')}</p>
        ${links.length ? `<p class="ft-links">${links.join('')}</p>` : ''}
      </article>`;
  }

  function experienceCard(x) {
    return `<article class="ft-card">
        <h4>${esc(x.role)}<span>${esc(x.date)}</span></h4>
        <p>${esc(x.org)}</p>
        <ul>${x.whatIDid.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>
        <p class="ft-card__label">why it mattered</p>
        <p>${esc(x.mattered)}</p>
      </article>`;
  }

  function section(s) {
    switch (s.kind) {
      case 'profile':
        return `<p class="ft-lede">${esc(C.profile.name)}. ${esc(C.profile.taglinePlain)}.</p>
          <p class="ft-status">${esc(C.profile.status)}</p>
          <p>${esc(C.profile.school)} · ${esc(C.profile.classYear)} · ${esc(C.profile.location)}</p>`;
      case 'text':
        return (s.title ? `<h3>${esc(s.title)}</h3>` : '') + `<p>${esc(s.body)}</p>`;
      case 'list':
        return (s.title ? `<p class="ft-card__label">${esc(s.title)}</p>` : '') +
          `<ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
      case 'projects':
        return s.ids.map(C.project).filter(Boolean).map((p) => projectCard(p, s.lens)).join('');
      case 'decisions':
        return s.ids
          .map(C.project)
          .filter(Boolean)
          .map((p) => {
            const items = (s.lens === 'product' ? p.productDecisions : p.engineeringDecisions) || [];
            if (!items.length) return '';
            return `<p class="ft-card__label">${esc(p.title)}</p><ul>${items
              .map((i) => `<li>${esc(i)}</li>`)
              .join('')}</ul>`;
          })
          .join('');
      case 'experience':
        return s.ids.map(C.experience).filter(Boolean).map(experienceCard).join('');
      case 'skills':
        return C.skills
          .map((g) => `<p class="ft-card__label">${esc(g.title)}</p>
             <p class="ft-chips">${g.items.map((i) => `<span>${esc(i)}</span>`).join('')}</p>`)
          .join('');
      case 'education':
        return `<p>${esc(C.profile.degree.replace('&amp;', '&'))}<br />${esc(C.profile.school)}, ${esc(
          C.profile.location
        )} · ${esc(C.profile.classYear)} · GPA ${esc(C.profile.gpa)}</p>
          <p class="ft-card__label">languages</p><p>${esc(C.about.languages)}</p>`;
      case 'awards':
        return `<ul>${C.about.awards.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`;
      case 'contact': {
        const items = [
          { label: C.links.emailPlain, href: C.links.email },
          { label: 'GitHub', href: C.links.github },
          { label: 'LinkedIn', href: C.links.linkedin }
        ];
        if (C.links.resume) items.push({ label: 'résumé', href: C.links.resume });
        return `<p class="ft-links">${items.map(link).join('')}</p>
          <p class="ft-status">${esc(C.contact.status)}</p>`;
      }
      case 'links':
        return `<p class="ft-links">${s.items.map(link).join('')}</p>`;
      case 'visual':
        return s.ids
          .map(C.project)
          .filter((p) => p && p.visual)
          .map(
            (p) => `<figure class="ft-shot">
                <img src="${esc(p.visual.src)}" width="${p.visual.width}" height="${p.visual.height}"
                  alt="${esc(p.visual.alt)}" loading="lazy" decoding="async" />
                <figcaption>${esc(p.title)}</figcaption>
              </figure>`
          )
          .join('');
      case 'return':
        return `<p>the bus at the bottom of the village goes back to the meadow desktop. progress here is saved.</p>
          <p class="ft-links"><a class="ft-link" href="?mode=meadow">return to the desktop</a>
          <a class="ft-link" href="?mode=brief">open the one-page brief</a></p>`;
      default:
        return '';
    }
  }

  const sections = (list) => (list || []).map(section).join('');

  /* --- object panels ------------------------------------------------------ */

  function objectPanel(roomId, objId, sprite) {
    const room = C.town.rooms[roomId];
    const obj = room && room.objects[objId];
    if (!obj || !obj.panel) return null;
    return {
      title: obj.name,
      html:
        `<div class="ft-obj-head">${icon(sprite)}<div><p class="ft-obj-name">${esc(obj.name)}</p>` +
        `<p class="ft-obj-where">${esc(roomLabel(roomId))}</p></div></div>` +
        `<h3>${esc(obj.panel.title)}</h3>` +
        sections(obj.panel.sections)
    };
  }

  function roomLabel(roomId) {
    const loc = C.town.locations.find((l) => l.room === roomId);
    return loc ? loc.label : roomId;
  }

  /* --- the accessible view of a room -------------------------------------- */

  function roomDirectory(roomId, state) {
    const room = C.town.rooms[roomId];
    if (!room) return '';
    const entries = Object.keys(room.objects)
      .map((id) => ({ id: id, obj: room.objects[id] }))
      .filter((e) => e.obj.panel || e.obj.lines || e.obj.action);
    return `<p class="ft-blurb">${esc(room.blurb)}</p>
      <p class="ft-card__label">what is in here</p>
      <ul class="ft-map">
        ${entries
          .map(
            (e) => `<li>
              <button class="ft-map__go" type="button" data-inspect="${esc(roomId)}:${esc(e.id)}">
                <b>${esc(e.obj.name)}</b><small>${esc(
              e.obj.panel ? e.obj.panel.title : e.obj.action === 'arcade' ? 'a game, not a résumé' : 'a look around'
            )}</small>
              </button>
              ${state && state.inspected[roomId + ':' + e.id] ? '<span class="ft-map__seen">seen</span>' : ''}
            </li>`
          )
          .join('')}
      </ul>
      <p class="ft-blurb">${window.FIELD_TRIP_INTERIORS && window.FIELD_TRIP_INTERIORS[roomId]
        ? 'everything above opens without walking. to walk to it instead, close this and head for the door.'
        : 'everything above opens without walking. to walk to it instead, close this and go and stand next to it.'}</p>`;
  }

  /* --- toolbar panels ----------------------------------------------------- */

  function mapHtml(state) {
    return `<h3>map directory</h3>
      <p class="ft-blurb">${esc(C.town.intro)} every room opens here as text, with the same objects you would find inside.</p>
      <ul class="ft-map">
        ${C.town.locations
          .map(
            (l) => `<li>
              <button class="ft-map__go" type="button" data-go="${esc(l.id)}">
                <b>${esc(l.label)}</b><small>${esc(l.short)}</small>
              </button>
              ${state.visited[l.id] ? '<span class="ft-map__seen">visited</span>' : ''}
            </li>`
          )
          .join('')}
      </ul>
      <p class="ft-credit">pixel art from packs by shubibubi and the Character v.2 pack, cut down for this village.</p>`;
  }

  function questsHtml(state) {
    const quests = C.town.quests;
    const done = quests.filter((q) => state.quests[q.id]).length;
    const all = done === quests.length;
    return `<h3>quest log</h3>
      <p class="ft-blurb">${done} of ${quests.length}. none of it gates anything. the contact details are in the post office either way.</p>
      <ul class="ft-quests">
        ${quests
          .map(
            (q) => `<li data-done="${state.quests[q.id] ? 'true' : 'false'}">
              <span class="ft-quests__box" aria-hidden="true">${state.quests[q.id] ? '✓' : ''}</span>
              <span><b>${esc(q.label)}</b><small>${esc(q.hint)}</small>
                <span class="visually-hidden">${state.quests[q.id] ? 'done' : 'not done yet'}</span></span>
            </li>`
          )
          .join('')}
      </ul>
      ${all ? `<p class="ft-reward">${esc(C.town.reward)}</p>` : ''}`;
  }

  function menuHtml(state) {
    return `<h3>menu</h3>
      <div class="ft-menu">
        <button class="ft-menu__b" type="button" data-menu="resume">resume</button>
        <button class="ft-menu__b" type="button" data-menu="map">map directory</button>
        <button class="ft-menu__b" type="button" data-menu="quests">quest log</button>
        <button class="ft-menu__b" type="button" data-menu="hint">show the controls again</button>
        <button class="ft-menu__b" type="button" data-menu="sound">sound: ${state.sound ? 'on' : 'off'}</button>
        <button class="ft-menu__b" type="button" data-menu="night">${state.night ? 'daytime' : 'night'}</button>
        <a class="ft-menu__b" href="?mode=meadow">return to desktop</a>
        <button class="ft-menu__b" type="button" data-menu="switch">switch profile</button>
        <button class="ft-menu__b ft-menu__b--quiet" type="button" data-menu="reset">reset the game</button>
      </div>
      <p class="ft-blurb">${state.touch
        ? 'the pad walks. look reads whatever you are standing next to. the map and this menu are in the bar at the top. doors take you inside; walk back onto the mat to leave.'
        : 'walk with wasd or the arrow keys. e or enter looks at whatever you are standing next to. m opens the map, esc opens this. doors take you inside; walk back onto the mat to leave.'}</p>`;
  }

  return {
    esc: esc,
    icon: icon,
    link: link,
    sections: sections,
    objectPanel: objectPanel,
    roomDirectory: roomDirectory,
    roomLabel: roomLabel,
    mapHtml: mapHtml,
    questsHtml: questsHtml,
    menuHtml: menuHtml
  };
})();
