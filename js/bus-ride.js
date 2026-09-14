/* ========================================================================
   bus-ride.js — the journey between Meadow Desktop and Tabish Town.

   It runs in both directions. Out is meadow, then the edge of town, then
   shopfronts; home is the same scenery in reverse, so the ride reads as a
   round trip rather than as a loading screen with a minigame in it.

   Everything is drawn in a 480 x 270 space and blown up to the 960 x 540
   canvas at exactly 2x. That is the whole reason it looks like pixel art
   now: the previous version scaled the 16px cobble tile by 4.05 and the
   grid came apart. Nothing here is drawn at a fractional scale.

   Layers, back to front: sky, hills, treeline, roadside, verge, road,
   obstacles, bus, near verge. Each has its own parallax, and the roadside
   changes with progress, so you can see the town coming.

   The art is Field Trip's licensed atlas; none of the source packs ship.
   ======================================================================== */

window.BusRide = (function () {
  'use strict';

  /* the drawing space; the canvas is twice this in both directions */
  const W = 480;
  const H = 270;
  const SCALE = 2;

  const RUN_MS = 20000;
  const BUS_X = 88;
  /* three lanes of 36px. The bus sprite is taller than its lane and
     overhangs the neighbours, which is what these games look like. */
  const LANES = [160, 196, 232];
  const ROAD_TOP = 142;
  const ROAD_BOTTOM = 250;
  const VERGE_TOP = 128;

  const TOWN_FILE = 'assets/field-trip/town.png';
  const BUS_FILE = 'assets/field-trip/bus.png';
  const SOUND_KEY = 'fieldtrip.sound.v1';

  /* The ride draws out of Field Trip's atlas without loading Field Trip.
     The rectangles below are a snapshot of the generated frame table, and
     `syncFrames` swaps in the real one the moment the town's scripts
     arrive. Repacking the art cannot leave this file cutting the wrong
     rectangle out of a rebuilt sheet. */
  const NAMES = {
    house: 'b-house', post: 'b-post', pub: 'b-pub', trailer: 'b-trailer',
    arcade: 'b-arcade', forge: 'b-blacksmith',
    crate: 'crate', fence: 'fence', stone: 'stone', railFence: 'rail-fence',
    treeApple: 'tree-apple', treeCherry: 'tree-cherry', treePine: 'tree-pine',
    bush: 'bush-green', bushDark: 'bush-dark', flower: 'flower-orange',
    flowerY: 'flower-yellow', flowerC: 'flower-cream',
    grass: 'grass', cobble: 'cobble', dirt: 'dirt', paving: 'paving',
    lamp: 'lamp', tuft: 'tuft-a', picket: 'picket'
  };
  const F = {
    house: [277, 233, 92, 78], post: [341, 128, 85, 92], pub: [370, 233, 82, 77],
    trailer: [33, 323, 88, 62], arcade: [89, 233, 90, 86], forge: [0, 233, 88, 89],
    crate: [157, 390, 32, 31], fence: [242, 323, 78, 48], stone: [262, 424, 16, 16],
    railFence: [401, 390, 36, 18], treeApple: [42, 390, 32, 32],
    treeCherry: [108, 390, 32, 32], treePine: [75, 390, 32, 32], bush: [228, 424, 16, 16],
    bushDark: [245, 424, 16, 16], flower: [330, 424, 16, 16], flowerY: [347, 424, 16, 16],
    flowerC: [313, 424, 16, 16], grass: [438, 390, 16, 16], cobble: [472, 390, 16, 16],
    dirt: [455, 390, 16, 16], paving: [489, 390, 16, 16], lamp: [141, 390, 15, 31],
    tuft: [0, 424, 16, 16], picket: [136, 441, 48, 15]
  };

  function syncFrames() {
    const atlas = window.FIELD_TRIP_ATLAS;
    if (!atlas || !atlas.town) return;
    Object.keys(NAMES).forEach((key) => {
      const frame = atlas.town.frames[NAMES[key]];
      if (frame) F[key] = frame;
    });
  }

  /* one owner for every bit of round state, so stop() can tear the ride
     down completely before Meadow or Field Trip takes the screen */
  let root = null;
  let canvas = null;
  let ctx = null;
  let controller = null;
  let raf = null;
  let last = 0;
  let phase = 'loading';
  let elapsed = 0;
  let spawnIn = 0;
  let dist = 0;
  let lane = 1;
  let busY = LANES[1];
  let obstacles = [];
  let scenery = [];
  let dust = [];
  let reachable = [0, 1, 2];
  let options = null;
  let homeward = false;
  let leaveTimer = null;
  let town = null;
  let bus = null;
  let soundOn = false;
  let clock = 0;
  let curtain = 1;          // 1 = fully white, fades to 0 on entry
  let curtainTo = 0;
  let shake = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* one seeded stream, so the roadside is the same journey every time */
  let seed = 7;
  function srand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  const spick = (list) => list[Math.floor(srand() * list.length)];

  const SHELL = `
    <div class="bus-ride" role="dialog" aria-modal="true" aria-labelledby="busRideTitle" data-phase="loading">
      <div class="bus-ride__cab">
        <header class="bus-ride__bar">
          <span class="bus-ride__route" id="busRideRoute">MEADOW &rarr; TABISH TOWN</span>
          <span class="bus-ride__bar-actions">
            <button class="bus-ride__skip" type="button" data-bus="sound" aria-pressed="false">sound: off</button>
            <button class="bus-ride__skip" type="button" data-bus="skip">skip the ride</button>
          </span>
        </header>
        <div class="bus-ride__hud" aria-hidden="true">
          <span id="busRideNext">next stop: tabish town</span>
          <span class="bus-ride__meter"><i id="busRideMeter"></i></span>
          <b id="busRidePercent">0%</b>
        </div>
        <div class="bus-ride__screen">
          <canvas class="bus-ride__canvas" width="960" height="540" role="img"
            aria-label="A pixel-art bus changing between three lanes while the meadow turns into a town."></canvas>
          <div class="bus-ride__overlay" id="busRideOverlay"></div>
          <p class="bus-ride__announce visually-hidden" aria-live="polite" id="busRideAnnounce"></p>
        </div>
        <footer class="bus-ride__deck">
          <button class="bus-ride__lane" type="button" data-bus="left" aria-label="Move the bus one lane up">&larr; lane</button>
          <p id="busRideHint">Three lanes and a lot of dropped luggage. Switch lanes to get past it.</p>
          <button class="bus-ride__lane" type="button" data-bus="right" aria-label="Move the bus one lane down">lane &rarr;</button>
        </footer>
      </div>
    </div>`;

  const assetUrl = (src) => (window.Modes && window.Modes.asset ? window.Modes.asset(src) : src);

  function loadImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = assetUrl(src);
    });
  }

  /* --- chrome ----------------------------------------------------------- */

  function setPhase(next) {
    phase = next;
    if (!root) return;
    root.dataset.phase = next;
    /* the lane buttons belong to a bus that is moving. Before the ride
       starts they are not just useless, they are a lie about what the
       screen wants from you. */
    const playing = next === 'playing';
    root.querySelectorAll('[data-bus="left"], [data-bus="right"]').forEach((b) => {
      b.disabled = !playing;
      b.setAttribute('aria-hidden', playing ? 'false' : 'true');
      b.tabIndex = playing ? 0 : -1;
    });
  }

  function overlay(html) {
    const el = root && root.querySelector('#busRideOverlay');
    if (!el) return;
    el.hidden = false;
    el.innerHTML = html;
  }

  function hideOverlay() {
    const el = root && root.querySelector('#busRideOverlay');
    if (el) { el.hidden = true; el.innerHTML = ''; }
  }

  function announce(text) {
    const el = root && root.querySelector('#busRideAnnounce');
    if (el) el.textContent = text;
  }

  function setText(id, text) {
    const el = root && root.querySelector('#' + id);
    if (el) el.textContent = text;
  }

  function paintSoundButton() {
    const button = root && root.querySelector('[data-bus="sound"]');
    if (!button) return;
    button.textContent = `sound: ${soundOn ? 'on' : 'off'}`;
    button.setAttribute('aria-pressed', String(soundOn));
  }

  function setSound(value) {
    soundOn = value;
    window.Prefs.set(SOUND_KEY, soundOn);
    paintSoundButton();
    if (!window.PortfolioSound) return;
    if (soundOn && phase === 'playing') window.PortfolioSound.startRide();
    else window.PortfolioSound.stop();
  }

  const DEST = () => (homeward ? 'the meadow' : 'tabish town');
  const FROM = () => (homeward ? 'tabish town' : 'the meadow');

  /* --- cards ------------------------------------------------------------ */

  function intro() {
    setPhase('intro');
    overlay(`
      <div class="bus-ride__card">
        <p class="bus-ride__eyebrow">route 03 &middot; pixel service</p>
        <h1 id="busRideTitle">next stop: ${DEST()}</h1>
        <p>${homeward
          ? 'Same road, going the other way. The shops thin out and the meadow comes back.'
          : 'Switch lanes to dodge the luggage, and watch the meadow turn into town.'}</p>
        <p class="bus-ride__keys">&larr; &rarr; or A D &middot; &uarr; &darr; work too</p>
        <div class="bus-ride__actions">
          <button class="bus-ride__primary" type="button" data-bus="start">start the ride</button>
          <button type="button" data-bus="cancel">stay in ${FROM()}</button>
        </div>
      </div>`);
    root.querySelector('[data-bus="start"]').focus({ preventScroll: true });
  }

  function reducedIntro() {
    setPhase('intro');
    overlay(`
      <div class="bus-ride__card">
        <p class="bus-ride__eyebrow">route 03 &middot; pixel service</p>
        <h1 id="busRideTitle">the bus is ready</h1>
        <p>The moving road is paused because reduced motion is on. The bus will take you straight there.</p>
        <div class="bus-ride__actions">
          <button class="bus-ride__primary" type="button" data-bus="skip">continue to ${DEST()}</button>
          <button type="button" data-bus="cancel">stay in ${FROM()}</button>
        </div>
      </div>`);
    root.querySelector('[data-bus="skip"]').focus({ preventScroll: true });
  }

  function crash() {
    setPhase('crashed');
    cancelFrame();
    shake = 1;
    if (soundOn && window.PortfolioSound) window.PortfolioSound.rideSfx('crash');
    announce('The bus bumped into some luggage.');
    root.classList.add('is-crashed');
    overlay(`
      <div class="bus-ride__card bus-ride__card--crash">
        <p class="bus-ride__eyebrow">tiny detour</p>
        <h1 id="busRideTitle">bonk.</h1>
        <p>Everyone’s okay. The suitcase is a bit flatter than it was.</p>
        <div class="bus-ride__actions">
          <button class="bus-ride__primary" type="button" data-bus="again">try the road again</button>
          <button type="button" data-bus="skip">go straight to ${DEST()}</button>
        </div>
      </div>`);
    root.querySelector('[data-bus="again"]').focus({ preventScroll: true });
  }

  function finish() {
    setPhase('arrived');
    elapsed = RUN_MS;
    updateHud();
    if (soundOn && window.PortfolioSound) window.PortfolioSound.rideSfx('arrive');
    announce('The bus reached ' + DEST() + '.');
    overlay(`
      <div class="bus-ride__card bus-ride__card--arrive">
        <p class="bus-ride__eyebrow">route complete</p>
        <h1 id="busRideTitle">${homeward ? 'back in the meadow' : 'welcome to town'}</h1>
        <p>${homeward ? 'The desk is where you left it.' : 'Mind the tiny gap between the bus and the pixel world.'}</p>
      </div>`);
    /* draw the curtain up over the last of the road, so the ride hands over
       to the next mode instead of being cut off mid-frame */
    curtainTo = 1;
    wake();
    leaveTimer = setTimeout(arrive, 900);
  }

  function arrive() {
    const done = options && options.onArrive;
    stop(false);
    if (done) done();
  }

  function cancel() {
    const done = options && options.onCancel;
    stop(false);
    if (done) done();
  }

  /* --- the road --------------------------------------------------------- */

  function reset() {
    elapsed = 0;
    dist = 0;
    spawnIn = 1200;
    lane = 1;
    busY = LANES[lane];
    obstacles = [];
    dust = [];
    reachable = [0, 1, 2];
    seed = 7;
    scenery = [];
    updateHud();
  }

  const progress = () => clamp(elapsed / RUN_MS, 0, 1);
  /* px per second in the 480-wide space */
  const speed = () => 118 + 96 * progress();
  /* the gap between waves closes as the ride goes on. The old version
     waited for the road to be completely clear before spawning anything,
     which meant there was never more than one thing on screen. */
  const spawnGap = () => 1150 - 640 * progress();

  /* A wave blocks one lane early on and two later, and never all three.
     `reachable` is the set of lanes the bus can actually be in when the
     wave arrives; the open lane is always chosen from inside it, so every
     wave is passable from wherever the last one left you. */
  function spawnWave() {
    const p = progress();
    const gap = spawnGap();
    const canMove = Math.max(1, Math.floor(gap / 210));
    const allowed = [0, 1, 2].filter((l) => reachable.some((r) => Math.abs(r - l) <= canMove));
    const open = allowed[Math.floor(Math.random() * allowed.length)];

    const blockTwo = p > 0.34 && Math.random() < 0.35 + p * 0.4;
    let blocked = [0, 1, 2].filter((l) => l !== open);
    if (!blockTwo) blocked = [blocked[Math.floor(Math.random() * blocked.length)]];

    const types = p > 0.5 ? ['crate', 'stone', 'fence', 'crate'] : ['crate', 'stone'];
    blocked.forEach((which, i) => {
      obstacles.push({
        lane: which,
        x: W + 40 + i * 14 + Math.random() * 10,
        type: types[Math.floor(Math.random() * types.length)]
      });
    });
    reachable = [open];
  }

  function updateHud() {
    if (!root) return;
    const p = progress();
    const meter = root.querySelector('#busRideMeter');
    const percent = root.querySelector('#busRidePercent');
    if (meter) meter.style.width = Math.round(p * 100) + '%';
    if (percent) percent.textContent = Math.round(p * 100) + '%';
  }

  function move(by) {
    if (phase !== 'playing') return;
    const next = clamp(lane + by, 0, 2);
    if (next === lane) return;
    lane = next;
    if (soundOn && window.PortfolioSound) window.PortfolioSound.rideSfx('lane');
    announce(lane === 0 ? 'Top lane' : lane === 1 ? 'Middle lane' : 'Bottom lane');
  }

  function startRound() {
    reset();
    setPhase('playing');
    hideOverlay();
    root.classList.remove('is-crashed');
    announce('The bus has left ' + FROM() + '.');
    if (soundOn && window.PortfolioSound) window.PortfolioSound.startRide();
    last = performance.now();
    wake();
  }

  /* --- the roadside ------------------------------------------------------
     Three zones, in order of travel: open meadow, the edge of town, then
     shopfronts. Going home runs them backwards. Seeing the buildings thicken
     is the only thing that makes the ride feel like it is going somewhere. */

  function zoneAt(p) {
    const t = homeward ? 1 - p : p;
    if (t < 0.32) return 'meadow';
    if (t < 0.64) return 'edge';
    return 'town';
  }

  /* The verge scrolls at ROADSIDE_P, so the top-up and the sweep have to
     measure in that same space. The old sweep compared against `dist` at 1x
     and drifted further out of step the faster the bus went: scenery was
     binned mid-screen, and past halfway it was binned before it had ever been
     drawn, which left the verge bare for the rest of the run. */
  const ROADSIDE_P = 0.62;
  const ROADSIDE_OFF = 40;
  const roadsideX = (x) => x - dist * ROADSIDE_P - ROADSIDE_OFF;
  /* how far the verge travels over one whole run, for the zone lookup */
  const ROADSIDE_RUN = (RUN_MS / 1000) * 166 * ROADSIDE_P;

  const frameW = (name) => (F[name] ? F[name][2] : 16);

  /* `last` keeps a frontage from ever following a frontage. A row of
     shopfronts shoulder to shoulder is what the town leg used to look like,
     and it reads as a wall rather than a street. */
  function sceneryItem(zone, last) {
    if (zone === 'meadow') {
      const r = srand();
      if (r > 0.86) return { kind: 'tree', frame: spick(['treePine', 'treeApple', 'treeCherry']) };
      if (r > 0.72) return { kind: 'fence', frame: 'railFence' };
      if (r > 0.4) return { kind: 'small', frame: spick(['bush', 'bushDark']) };
      return { kind: 'small', frame: spick(['flower', 'flowerY', 'flowerC', 'tuft']) };
    }
    if (zone === 'edge') {
      const r = srand();
      if (r > 0.88 && last !== 'building') return { kind: 'building', frame: spick(['trailer', 'house']) };
      if (r > 0.58) return { kind: 'tree', frame: 'treeApple' };
      if (r > 0.4) return { kind: 'fence', frame: 'picket' };
      return { kind: 'small', frame: spick(['bush', 'stone', 'flowerY']) };
    }
    /* town: whatever sits between two frontages is the gap you can see */
    if (last === 'building') {
      const r = srand();
      if (r > 0.66) return { kind: 'tree', frame: spick(['treeApple', 'treeCherry']) };
      if (r > 0.44) return { kind: 'lamp', frame: 'lamp' };
      if (r > 0.2) return { kind: 'fence', frame: 'picket' };
      return { kind: 'small', frame: spick(['bush', 'bushDark', 'crate', 'flowerY']) };
    }
    const r = srand();
    if (r > 0.46) return { kind: 'building', frame: spick(['house', 'post', 'pub', 'arcade', 'forge', 'trailer']) };
    if (r > 0.32) return { kind: 'lamp', frame: 'lamp' };
    if (r > 0.16) return { kind: 'fence', frame: 'picket' };
    return { kind: 'small', frame: spick(['crate', 'bush']) };
  }

  /* the ground left after the piece we just placed, measured from its own
     width, so nothing can be dropped on top of its neighbour */
  function gapAfter(item) {
    const w = frameW(item.frame);
    if (item.kind === 'building') return w + 30 + srand() * 34;
    if (item.kind === 'tree') return w + 6 + srand() * 22;
    if (item.kind === 'fence') return w - 1;          /* pickets run on into a fence */
    return w + 8 + srand() * 20;
  }

  function topUpScenery() {
    const tail = scenery.length ? scenery[scenery.length - 1] : null;
    let cursor = tail ? tail.next : dist * ROADSIDE_P + ROADSIDE_OFF;
    let last = tail ? tail.kind : null;
    while (roadsideX(cursor) < W + 240) {
      const zone = zoneAt(clamp((cursor - ROADSIDE_OFF) / ROADSIDE_RUN, 0, 1));
      const placed = Object.assign(
        { x: cursor, jitter: Math.round(srand() * 5) },
        sceneryItem(zone, last)
      );
      placed.next = cursor + gapAfter(placed);
      scenery.push(placed);
      cursor = placed.next;
      last = placed.kind;
    }
    /* nothing is dropped until it is properly clear of the left edge */
    while (scenery.length && roadsideX(scenery[0].x) + frameW(scenery[0].frame) < -24) scenery.shift();
  }

  /* --- update ------------------------------------------------------------ */

  function update(dt) {
    clock += dt;
    curtain += (curtainTo - curtain) * Math.min(1, dt * 5.5);
    shake = Math.max(0, shake - dt * 4);
    if (phase !== 'playing') return;

    const ms = dt * 1000;
    elapsed += ms;
    const v = speed();
    dist += v * dt;
    topUpScenery();

    spawnIn -= ms;
    if (spawnIn <= 0) {
      spawnWave();
      spawnIn = spawnGap();
    }

    busY += (LANES[lane] - busY) * Math.min(1, dt * 13);

    obstacles.forEach((o) => { o.x -= v * dt; });
    for (const o of obstacles) {
      const half = o.type === 'fence' ? 34 : o.type === 'crate' ? 22 : 15;
      if (o.lane === lane && Math.abs(o.x - BUS_X) < half + 26 && Math.abs(busY - LANES[o.lane]) < 16) {
        crash();
        return;
      }
    }
    obstacles = obstacles.filter((o) => o.x > -70);

    /* grit off the back wheels */
    if (!options.reduceMotion && Math.random() < 0.55) {
      dust.push({ x: BUS_X - 26, y: busY + 20 + rnd(-3, 3), life: 1, vx: -rnd(40, 90) });
    }
    dust.forEach((d) => { d.x += d.vx * dt; d.life -= dt * 2.2; });
    dust = dust.filter((d) => d.life > 0);

    updateHud();
    if (elapsed >= RUN_MS) finish();
  }

  /* --- render ------------------------------------------------------------ */

  function sprite(frame, x, y, anchorBottom) {
    if (!town || !frame) return;
    const [sx, sy, sw, sh] = frame;
    ctx.drawImage(town, sx, sy, sw, sh, Math.round(x), Math.round(y - (anchorBottom ? sh : 0)), sw, sh);
  }

  function tileRow(frame, y, h, offset) {
    if (!town || !frame) return;
    const [sx, sy, sw, sh] = frame;
    const start = -((offset % sw) + sw) % sw;
    for (let x = start; x < W; x += sw) {
      for (let yy = y; yy < y + h; yy += sh) {
        const clip = Math.min(sh, y + h - yy);
        ctx.drawImage(town, sx, sy, sw, clip, Math.round(x), Math.round(yy), sw, clip);
      }
    }
  }

  function drawSky() {
    const p = progress();
    const warm = homeward ? 1 - p : p;
    const g = ctx.createLinearGradient(0, 0, 0, VERGE_TOP);
    g.addColorStop(0, mix('#bce6f7', '#a9d3ef', warm));
    g.addColorStop(0.62, mix('#e2f3f8', '#ffe2c2', warm));
    g.addColorStop(1, mix('#eef7e6', '#ffeed6', warm));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, VERGE_TOP);

    /* clouds, barely moving */
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    for (let i = 0; i < 4; i += 1) {
      const cx = ((i * 151 - dist * 0.05) % 620 + 620) % 620 - 70;
      const cy = 16 + i * 13;
      puff(cx, cy, 26 + i * 5);
    }

    /* two ridges of hills */
    hills(0.14, 96, '#9dbb8c');
    hills(0.24, 108, '#86a877');
  }

  function puff(x, y, r) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.6, y + 3, r * 0.62, r * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(x - r * 0.62, y + 4, r * 0.5, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function hills(parallax, baseY, colour) {
    const off = dist * parallax;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 40);
    for (let x = 0; x <= W; x += 8) {
      const t = (x + off) * 0.014;
      ctx.lineTo(x, baseY - Math.sin(t) * 11 - Math.sin(t * 0.43 + 1.7) * 7);
    }
    ctx.lineTo(W, baseY + 40);
    ctx.closePath();
    ctx.fill();
  }

  function drawTreeline() {
    const off = dist * 0.34;
    const start = -((off % 26) + 26) % 26;
    for (let x = start, i = Math.floor(off / 26); x < W + 32; x += 26, i += 1) {
      const k = i % 5;
      sprite(F[k === 3 ? 'treeApple' : k === 4 ? 'treeCherry' : 'treePine'], x, 112 + (i % 3), true);
    }
    ctx.fillStyle = 'rgba(120, 150, 104, 0.28)';
    ctx.fillRect(0, 108, W, 22);
  }

  function drawRoadside() {
    /* the strip the roadside stands on */
    tileRow(F.grass, VERGE_TOP - 16, 30, dist * 0.62);
    scenery.forEach((item) => {
      const x = roadsideX(item.x);
      if (x + frameW(item.frame) < -8 || x > W + 8) return;
      const y = VERGE_TOP + 2 + (item.jitter % 3);
      if (item.kind === 'building') sprite(F[item.frame], x, y, true);
      else if (item.kind === 'tree') sprite(F[item.frame], x, y - 2, true);
      else if (item.kind === 'lamp') sprite(F[item.frame], x, y, true);
      else if (item.kind === 'fence') sprite(F[item.frame], x, y, true);
      else sprite(F[item.frame], x, y, true);
    });
  }

  function drawRoad() {
    const off = dist;
    /* kerbs top and bottom, carriageway between */
    tileRow(F.paving, ROAD_TOP - 6, 6, off);
    tileRow(F.cobble, ROAD_TOP, ROAD_BOTTOM - ROAD_TOP, off);
    tileRow(F.paving, ROAD_BOTTOM, 6, off);

    /* lane dividers: a dashed line on the two seams, not on the outside */
    ctx.fillStyle = 'rgba(250, 240, 210, 0.72)';
    for (let s = 0; s < 2; s += 1) {
      const y = ROAD_TOP + 36 * (s + 1) - 1;
      for (let x = -((off * 1) % 40); x < W; x += 40) ctx.fillRect(Math.round(x), y, 18, 2);
    }
    /* a soft darkening at the road edges so the lanes read as a surface */
    const shade = ctx.createLinearGradient(0, ROAD_TOP, 0, ROAD_BOTTOM);
    shade.addColorStop(0, 'rgba(40, 52, 44, 0.24)');
    shade.addColorStop(0.22, 'rgba(40, 52, 44, 0)');
    shade.addColorStop(0.8, 'rgba(40, 52, 44, 0)');
    shade.addColorStop(1, 'rgba(40, 52, 44, 0.22)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, ROAD_TOP, W, ROAD_BOTTOM - ROAD_TOP);
  }

  function drawNearVerge() {
    tileRow(F.grass, ROAD_BOTTOM + 6, H - ROAD_BOTTOM - 6, dist * 1.3);
    const off = dist * 1.3;
    const start = -((off % 48) + 48) % 48;
    for (let x = start, i = Math.floor(off / 48); x < W + 20; x += 48, i += 1) {
      sprite(F[i % 3 === 0 ? 'flowerC' : i % 3 === 1 ? 'bush' : 'tuft'], x, H - 2, true);
    }
  }

  function shadow(x, y, rx, ry) {
    ctx.fillStyle = 'rgba(30, 44, 36, 0.26)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawObstacle(o) {
    const y = LANES[o.lane] + 15;
    if (o.type === 'crate') { shadow(o.x, y + 1, 17, 5); sprite(F.crate, o.x - 16, y + 4, true); }
    else if (o.type === 'stone') { shadow(o.x, y + 1, 11, 4); sprite(F.stone, o.x - 8, y + 4, true); }
    else { shadow(o.x, y + 2, 32, 6); sprite(F.fence, o.x - 39, y + 8, true); }
  }

  function drawBus() {
    const bob = options.reduceMotion ? 0 : Math.round(Math.sin(clock * 11) * 0.9);
    shadow(BUS_X, busY + 22, 36, 7);
    dust.forEach((d) => {
      ctx.fillStyle = `rgba(214, 196, 156, ${d.life * 0.5})`;
      const s = Math.round(1 + d.life * 2);
      ctx.fillRect(Math.round(d.x), Math.round(d.y), s, s);
    });
    if (bus) ctx.drawImage(bus, Math.round(BUS_X - 40), Math.round(busY - 30 + bob), 80, 52);
    else {
      ctx.fillStyle = '#5f9db8';
      ctx.fillRect(BUS_X - 36, busY - 22, 72, 42);
    }
  }

  function render() {
    if (!ctx) return;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    if (shake > 0 && !options.reduceMotion) {
      ctx.translate(Math.round(Math.sin(shake * 40) * shake * 4), 0);
    }
    ctx.imageSmoothingEnabled = false;
    drawSky();
    drawTreeline();
    drawRoadside();
    drawRoad();
    obstacles.slice().sort((a, b) => a.lane - b.lane).forEach(drawObstacle);
    drawBus();
    drawNearVerge();
    if (curtain > 0.004) {
      ctx.fillStyle = `rgba(253, 250, 242, ${clamp(curtain, 0, 1)})`;
      ctx.fillRect(-20, 0, W + 40, H);
    }
  }

  /* --- colour ------------------------------------------------------------ */

  function mix(a, b, t) {
    const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
    return `rgb(${Math.round(lerp(pa[0], pb[0], t))}, ${Math.round(lerp(pa[1], pb[1], t))}, ${Math.round(lerp(pa[2], pb[2], t))})`;
  }

  /* --- loop --------------------------------------------------------------- */

  function loop(now) {
    raf = null;
    if (!root || document.hidden) return;
    const dt = Math.min(0.045, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    render();
    /* keep drawing through the fades and the crash shake, not only while playing */
    if (phase === 'playing' || curtain > 0.004 || Math.abs(curtainTo - curtain) > 0.004 || shake > 0) {
      raf = requestAnimationFrame(loop);
    }
  }

  function wake() {
    if (!root || raf || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function cancelFrame() { if (raf) cancelAnimationFrame(raf); raf = null; }

  function handle(action) {
    if (action === 'left') move(-1);
    else if (action === 'right') move(1);
    else if (action === 'sound') setSound(!soundOn);
    else if (action === 'start' || action === 'again') startRound();
    else if (action === 'skip') arrive();
    else if (action === 'cancel') cancel();
  }

  /* --- start and stop ------------------------------------------------------ */

  async function start(opts) {
    if (root) return;
    options = opts || {};
    homeward = options.direction === 'meadow';
    soundOn = options.sound === true || window.Prefs.get(SOUND_KEY, false) === true;
    window.Prefs.set(SOUND_KEY, soundOn);
    document.body.insertAdjacentHTML('beforeend', SHELL);
    root = document.querySelector('.bus-ride');
    canvas = root.querySelector('canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    controller = new AbortController();
    const signal = controller.signal;
    clock = 0;
    /* the meadow hands over mid-fade, so the ride opens under a curtain and
       lifts it rather than cutting straight to a road */
    curtain = 1;
    curtainTo = 0;
    shake = 0;
    setPhase('loading');
    paintSoundButton();

    setText('busRideRoute', homeward ? 'TABISH TOWN → MEADOW' : 'MEADOW → TABISH TOWN');
    setText('busRideNext', 'next stop: ' + DEST());
    setText('busRideHint', homeward
      ? 'Same three lanes on the way back, and the luggage is still there.'
      : 'Three lanes and a lot of dropped luggage. Switch lanes to get past it.');

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-bus]');
      if (button && !button.disabled) handle(button.dataset.bus);
    }, { signal });
    window.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowUp', 'a', 'A', 'w', 'W'].includes(event.key)) { event.preventDefault(); move(-1); }
      else if (['ArrowRight', 'ArrowDown', 'd', 'D', 's', 'S'].includes(event.key)) { event.preventDefault(); move(1); }
      else if ((event.key === 'Enter' || event.key === ' ') && phase === 'intro') { event.preventDefault(); startRound(); }
      else if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    }, { signal, capture: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); }, { signal });

    syncFrames();
    if (window.Modes && window.Modes.prepare) {
      window.Modes.prepare('field-trip').then(syncFrames, () => {});
    }
    [town, bus] = await Promise.all([loadImage(TOWN_FILE), loadImage(BUS_FILE)]);
    if (!root) return;
    syncFrames();
    reset();
    topUpScenery();
    render();
    wake();
    if (options.reduceMotion) reducedIntro(); else intro();
  }

  function stop(callCancel) {
    if (!root) return;
    cancelFrame();
    clearTimeout(leaveTimer); leaveTimer = null;
    if (window.PortfolioSound) window.PortfolioSound.stop();
    if (controller) controller.abort();
    controller = null;
    root.remove(); root = null; canvas = null; ctx = null;
    obstacles = []; scenery = []; dust = [];
    phase = 'idle'; town = null; bus = null;
    const cancelled = options && options.onCancel;
    options = null;
    if (callCancel && cancelled) cancelled();
  }

  return { start, stop };
})();
