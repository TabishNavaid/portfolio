/* ========================================================================
   bus-ride.js — a short three-lane trip from Meadow Desktop into the
   purchased pixel-art world. The game uses only the small licensed atlases
   already prepared for Field Trip; none of the source packs are shipped.
   ======================================================================== */

window.BusRide = (function () {
  'use strict';

  const W = 960;
  const H = 540;
  const RUN_MS = 18000;
  const BUS_X = 176;
  const LANES = [322, 407, 492];
  const TOWN_FILE = 'assets/field-trip/town.png';
  const BUS_FILE = 'assets/field-trip/bus.png';
  /* the same key Field Trip reads, through the same store: modes.js owns the
     try/catch for private mode, and the ride has no business repeating it */
  const SOUND_KEY = 'fieldtrip.sound.v1';

  /* The ride draws out of Field Trip's atlas without loading Field Trip. The
     rectangles below are a snapshot of the generated frame table, and
     `syncFrames` replaces them with the real one the moment the town's
     scripts arrive — which is during the ride, because the meadow starts
     loading them as it opens. Repacking the art therefore cannot leave this
     file cutting the wrong rectangle out of a rebuilt sheet. */
  const NAMES = {
    arcade: 'b-arcade', community: 'b-community', house: 'b-house', library: 'b-library',
    market: 'b-market', post: 'b-post', crate: 'crate', fence: 'fence', stone: 'stone',
    treeApple: 'tree-apple', treeCherry: 'tree-cherry', treePine: 'tree-pine',
    bush: 'bush-green', flower: 'flower-orange', grass: 'grass', cobble: 'cobble',
    dirt: 'dirt', lamp: 'lamp'
  };
  const F = {
    arcade: [89, 233, 90, 86], community: [168, 0, 156, 117], house: [341, 233, 92, 78],
    library: [191, 128, 149, 101], market: [0, 0, 167, 127], post: [341, 128, 85, 92],
    crate: [299, 401, 32, 31], fence: [406, 323, 78, 48], stone: [406, 446, 16, 16],
    treeApple: [184, 401, 32, 32], treeCherry: [250, 401, 32, 32], treePine: [217, 401, 32, 32],
    bush: [372, 446, 16, 16], flower: [474, 446, 16, 16], grass: [76, 446, 16, 16],
    cobble: [110, 446, 16, 16], dirt: [93, 446, 16, 16], lamp: [283, 401, 15, 31]
  };

  function syncFrames() {
    const atlas = window.FIELD_TRIP_ATLAS;
    if (!atlas || !atlas.town) return;
    Object.keys(NAMES).forEach((key) => {
      const frame = atlas.town.frames[NAMES[key]];
      if (frame) F[key] = frame;
    });
  }

  /* One owner for every bit of round state makes stop() able to tear the ride
     down completely before Meadow or Field Trip takes the screen. */
  let root = null;
  let canvas = null;
  let ctx = null;
  let controller = null;
  let raf = null;
  let last = 0;
  let phase = 'intro';
  let elapsed = 0;
  let spawnIn = 0;
  let worldOffset = 0;
  let lane = 1;
  let busY = LANES[1];
  let obstacles = [];
  let options = null;
  let leaveTimer = null;
  let town = null;
  let bus = null;
  let soundOn = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  const SHELL = `
    <div class="bus-ride" role="dialog" aria-modal="true" aria-labelledby="busRideTitle">
      <div class="bus-ride__cab">
        <header class="bus-ride__bar">
          <span class="bus-ride__route">MEADOW  →  TABISH TOWN</span>
          <span class="bus-ride__bar-actions">
            <button class="bus-ride__skip" type="button" data-bus="sound" aria-pressed="false">sound: off</button>
            <button class="bus-ride__skip" type="button" data-bus="skip">skip the ride</button>
          </span>
        </header>
        <div class="bus-ride__hud" aria-hidden="true">
          <span>next stop: the pixel world</span>
          <span class="bus-ride__meter"><i id="busRideMeter"></i></span>
          <b id="busRidePercent">0%</b>
        </div>
        <div class="bus-ride__screen">
          <canvas class="bus-ride__canvas" width="960" height="540" role="img"
            aria-label="A pixel-art bus changing between three lanes while travelling to town."></canvas>
          <div class="bus-ride__overlay" id="busRideOverlay"></div>
          <p class="bus-ride__announce visually-hidden" aria-live="polite" id="busRideAnnounce"></p>
        </div>
        <footer class="bus-ride__deck">
          <button class="bus-ride__lane" type="button" data-bus="left" aria-label="Move bus one lane up">← lane</button>
          <p><b>three lanes,</b> and a road somebody has left their luggage all over. get to town without hitting any of it.</p>
          <button class="bus-ride__lane" type="button" data-bus="right" aria-label="Move bus one lane down">lane →</button>
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

  function intro() {
    phase = 'intro';
    overlay(`
      <div class="bus-ride__card">
        <p class="bus-ride__eyebrow">route 03 · pixel service</p>
        <h1 id="busRideTitle">next stop: field trip</h1>
        <p>Change lanes, dodge the luggage, and watch the meadow turn into Tabish Town.</p>
        <p class="bus-ride__keys">← → or A D · ↑ ↓ work too</p>
        <div class="bus-ride__actions">
          <button class="bus-ride__primary" type="button" data-bus="start">start the ride</button>
          <button type="button" data-bus="cancel">stay in the meadow</button>
        </div>
      </div>`);
    root.querySelector('[data-bus="start"]')?.focus({ preventScroll: true });
  }

  function reducedIntro() {
    phase = 'intro';
    overlay(`
      <div class="bus-ride__card">
        <p class="bus-ride__eyebrow">route 03 · pixel service</p>
        <h1 id="busRideTitle">the bus is ready</h1>
        <p>The moving road is paused because reduced motion is on.</p>
        <div class="bus-ride__actions">
          <button class="bus-ride__primary" type="button" data-bus="skip">continue to field trip</button>
          <button type="button" data-bus="cancel">stay in the meadow</button>
        </div>
      </div>`);
    root.querySelector('[data-bus="skip"]')?.focus({ preventScroll: true });
  }

  function reset() {
    elapsed = 0;
    spawnIn = 900;
    worldOffset = 0;
    lane = 1;
    busY = LANES[lane];
    obstacles = [];
    updateHud();
  }

  function startRound() {
    reset();
    phase = 'playing';
    hideOverlay();
    announce('The pixel bus has left the meadow.');
    if (soundOn && window.PortfolioSound) window.PortfolioSound.startRide();
    last = performance.now();
    wake();
  }

  function move(by) {
    if (phase !== 'playing') return;
    const next = clamp(lane + by, 0, 2);
    if (next === lane) return;
    lane = next;
    if (soundOn && window.PortfolioSound) window.PortfolioSound.rideSfx('lane');
    announce(lane === 0 ? 'Top lane' : lane === 1 ? 'Middle lane' : 'Bottom lane');
  }

  function spawnObstacle() {
    const difficulty = elapsed / RUN_MS;
    const types = ['crate', 'stone', 'fence'];
    /* Pick the escape lane first, then populate at most the other two. This
       keeps every wave possible even near the end of the run. */
    const open = Math.floor(Math.random() * 3);
    const count = difficulty > 0.42 && Math.random() < 0.42 ? 2 : 1;
    const blocked = [0, 1, 2].filter((x) => x !== open);
    if (count === 1) blocked.splice(Math.floor(Math.random() * blocked.length), 1);
    blocked.forEach((which, i) => obstacles.push({ lane: which, x: W + 90 + i * 36, type: types[Math.floor(Math.random() * types.length)] }));
  }

  function updateHud() {
    if (!root) return;
    const progress = clamp(elapsed / RUN_MS, 0, 1);
    const meter = root.querySelector('#busRideMeter');
    const percent = root.querySelector('#busRidePercent');
    if (meter) meter.style.width = Math.round(progress * 100) + '%';
    if (percent) percent.textContent = Math.round(progress * 100) + '%';
  }

  function crash() {
    phase = 'crashed';
    cancelFrame();
    if (soundOn && window.PortfolioSound) window.PortfolioSound.rideSfx('crash');
    announce('The bus bumped into some luggage.');
    root.classList.add('is-crashed');
    overlay(`
      <div class="bus-ride__card bus-ride__card--crash">
        <p class="bus-ride__eyebrow">tiny detour</p>
        <h1 id="busRideTitle">bonk.</h1>
        <p>Everyone is fine. The suitcase has learned nothing.</p>
        <div class="bus-ride__actions">
          <button class="bus-ride__primary" type="button" data-bus="again">try the road again</button>
          <button type="button" data-bus="skip">go straight to field trip</button>
        </div>
      </div>`);
    root.querySelector('[data-bus="again"]')?.focus({ preventScroll: true });
  }

  function finish() {
    phase = 'arrived';
    elapsed = RUN_MS;
    updateHud();
    if (soundOn && window.PortfolioSound) window.PortfolioSound.rideSfx('arrive');
    announce('The bus reached Tabish Town.');
    overlay(`
      <div class="bus-ride__card bus-ride__card--arrive">
        <p class="bus-ride__eyebrow">route complete</p>
        <h1 id="busRideTitle">welcome to town</h1>
        <p>Mind the tiny gap between the bus and the pixel world.</p>
      </div>`);
    leaveTimer = setTimeout(arrive, 950);
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

  function update(dt) {
    if (phase !== 'playing') return;
    const ms = dt * 1000;
    elapsed += ms;
    worldOffset = (worldOffset + dt * (150 + 70 * elapsed / RUN_MS)) % 128;
    spawnIn -= ms;
    /* A wave always leaves one lane open. Do not release the next wave until
       the previous one is behind the bus: two individually fair waves used
       to overlap and accidentally wall off all three lanes. */
    const lastObstacleX = obstacles.length ? Math.max(...obstacles.map((o) => o.x)) : -Infinity;
    const roadIsClear = !obstacles.length || lastObstacleX < BUS_X - 150;
    if (spawnIn <= 0 && roadIsClear) {
      spawnObstacle();
      spawnIn = rnd(420, 620);
    }
    busY += (LANES[lane] - busY) * Math.min(1, dt * 12);
    const speed = 245 + 105 * (elapsed / RUN_MS);
    obstacles.forEach((o) => { o.x -= speed * dt; });
    for (const o of obstacles) {
      if (o.lane === lane && Math.abs(o.x - BUS_X) < (o.type === 'fence' ? 72 : 52)) { crash(); return; }
    }
    obstacles = obstacles.filter((o) => o.x > -120);
    updateHud();
    if (elapsed >= RUN_MS) finish();
  }

  function sprite(image, frame, x, y, scale, anchorBottom) {
    if (!image || !frame) return;
    const [sx, sy, sw, sh] = frame;
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);
    ctx.drawImage(image, sx, sy, sw, sh, Math.round(x - dw / 2), Math.round(y - (anchorBottom ? dh : dh / 2)), dw, dh);
  }

  function drawWorld() {
    ctx.fillStyle = '#9bd7ed'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#dff1d1'; ctx.fillRect(0, 145, W, 128);
    ctx.fillStyle = '#79ad68'; ctx.fillRect(0, 230, W, H - 230);

    const far = -(worldOffset * 0.28);
    const buildings = [F.house, F.post, F.arcade, F.library, F.community, F.market];
    buildings.forEach((frame, i) => {
      const x = ((far + 90 + i * 220) % 1320 + 1320) % 1320 - 100;
      sprite(town, frame, x, 257, 0.72, true);
    });

    for (let x = -128 + (-(worldOffset * 0.62) % 128); x < W + 128; x += 128) {
      sprite(town, (Math.floor((x + worldOffset) / 128) % 2) ? F.treeApple : F.treePine, x + 42, 285, 1.65, true);
      sprite(town, F.bush, x + 92, 292, 1.4, true);
      sprite(town, F.flower, x + 114, 292, 1.1, true);
    }

    /* Three broad lanes tiled from the purchased cobblestone and dirt cells. */
    for (let row = 0; row < 3; row += 1) {
      const top = 282 + row * 85;
      for (let x = -64 - (worldOffset % 64); x < W + 64; x += 64) {
        for (let yy = top; yy < top + 85; yy += 32) sprite(town, F.cobble, x, yy, 4.05, false);
      }
      ctx.fillStyle = 'rgba(245,226,174,0.62)'; ctx.fillRect(0, top + 82, W, 3);
    }
    ctx.fillStyle = 'rgba(54,76,52,0.2)';
    for (let x = -100 + (-(worldOffset * 1.35) % 100); x < W; x += 100) ctx.fillRect(x, 300, 48, 4);
  }

  function drawObstacle(o) {
    const y = LANES[o.lane] + 26;
    if (o.type === 'crate') sprite(town, F.crate, o.x, y, 2.1, true);
    else if (o.type === 'stone') sprite(town, F.stone, o.x, y, 3.2, true);
    else sprite(town, F.fence, o.x, y + 4, 1.25, true);
  }

  function drawBus() {
    ctx.fillStyle = 'rgba(33,45,42,0.25)';
    ctx.beginPath(); ctx.ellipse(BUS_X, busY + 28, 65, 12, 0, 0, Math.PI * 2); ctx.fill();
    if (bus) ctx.drawImage(bus, Math.round(BUS_X - 60), Math.round(busY - 40), 120, 78);
    else {
      ctx.fillStyle = '#5f9db8'; ctx.fillRect(BUS_X - 52, busY - 32, 104, 60);
      ctx.fillStyle = '#e9f3df'; ctx.fillRect(BUS_X - 40, busY - 23, 68, 25);
    }
  }

  function render() {
    if (!ctx) return;
    drawWorld();
    obstacles.slice().sort((a, b) => a.lane - b.lane).forEach(drawObstacle);
    drawBus();
  }

  function loop(now) {
    raf = null;
    if (!root || phase !== 'playing' || document.hidden) return;
    const dt = Math.min(0.045, (now - last) / 1000 || 0);
    last = now;
    update(dt); render();
    if (phase === 'playing') raf = requestAnimationFrame(loop);
  }

  function wake() {
    if (!root || raf || phase !== 'playing' || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function cancelFrame() { if (raf) cancelAnimationFrame(raf); raf = null; }

  function handle(action) {
    if (action === 'left') move(-1);
    else if (action === 'right') move(1);
    else if (action === 'sound') setSound(!soundOn);
    else if (action === 'start' || action === 'again') { root?.classList.remove('is-crashed'); startRound(); }
    else if (action === 'skip') arrive();
    else if (action === 'cancel') cancel();
  }

  async function start(opts) {
    if (root) return;
    options = opts || {};
    soundOn = options.sound === true || window.Prefs.get(SOUND_KEY, false) === true;
    window.Prefs.set(SOUND_KEY, soundOn);
    document.body.insertAdjacentHTML('beforeend', SHELL);
    root = document.querySelector('.bus-ride');
    canvas = root.querySelector('canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    controller = new AbortController();
    const signal = controller.signal;
    paintSoundButton();

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-bus]');
      if (button) handle(button.dataset.bus);
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
    reset(); render();
    if (options.reduceMotion) reducedIntro(); else intro();
  }

  function stop(callCancel) {
    if (!root) return;
    cancelFrame();
    clearTimeout(leaveTimer); leaveTimer = null;
    if (window.PortfolioSound) window.PortfolioSound.stop();
    controller?.abort(); controller = null;
    root.remove(); root = null; canvas = null; ctx = null;
    obstacles = []; phase = 'idle'; town = null; bus = null;
    const cancelled = options && options.onCancel;
    options = null;
    if (callCancel && cancelled) cancelled();
  }

  return { start, stop };
})();
