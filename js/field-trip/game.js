/* ==========================================================================
   game.js — Field Trip

   One scene engine, two kinds of scene: the town outside and the rooms
   inside. Both are tile grids with collision, a camera, sorted sprites and
   the same interaction rules, so a building is a place rather than a button.

     - A door leads to a room. Objects inside the room open panels.
     - Everything a room contains is also listed in the map directory, so
       nothing professional depends on being able to walk.
     - The loop stops when the tab is hidden, a panel is open, the arcade is
       running, or the mode is switched away.
     - Nothing plays a sound until somebody turns sound on.
     - Content comes from js/content.js; panels from js/field-trip/panels.js.

     1  setup and assets
     2  scenes: build the town, build a room
     3  input
     4  update
     5  render
     6  interaction, panels and transitions
     7  save and quests
     8  start / stop
   ========================================================================== */

window.FieldTrip = (function () {
  'use strict';

  const C = window.PORTFOLIO;
  const W = window.FIELD_TRIP_WORLD;
  const R = window.FIELD_TRIP_INTERIORS;
  const A = window.FIELD_TRIP_ATLAS;
  const P = window.FIELD_TRIP_PANELS;
  const store = window.Prefs;

  const TILE = 16;
  const SPEED = 74;
  const FRAME_MS = 110;
  const KEYS = {
    save: 'fieldtrip.save.v2',
    sound: 'fieldtrip.sound.v1',
    time: 'meadow.time.v2'
  };

  const esc = P.esc;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');

  /* 1 ------------------------------------------------------ setup + assets */

  const SHELL = `
    <div class="ft-app" id="gameApp" tabindex="-1">
      <h1 class="visually-hidden">Field Trip: a walkable village holding Tabish Navaid's work</h1>
      <div class="ft-bar">
        <span class="ft-bar__title" id="ftWhere">field-trip.exe</span>
        <div class="ft-bar__tools">
          <button class="ft-tool" type="button" data-act="map">map</button>
          <button class="ft-tool" type="button" data-act="quests">quests</button>
          <button class="ft-tool" type="button" data-act="pause">menu</button>
          <a class="ft-tool ft-tool--return" href="?mode=meadow" aria-label="Return to Meadow Desktop"
            title="Return to Meadow Desktop"><span class="ft-tool__long">return to desktop</span>
            <span class="ft-tool__icon" aria-hidden="true">⌂</span></a>
        </div>
      </div>

      <div class="ft-stage" id="ftStage">
        <canvas class="ft-canvas" id="ftCanvas" role="img"
          aria-label="A top-down pixel town you can walk around. The map button reads every location as text."></canvas>

        <p class="ft-load" id="ftLoad">loading the town…</p>
        <div class="ft-fade" id="ftFade" aria-hidden="true"></div>
        <p class="ft-prompt" id="ftPrompt" hidden></p>

        <div class="ft-say" id="ftSay" hidden>
          <p class="ft-say__who" id="ftSayWho"></p>
          <p class="ft-say__line" id="ftSayLine"></p>
          <p class="ft-say__more">space / tap to continue</p>
        </div>

        <p class="ft-toast" id="ftToast" role="status" aria-live="polite"></p>

        <div class="ft-touch" id="ftTouch" hidden>
          <div class="ft-dpad" role="group" aria-label="Move">
            <button class="ft-dpad__b ft-dpad__up" type="button" data-move="up" aria-label="Walk north">▲</button>
            <button class="ft-dpad__b ft-dpad__left" type="button" data-move="left" aria-label="Walk west">◀</button>
            <button class="ft-dpad__b ft-dpad__right" type="button" data-move="right" aria-label="Walk east">▶</button>
            <button class="ft-dpad__b ft-dpad__down" type="button" data-move="down" aria-label="Walk south">▼</button>
          </div>
          <button class="ft-action" type="button" data-act="interact" aria-label="Look at what is in front of you">look</button>
        </div>

        <p class="ft-hint" id="ftHint" hidden></p>
        <div class="ft-arcade" id="ftArcade" hidden></div>
      </div>

      <dialog class="ft-sheet" id="ftSheet" aria-labelledby="ftSheetTitle">
        <div class="ft-sheet__bar">
          <span class="ft-sheet__title" id="ftSheetTitle"></span>
          <button class="ft-sheet__close" type="button" data-close aria-label="Close">[ x ]</button>
        </div>
        <div class="ft-sheet__body" id="ftSheetBody" tabindex="-1"></div>
      </dialog>
    </div>`;

  const images = {};
  let assetsOk = false;

  const assetUrl = (src) => (window.Modes && window.Modes.asset ? window.Modes.asset(src) : src);

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', () => reject(new Error('could not load ' + src)));
      img.src = assetUrl(src);
    });
  }

  /* every sprite name resolves to one of the three packs */
  function frameOf(name) {
    if (A.town.frames[name]) return { img: images.town, f: A.town.frames[name] };
    if (A.rooms.frames[name]) return { img: images.rooms, f: A.rooms.frames[name] };
    return null;
  }

  const spriteSize = (name) => {
    const hit = frameOf(name);
    return hit ? { w: hit.f[2], h: hit.f[3] } : { w: TILE, h: TILE };
  };

  /* 2 ---------------------------------------------------------------- scenes */
  /* A scene is { kind, id, cols, rows, ground[], solid, drawables[], hotspots[],
     npcs[], exit } and the rest of the engine only ever talks to this shape. */

  let scene = null;

  const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function blankScene(kind, id, cols, rows) {
    return {
      kind: kind,
      id: id,
      cols: cols,
      rows: rows,
      ground: new Array(cols * rows).fill('grass'),
      solid: new Uint8Array(cols * rows),
      drawables: [],
      hotspots: [],
      npcs: [],
      exit: null,
      tint: null,
      plaques: []
    };
  }

  function mark(sc, tx, ty, w, h, value) {
    for (let y = Math.floor(ty); y < ty + h; y += 1) {
      for (let x = Math.floor(tx); x < tx + w; x += 1) {
        if (x >= 0 && x < sc.cols && y >= 0 && y < sc.rows) sc.solid[y * sc.cols + x] = value === undefined ? 1 : value;
      }
    }
  }

  /* Collision defaults to the bottom of a sprite's footprint, which is what
     reads as "you can walk behind the top of it". */
  function footprint(sc, sprite, at, override, pass) {
    if (pass) return;
    if (override) { mark(sc, override[0], override[1], override[2], override[3]); return; }
    const size = spriteSize(sprite);
    const w = Math.max(1, Math.round(size.w / TILE));
    const h = Math.max(1, Math.round(size.h / TILE));
    const top = at[1] + h * 0.45;
    mark(sc, Math.floor(at[0]), Math.floor(top), w, Math.max(1, Math.ceil(at[1] + h - top)));
  }

  function push(sc, sprite, px, py, extra) {
    const size = spriteSize(sprite);
    sc.drawables.push(Object.assign(
      { sprite: sprite, px: px, py: py, w: size.w, h: size.h, base: py + size.h },
      extra || {}
    ));
  }

  function buildTown() {
    const sc = blankScene('town', 'town', W.cols, W.rows);

    W.ground.forEach((step) => {
      if (step.fill) { sc.ground.fill(step.fill); return; }
      const [x, y, w, h] = step.rect;
      for (let yy = y; yy < y + h; yy += 1) {
        for (let xx = x; xx < x + w; xx += 1) {
          if (xx >= 0 && xx < sc.cols && yy >= 0 && yy < sc.rows) sc.ground[yy * sc.cols + xx] = step.tile;
        }
      }
    });

    const rand = seeded(20260804);
    const decor = ['tuft-a', 'tuft-b', 'tuft-c', 'tuft-d', 'tuft-e', 'flower-cream', 'flower-orange', 'flower-yellow', 'flower-blue'];
    sc.overlay = [];
    for (let i = 0; i < sc.ground.length; i += 1) {
      if (sc.ground[i] !== 'grass' || rand() > 0.075) continue;
      sc.overlay.push([i % sc.cols, Math.floor(i / sc.cols), decor[Math.floor(rand() * decor.length)]]);
    }

    for (let x = 0; x < sc.cols; x += 1) { mark(sc, x, 0, 1, 1); mark(sc, x, sc.rows - 1, 1, 1); }
    for (let y = 0; y < sc.rows; y += 1) { mark(sc, 0, y, 1, 1); mark(sc, sc.cols - 1, y, 1, 1); }
    (W.solids || []).forEach((area) => mark(sc, area[0], area[1], area[2], area[3]));

    W.buildings.forEach((b) => {
      const size = spriteSize(b.sprite);
      const px = Math.round(b.at[0] * TILE);
      const py = Math.round(b.at[1] * TILE);
      push(sc, b.sprite, px, py);
      mark(sc, Math.floor(b.at[0]), Math.floor(b.at[1]), Math.ceil(size.w / TILE), Math.ceil(size.h / TILE));
      if (!b.door) return;
      sc.solid[b.door[1] * sc.cols + b.door[0]] = 0;
      sc.hotspots.push({
        kind: 'door',
        id: b.id,
        cx: b.door[0] * TILE + TILE / 2,
        cy: b.door[1] * TILE + TILE / 2,
        label: b.plaque
      });
      sc.plaques.push({ id: b.id, text: b.plaque, x: px + size.w / 2, y: py + size.h - 2 });
    });

    W.trees.forEach((t) => {
      const size = spriteSize(t[0]);
      push(sc, t[0], t[1] * TILE, t[2] * TILE);
      mark(sc, t[1] + Math.floor(size.w / TILE / 2), t[2] + Math.ceil(size.h / TILE) - 1, 1, 1);
    });

    W.props.forEach((p) => {
      push(sc, p.sprite, Math.round(p.at[0] * TILE), Math.round(p.at[1] * TILE), {
        anim: p.anim, float: p.float, slow: p.slow, flat: p.flat
      });
      if (p.solid) mark(sc, p.solid[0], p.solid[1], p.solid[2], p.solid[3]);
    });

    W.square.forEach((s) => {
      if (s.sprite) {
        push(sc, s.sprite, Math.round(s.at[0] * TILE), Math.round(s.at[1] * TILE));
        footprint(sc, s.sprite, s.at);
      }
      sc.hotspots.push({
        kind: 'object',
        room: s.room || 'square',
        id: s.id,
        sprite: s.sprite,
        cx: s.at[0] * TILE + (s.sprite ? spriteSize(s.sprite).w / 2 : TILE / 2),
        cy: s.at[1] * TILE + (s.sprite ? spriteSize(s.sprite).h : TILE / 2)
      });
    });

    W.npcs.forEach((npc) => {
      sc.npcs.push({ id: npc.id, at: npc.at, dir: npc.dir, room: 'square' });
      sc.hotspots.push({
        kind: 'npc',
        room: 'square',
        id: npc.id,
        cx: npc.at[0] * TILE,
        cy: npc.at[1] * TILE + 10
      });
    });

    if (allDone()) {
      push(sc, 'cat-0', Math.round(W.catSpot[0] * TILE), Math.round(W.catSpot[1] * TILE), {
        anim: ['cat-0', 'cat-1'],
        slow: true
      });
    }

    return sc;
  }

  function buildRoom(id) {
    const spec = R[id];
    if (!spec) return null;
    const sc = blankScene('room', id, spec.cols, spec.rows);
    sc.tint = spec.tint || null;
    sc.neon = !!spec.neon;

    for (let y = 0; y < sc.rows; y += 1) {
      for (let x = 0; x < sc.cols; x += 1) {
        sc.ground[y * sc.cols + x] = y < 2 ? spec.wall : spec.floor;
      }
    }
    /* walls and the outside edge are solid; the doormat is the one gap */
    for (let x = 0; x < sc.cols; x += 1) { mark(sc, x, 0, 1, 2); mark(sc, x, sc.rows - 1, 1, 1); }
    for (let y = 0; y < sc.rows; y += 1) { mark(sc, 0, y, 1, 1); mark(sc, sc.cols - 1, y, 1, 1); }
    sc.solid[spec.exit[1] * sc.cols + spec.exit[0]] = 0;

    sc.exit = { tx: spec.exit[0], ty: spec.exit[1] };
    /* centred in the tile: the doorway is one tile wide and the walking box
       is ten pixels, so an off-centre spawn cannot get out of the room */
    sc.spawn = { x: (spec.spawn[0] + 0.5) * TILE, y: spec.spawn[1] * TILE };

    /* walk-through decor is scenery, not furniture: rugs belong under
       everyone's feet and wall art behind them, so it never y-sorts. */
    (spec.decor || []).forEach((p) => {
      push(sc, p.sprite, Math.round(p.at[0] * TILE), Math.round(p.at[1] * TILE), p.pass ? { flat: true } : null);
      footprint(sc, p.sprite, p.at, p.solid, p.pass);
    });

    (spec.objects || []).forEach((obj) => {
      push(sc, obj.sprite, Math.round(obj.at[0] * TILE), Math.round(obj.at[1] * TILE));
      footprint(sc, obj.sprite, obj.at, obj.solid, obj.pass);
      if (obj.hidden) return;
      const size = spriteSize(obj.sprite);
      sc.hotspots.push({
        kind: 'object',
        room: id,
        id: obj.alias || obj.id,
        sprite: obj.sprite,
        quest: obj.quest,
        cx: obj.at[0] * TILE + size.w / 2,
        cy: obj.at[1] * TILE + size.h
      });
    });

    (spec.npcs || []).forEach((npc) => {
      sc.npcs.push({ id: npc.id, at: npc.at, dir: npc.dir, room: id });
      sc.hotspots.push({ kind: 'npc', room: id, id: npc.id, cx: npc.at[0] * TILE, cy: npc.at[1] * TILE + 10 });
    });

    /* the doormat, so the way out is obvious */
    push(sc, 'rug-green', spec.exit[0] * TILE - 16, spec.exit[1] * TILE - 13, { flat: true });
    sc.hotspots.push({
      kind: 'exit',
      cx: spec.exit[0] * TILE + TILE / 2,
      cy: spec.exit[1] * TILE + TILE / 2
    });

    return sc;
  }

  const blocked = (x, y) => {
    if (!scene) return true;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= scene.cols || ty >= scene.rows) return true;
    return scene.solid[ty * scene.cols + tx] === 1;
  };

  /* 3 ---------------------------------------------------------------- input */

  const held = { up: false, down: false, left: false, right: false };
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  /* 4 --------------------------------------------------------------- update */

  const player = { x: 0, y: 0, dir: 'down', moving: false, frame: 0, frameT: 0 };
  const camera = { x: 0, y: 0 };
  const save = { visited: {}, quests: {}, inspected: {}, town: null, room: null };

  let scale = 3;
  let viewW = 0;
  let viewH = 0;
  let near = null;
  let running = false;
  let ready = false;
  let paused = false;
  let raf = null;
  let lastT = 0;
  let clock = 0;
  let night = false;
  let exitArmed = false;

  const allDone = () => C.town.quests.every((q) => save.quests[q.id]);

  function updatePlayer(dt) {
    let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    let dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    player.moving = !!(dx || dy);
    if (player.moving) hideHint();

    if (player.moving) {
      if (Math.abs(dx) >= Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
      else player.dir = dy > 0 ? 'down' : 'up';

      const step = SPEED * dt;
      const feet = 5;
      const nx = player.x + dx * step;
      if (!blocked(nx - feet, player.y - 3) && !blocked(nx + feet, player.y - 3) &&
          !blocked(nx - feet, player.y) && !blocked(nx + feet, player.y)) player.x = nx;
      const ny = player.y + dy * step;
      if (!blocked(player.x - feet, ny - 3) && !blocked(player.x + feet, ny - 3) &&
          !blocked(player.x - feet, ny) && !blocked(player.x + feet, ny)) player.y = ny;

      player.frameT += dt * 1000;
      if (player.frameT >= FRAME_MS) {
        player.frameT = 0;
        player.frame = (player.frame + 1) % A.walkFrames;
      }
    } else {
      player.frame = 0;
      player.frameT = 0;
    }

    player.x = clamp(player.x, TILE * 0.5, scene.cols * TILE - TILE * 0.5);
    player.y = clamp(player.y, TILE * 0.5, scene.rows * TILE - TILE * 0.5);

    /* stepping onto the mat leaves the room */
    if (scene.kind === 'room' && scene.exit) {
      const onMat = Math.floor(player.x / TILE) === scene.exit.tx && Math.floor(player.y / TILE) === scene.exit.ty;
      if (!onMat) exitArmed = true;
      else if (exitArmed) { exitArmed = false; leaveRoom(); }
    }
  }

  function findNear() {
    if (!ready || !scene) return null;
    const R2 = 24 * 24;
    let best = null;
    let bestD = R2;
    scene.hotspots.forEach((h) => {
      const d = (h.cx - player.x) * (h.cx - player.x) + (h.cy - player.y) * (h.cy - player.y);
      if (d < bestD) { bestD = d; best = h; }
    });
    return best;
  }

  function updateCamera() {
    const worldW = scene.cols * TILE;
    const worldH = scene.rows * TILE;
    camera.x = worldW <= viewW ? Math.round((worldW - viewW) / 2) : Math.round(clamp(player.x - viewW / 2, 0, worldW - viewW));
    camera.y = worldH <= viewH ? Math.round((worldH - viewH) / 2) : Math.round(clamp(player.y - viewH / 2, 0, worldH - viewH));
  }

  /* 5 --------------------------------------------------------------- render */

  let canvas = null;
  let ctx = null;
  let dpr = 1;

  function resize() {
    const stage = document.getElementById('ftStage');
    if (!stage || !canvas) return;
    const box = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(240, Math.floor(box.width));
    const cssH = Math.max(220, Math.floor(box.height));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    scale = cssW >= 900 && cssH >= 460 ? 3 : 2;
    viewW = Math.ceil(cssW / scale);
    viewH = Math.ceil(cssH / scale);
    if (scene) updateCamera();
    if (window.CatCourier && window.CatCourier.resize) window.CatCourier.resize();
  }

  function drawSprite(name, px, py) {
    const hit = frameOf(name);
    if (!hit || !hit.img) return;
    const f = hit.f;
    ctx.drawImage(hit.img, f[0], f[1], f[2], f[3],
      (px - camera.x) * scale, (py - camera.y) * scale, f[2] * scale, f[3] * scale);
  }

  function drawGround() {
    const x0 = Math.max(0, Math.floor(camera.x / TILE));
    const y0 = Math.max(0, Math.floor(camera.y / TILE));
    const x1 = Math.min(scene.cols - 1, Math.ceil((camera.x + viewW) / TILE));
    const y1 = Math.min(scene.rows - 1, Math.ceil((camera.y + viewH) / TILE));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) drawSprite(scene.ground[y * scene.cols + x], x * TILE, y * TILE);
    }
    if (!scene.overlay) return;
    scene.overlay.forEach((o) => {
      if (o[0] < x0 - 1 || o[0] > x1 + 1 || o[1] < y0 - 1 || o[1] > y1 + 1) return;
      drawSprite(o[2], o[0] * TILE, o[1] * TILE);
    });
  }

  function drawCharacter(id, dirRow, frame, px, py) {
    const f = A.chars.frames[id];
    if (!f || !images.chars) return;
    const cols = f[2] / 32;
    const col = Math.min(cols - 1, frame);
    ctx.drawImage(images.chars, f[0] + col * 32, f[1] + dirRow * 32, 32, 32,
      (px - camera.x) * scale, (py - camera.y) * scale, 32 * scale, 32 * scale);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Building names are signage, not a HUD: they fade up as you approach the
     door and fade out again once you have walked past. Every one of them is
     also a row in the map directory, which is where they can all be read at
     once without walking. */
  const PLAQUE_NEAR = TILE * 5;
  const PLAQUE_FAR = TILE * 11;

  function drawPlaques() {
    if (scene.kind !== 'town') return;
    ctx.save();
    ctx.font = '700 12px "Space Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const wide = canvas.width / dpr;
    const high = canvas.height / dpr;
    scene.plaques.forEach((p) => {
      if (!p.text) return;
      const dist = Math.hypot(p.x - player.x, p.y - player.y);
      const alpha = clamp((PLAQUE_FAR - dist) / (PLAQUE_FAR - PLAQUE_NEAR), 0, 1);
      if (alpha <= 0.02) return;
      ctx.globalAlpha = alpha;
      const sx = Math.round((p.x - camera.x) * scale);
      const sy = Math.round((p.y - camera.y) * scale);
      if (sx < -180 || sx > wide + 180 || sy < -10 || sy > high + 40) return;
      const tw = ctx.measureText(p.text).width;
      const bw = tw + 18;
      const bh = 24;
      ctx.fillStyle = night ? '#17233a' : '#fdfaf2';
      ctx.strokeStyle = night ? '#eaf6ff' : '#2d2c29';
      ctx.lineWidth = 2;
      roundRect(sx - bw / 2, sy - bh, bw, bh, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = night ? '#f0f4fb' : '#2d2c29';
      ctx.fillText(p.text, sx, sy - bh / 2 + 1);
      if (save.visited[p.id]) {
        ctx.fillStyle = '#d96e34';
        ctx.beginPath();
        ctx.arc(sx + bw / 2 - 7, sy - bh + 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  function render() {
    if (!ctx || !ready || !assetsOk || !scene) return;
    const wide = canvas.width / dpr;
    const high = canvas.height / dpr;
    ctx.clearRect(0, 0, wide, high);
    ctx.fillStyle = scene.kind === 'room' ? '#1d1a18' : night ? '#223850' : '#9fbd76';
    ctx.fillRect(0, 0, wide, high);

    drawGround();

    if (scene.kind === 'room') {
      const cx = ((scene.cols * TILE) / 2 - camera.x) * scale;
      const cy = ((scene.rows * TILE) / 2 - camera.y) * scale;
      const r = Math.max(scene.cols, scene.rows) * TILE * scale * 0.62;
      const lamp = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      if (scene.neon) {
        lamp.addColorStop(0, 'rgba(196, 172, 255, 0.13)');
        lamp.addColorStop(0.65, 'rgba(130, 200, 255, 0.05)');
        lamp.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
      } else {
        lamp.addColorStop(0, 'rgba(255, 226, 174, 0.16)');
        lamp.addColorStop(0.65, 'rgba(255, 214, 150, 0.05)');
        lamp.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
      }
      ctx.fillStyle = lamp;
      ctx.fillRect(0, 0, wide, high);

      /* the arcade is lit by its own machines: a pool of colour under each
         cabinet and the sign, on the floor, before anything is drawn on it. */
      if (scene.neon) {
        const pulse = reduceMotion.matches ? 0.24 : 0.22 + 0.05 * Math.sin(clock / 620);
        scene.drawables.forEach((s) => {
          if (s.sprite.indexOf('arcade-') !== 0) return;
          const hit = frameOf(s.sprite);
          if (!hit) return;
          const gx = (s.px + hit.f[2] / 2 - camera.x) * scale;
          const gy = (s.py + hit.f[3] * 0.95 - camera.y) * scale;
          const gr = hit.f[2] * scale * 1.9;
          const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
          glow.addColorStop(0, `rgba(255, 128, 226, ${pulse})`);
          glow.addColorStop(0.45, `rgba(140, 148, 255, ${pulse * 0.55})`);
          glow.addColorStop(1, 'rgba(120, 140, 255, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
        });
      }
    }

    const list = [];
    const bob = reduceMotion.matches ? 0 : Math.round(Math.sin(clock / 420) * 1.5);
    /* The town is 88 x 66 tiles and holds six hundred-odd sprites, of which a
       few dozen are ever on screen. Everything else is dropped before the sort
       rather than after it, so the frame costs what the view costs. */
    const cullL = camera.x - 4;
    const cullT = camera.y - 4;
    const cullR = camera.x + viewW + 4;
    const cullB = camera.y + viewH + 4;
    scene.drawables.forEach((s) => {
      if (s.px > cullR || s.py > cullB || s.px + s.w < cullL || s.py + s.h < cullT) return;
      let name = s.sprite;
      if (s.anim && !reduceMotion.matches) {
        const speed = s.slow ? 620 : 190;
        name = s.anim[Math.floor(clock / speed) % s.anim.length];
      }
      const py = s.py + (s.float ? bob : 0);
      list.push({ base: s.flat ? -1 : s.base, draw: () => drawSprite(name, s.px, py) });
    });
    scene.npcs.forEach((npc) => {
      const px = Math.round(npc.at[0] * TILE) - 16;
      const py = Math.round(npc.at[1] * TILE) - 30;
      const row = A.dirRows[npc.dir] || 0;
      list.push({ base: npc.at[1] * TILE + 2, draw: () => drawCharacter(npc.id, row, 0, px, py) });
    });
    const ppx = Math.round(player.x) - 16;
    const ppy = Math.round(player.y) - 30;
    list.push({ base: player.y, draw: () => drawCharacter('tabish', A.dirRows[player.dir], player.frame, ppx, ppy) });

    list.sort((a, b) => a.base - b.base);
    list.forEach((item) => item.draw());

    if (scene.kind === 'town' && night) {
      ctx.fillStyle = 'rgba(22, 34, 66, 0.42)';
      ctx.fillRect(0, 0, wide, high);
    }
    if (scene.tint) {
      ctx.fillStyle = scene.tint;
      ctx.fillRect(0, 0, wide, high);
    }

    drawPlaques();

    if (near) {
      const wy = near.kind === 'door' ? near.cy - 22 : near.cy - 26;
      const sx = Math.round((near.cx - camera.x) * scale);
      const sy = Math.round((wy - camera.y) * scale) + (reduceMotion.matches ? 0 : Math.round(Math.sin(clock / 220) * 2));
      ctx.save();
      ctx.fillStyle = '#d96e34';
      ctx.strokeStyle = night || scene.kind === 'room' ? '#eaf6ff' : '#2d2c29';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy - 7);
      ctx.lineTo(sx + 7, sy - 7);
      ctx.lineTo(sx, sy + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  /* --- the live prompt --------------------------------------------------- */

  /* On a phone there is no E key, so the prompt names the button that is
     actually on screen. */
  const act = () => (coarse.matches || window.innerWidth <= 760 ? 'tap look' : 'press E');

  function hotspotName(h) {
    if (!h) return '';
    if (h.kind === 'door') {
      const loc = C.town.locations.find((l) => l.id === h.id);
      return `${loc ? loc.label : h.id} · ${act()} to go in`;
    }
    if (h.kind === 'exit') return `the way out · walk onto the mat, or ${act()}`;
    if (h.kind === 'npc') {
      const room = C.town.rooms[h.room];
      const npc = room && room.npcs && room.npcs[h.id];
      return `${npc ? npc.name : 'somebody'} · ${act()} to talk`;
    }
    const room = C.town.rooms[h.room];
    const obj = room && room.objects[h.id];
    return `${obj ? obj.name : h.id} · ${act()} to look`;
  }

  let lastPromptKey = '';
  function refreshPrompt() {
    const el = document.getElementById('ftPrompt');
    if (!el) return;
    near = findNear();
    const key = near ? `${near.kind}:${near.room || ''}:${near.id || 'exit'}` : 'none';
    if (key === lastPromptKey) return;
    lastPromptKey = key;
    if (!near) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = hotspotName(near);
  }

  /* 6 ------------------------------------- interaction, panels, transitions */

  let sheet = null;

  /* One curtain length for every scene change: a door, and the arcade cabinet.
     It matches --curtain in the stylesheet. Reduced motion gets the cut. */
  const CURTAIN = 200;

  function fade(midpoint) {
    const el = document.getElementById('ftFade');
    if (!el || reduceMotion.matches) { midpoint(); return; }
    el.classList.add('is-on');
    setTimeout(() => {
      midpoint();
      /* a timer, not rAF: a backgrounded tab would otherwise leave the screen
         dimmed until it came back */
      setTimeout(() => el.classList.remove('is-on'), 20);
    }, CURTAIN);
  }

  /* The movement hint is for the first few seconds of a first visit. It goes as
     soon as somebody moves, and the menu's `controls` button brings it back. */

  let hintTimer = null;

  const hintText = () =>
    coarse.matches || window.innerWidth <= 760
      ? 'the pad walks · look reads whatever you are standing beside · map and menu are in the bar'
      : 'wasd or arrows to walk · e to look · m for the map · esc for the menu';

  function showHint(ms) {
    const el = document.getElementById('ftHint');
    if (!el) return;
    el.textContent = hintText();
    el.hidden = false;
    /* one frame of layout before the class, or the transition has nothing to
       transition from */
    setTimeout(() => el.classList.add('is-on'), 20);
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, ms || 9000);
  }

  function hideHint() {
    const el = document.getElementById('ftHint');
    if (!el || el.hidden) return;
    clearTimeout(hintTimer);
    el.classList.remove('is-on');
    if (reduceMotion.matches) { el.hidden = true; return; }
    hintTimer = setTimeout(() => { el.hidden = true; }, 250);
  }

  function setWhere(text) {
    const el = document.getElementById('ftWhere');
    if (el) el.textContent = text;
  }

  function enterRoom(id) {
    if (!R[id]) return;
    save.town = { x: Math.round(player.x), y: Math.round(player.y) };
    fade(() => {
      scene = buildRoom(id);
      player.x = scene.spawn.x;
      player.y = scene.spawn.y;
      player.dir = 'up';
      exitArmed = false;
      lastPromptKey = '';
      visit(id);
      if (id === 'workshop') complete('enter-workshop');
      if (id === 'lostfound') complete('lost-found');
      setWhere(P.roomLabel(id));
      updateCamera();
      refreshPrompt();
      blip('open');
      persist();
    });
  }

  function leaveRoom() {
    const from = scene.id;
    fade(() => {
      scene = buildTown();
      const b = W.buildings.find((x) => x.id === from);
      if (b && b.door) { player.x = b.door[0] * TILE + TILE / 2; player.y = b.door[1] * TILE + TILE + 4; }
      else if (save.town) { player.x = save.town.x; player.y = save.town.y; }
      player.dir = 'down';
      lastPromptKey = '';
      setWhere('field-trip.exe');
      updateCamera();
      refreshPrompt();
      blip('close');
      persist();
    });
  }

  function openSheet(title, body, opts) {
    if (!sheet) return;
    Object.keys(held).forEach((k) => (held[k] = false));
    document.getElementById('ftSheetTitle').textContent = title;
    const b = document.getElementById('ftSheetBody');
    b.innerHTML = body;
    sheet.classList.toggle('ft-sheet--object', !!(opts && opts.object));
    if (!sheet.open) sheet.showModal();
    b.scrollTop = 0;
    b.focus({ preventScroll: true });
    setPaused(true, true);
    blip('open');
  }

  function closeSheet() {
    if (sheet && sheet.open) sheet.close();
    setPaused(false);
    const app = document.getElementById('gameApp');
    if (app) app.focus({ preventScroll: true });
  }

  const uiState = () => ({
    visited: save.visited,
    quests: save.quests,
    inspected: save.inspected,
    sound: store.get(KEYS.sound, false) === true,
    night: night,
    touch: coarse.matches || window.innerWidth <= 760
  });

  function inspect(roomId, objId, sprite) {
    const room = C.town.rooms[roomId];
    const obj = room && room.objects[objId];
    if (!obj) return;

    if (obj.action === 'map') { openSheet('map directory', P.mapHtml(uiState())); return; }
    if (obj.action === 'arcade') { launchArcade(); return; }
    if (obj.action === 'highscore') {
      const best = store.get('fieldtrip.arcade.v1', 0) || 0;
      say(obj.name, [best ? `best courier run so far: ${best} points.` : 'nobody has posted a score yet. the machine is waiting.']);
      return;
    }

    save.inspected[roomId + ':' + objId] = true;
    if (roomId !== 'square') complete('inspect');
    if (obj.quest) complete(obj.quest);
    persist();

    if (obj.panel) {
      const panel = P.objectPanel(roomId, objId, sprite);
      openSheet(obj.name, panel.html, { object: true });
      return;
    }
    if (obj.lines) say(obj.name, obj.lines.slice());
  }

  /* --- dialogue --- */

  let sayQueue = [];

  function say(who, lines) {
    sayQueue = lines.slice();
    const box = document.getElementById('ftSay');
    document.getElementById('ftSayWho').textContent = who;
    nextSay();
    box.hidden = false;
  }

  function nextSay() {
    const box = document.getElementById('ftSay');
    if (!sayQueue.length) { box.hidden = true; return false; }
    document.getElementById('ftSayLine').textContent = sayQueue.shift();
    blip('talk');
    return true;
  }

  function interact() {
    const box = document.getElementById('ftSay');
    if (box && !box.hidden) {
      if (!nextSay()) box.hidden = true;
      return;
    }
    if (!near) return;
    if (near.kind === 'door') { enterRoom(near.id); return; }
    if (near.kind === 'exit') { leaveRoom(); return; }
    if (near.kind === 'npc') {
      const room = C.town.rooms[near.room];
      const npc = room && room.npcs && room.npcs[near.id];
      say(npc ? npc.name : 'somebody', npc ? npc.lines.slice() : ['…']);
      return;
    }
    inspect(near.room, near.id, near.sprite);
  }

  /* --- the arcade cabinet ------------------------------------------------- */

  let arcadeLoading = false;

  function launchArcade() {
    if (arcadeLoading) return;
    const host = document.getElementById('ftArcade');
    const start = () => {
      setPaused(true, true);
      /* Start only after the cabinet is visible. Starting while `hidden`
         makes its screen measure 0 × 0, locking the game to the 320 × 220
         fallback until the browser is resized. */
      fade(() => {
        host.hidden = false;
        window.CatCourier.start(host, {
          images: images,
          atlas: A,
          reduceMotion: reduceMotion.matches,
          coarse: coarse.matches || window.innerWidth <= 760,
          sound: () => store.get(KEYS.sound, false) === true,
          onScore: () => { complete('arcade-round'); },
          onExit: () => {
            fade(() => {
              host.hidden = true;
              host.innerHTML = '';
              setPaused(false);
              const app = document.getElementById('gameApp');
              if (app) app.focus({ preventScroll: true });
            });
          }
        });
      });
    };
    if (window.CatCourier) { start(); return; }
    arcadeLoading = true;
    const el = document.createElement('script');
    el.src = 'js/field-trip/arcade.js?v=20260809-ride2';
    el.addEventListener('load', () => { arcadeLoading = false; if (window.CatCourier) start(); });
    el.addEventListener('error', () => {
      arcadeLoading = false;
      say('CAT COURIER', ['the cabinet started warming up and never finished. give it a moment and try again.']);
    });
    document.head.appendChild(el);
  }

  /* 7 ---------------------------------------------------------- save, quests */

  function loadSave() {
    const raw = store.get(KEYS.save, null);
    if (raw && typeof raw === 'object') {
      save.visited = raw.visited || {};
      save.quests = raw.quests || {};
      save.inspected = raw.inspected || {};
      /* Keep progress across map revisions, but never restore old coordinates
         into a building that has moved. */
      save.town = raw.worldVersion === W.version ? (raw.town || null) : null;
      save.room = raw.room || null;
      player.x = save.town ? save.town.x : W.spawn.tx * TILE;
      player.y = save.town ? save.town.y : W.spawn.ty * TILE;
      player.dir = raw.dir || W.spawn.dir;
    } else {
      save.visited = {};
      save.quests = {};
      save.inspected = {};
      player.x = W.spawn.tx * TILE;
      player.y = W.spawn.ty * TILE;
      player.dir = W.spawn.dir;
    }
  }

  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const inTown = scene && scene.kind === 'town';
      store.set(KEYS.save, {
        worldVersion: W.version,
        visited: save.visited,
        quests: save.quests,
        inspected: save.inspected,
        town: inTown ? { x: Math.round(player.x), y: Math.round(player.y) } : save.town,
        room: scene && scene.kind === 'room' ? scene.id : null,
        dir: player.dir
      });
    }, 250);
  }

  function toast(message) {
    const el = document.getElementById('ftToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-on');
    setTimeout(() => el.classList.remove('is-on'), 3400);
  }

  function visit(id) {
    if (save.visited[id]) return;
    save.visited[id] = true;
    persist();
  }

  function complete(questId) {
    if (!questId || save.quests[questId]) return;
    const quest = C.town.quests.find((q) => q.id === questId);
    if (!quest) return;
    save.quests[questId] = true;
    blip('stamp');
    if (allDone()) {
      night = true;
      store.set(KEYS.time, 0.85);
      if (scene && scene.kind === 'town') scene = buildTown();
      toast('the street lights came on early, and a cat turned up on the green');
    } else {
      toast(`done: ${quest.label}`);
    }
    persist();
  }

  function resetGame() {
    store.remove(KEYS.save);
    save.visited = {};
    save.quests = {};
    save.inspected = {};
    save.town = null;
    scene = buildTown();
    player.x = W.spawn.tx * TILE;
    player.y = W.spawn.ty * TILE;
    player.dir = W.spawn.dir;
    setWhere('field-trip.exe');
    updateCamera();
    toast('reset. the village is unvisited again.');
  }

  /* --- tiny sounds, off until asked --- */

  let audioCtx = null;
  function blip(kind) {
    if (store.get(KEYS.sound, false) !== true) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const map = { open: [280, 540, 0.14], talk: [420, 480, 0.07], stamp: [330, 700, 0.2], close: [460, 240, 0.12] };
      const m = map[kind] || map.talk;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(m[0], now);
      osc.frequency.exponentialRampToValueAtTime(m[1], now + m[2]);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + m[2]);
      osc.start(now);
      osc.stop(now + m[2]);
    } catch (err) {
      /* no web audio; the town is just quiet */
    }
  }

  /* 8 ------------------------------------------------------- start and stop */

  let controller = null;
  let signal = null;
  let host = null;

  function setPaused(value, quiet) {
    paused = value;
    const app = document.getElementById('gameApp');
    if (app) app.classList.toggle('is-paused', paused);
    if (!paused) wake();
    if (paused && !quiet) blip('close');
  }

  function loop(now) {
    raf = null;
    if (!running || !ready) return;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (paused || document.hidden) return;
    clock += dt * 1000;
    updatePlayer(dt);
    updateCamera();
    refreshPrompt();
    if (player.moving) persist();
    render();
    raf = requestAnimationFrame(loop);
  }

  function wake() {
    if (!running || !ready || paused || document.hidden || raf) return;
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function wire() {
    const on = (el, type, fn, opts) => el && el.addEventListener(type, fn, Object.assign({ signal }, opts || {}));
    sheet = document.getElementById('ftSheet');
    canvas = document.getElementById('ftCanvas');

    on(document.querySelector('.ft-bar__tools'), 'click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'map') openSheet('map directory', P.mapHtml(uiState()));
      else if (act === 'quests') openSheet('quest log', P.questsHtml(uiState()));
      else if (act === 'pause') openSheet('menu', P.menuHtml(uiState()));
    });

    on(sheet, 'click', (e) => {
      if (e.target.closest('[data-close]')) { closeSheet(); return; }

      const go = e.target.closest('[data-go]');
      if (go) {
        const loc = C.town.locations.find((l) => l.id === go.dataset.go);
        if (!loc) return;
        visit(loc.id);
        if (loc.room) openSheet(loc.label, P.roomDirectory(loc.room, uiState()));
        else openSheet(loc.label, P.sections(loc.sections));
        return;
      }

      const look = e.target.closest('[data-inspect]');
      if (look) {
        const [roomId, objId] = look.dataset.inspect.split(':');
        const room = C.town.rooms[roomId];
        const obj = room && room.objects[objId];
        if (!obj) return;
        if (obj.panel) {
          save.inspected[roomId + ':' + objId] = true;
          if (roomId !== 'square') complete('inspect');
          if (obj.quest) complete(obj.quest);
          persist();
          const panel = P.objectPanel(roomId, objId, spriteFor(roomId, objId));
          openSheet(obj.name, panel.html, { object: true });
        } else if (obj.action === 'arcade') {
          closeSheet();
          launchArcade();
        } else if (obj.lines) {
          openSheet(obj.name, `<p>${obj.lines.map((l) => esc(l)).join('</p><p>')}</p>`, { object: true });
        }
        return;
      }

      const menu = e.target.closest('[data-menu]');
      if (!menu) return;
      const act = menu.dataset.menu;
      if (act === 'resume') closeSheet();
      else if (act === 'hint') { closeSheet(); showHint(12000); }
      else if (act === 'map') openSheet('map directory', P.mapHtml(uiState()));
      else if (act === 'quests') openSheet('quest log', P.questsHtml(uiState()));
      else if (act === 'sound') {
        const soundNow = store.get(KEYS.sound, false) !== true;
        store.set(KEYS.sound, soundNow);
        if (window.PortfolioSound) {
          if (soundNow) window.PortfolioSound.startField();
          else window.PortfolioSound.stop();
        }
        openSheet('menu', P.menuHtml(uiState()));
      } else if (act === 'night') {
        night = !night;
        store.set(KEYS.time, night ? 0.85 : 0);
        openSheet('menu', P.menuHtml(uiState()));
      } else if (act === 'switch') { closeSheet(); window.Modes.toChooser(); }
      else if (act === 'reset') { resetGame(); openSheet('menu', P.menuHtml(uiState())); }
    });

    on(sheet, 'keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeSheet();
    });
    on(sheet, 'close', () => setPaused(false));

    on(window, 'keydown', (e) => {
      if (sheet && sheet.open) return;
      if (window.CatCourier && window.CatCourier.isRunning && window.CatCourier.isRunning()) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const dir = KEYMAP[e.key];
      if (dir) { held[dir] = true; e.preventDefault(); wake(); return; }
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); interact(); }
      else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); openSheet('map directory', P.mapHtml(uiState())); }
      else if (e.key === 'Escape') {
        e.preventDefault();
        const box = document.getElementById('ftSay');
        if (box && !box.hidden) { box.hidden = true; sayQueue = []; return; }
        openSheet('menu', P.menuHtml(uiState()));
      }
    });

    on(window, 'keyup', (e) => {
      const dir = KEYMAP[e.key];
      if (dir) held[dir] = false;
    });

    on(window, 'blur', () => Object.keys(held).forEach((k) => (held[k] = false)));
    on(window, 'resize', () => { resize(); wake(); });
    on(document, 'visibilitychange', () => { if (!document.hidden) wake(); });

    const touch = document.getElementById('ftTouch');
    if (touch) {
      const setDir = (dir, value) => { if (dir) held[dir] = value; };
      on(touch, 'pointerdown', (e) => {
        const b = e.target.closest('[data-move]');
        if (b) { e.preventDefault(); b.setPointerCapture(e.pointerId); setDir(b.dataset.move, true); wake(); return; }
        if (e.target.closest('[data-act="interact"]')) { e.preventDefault(); interact(); }
      });
      const release = (e) => {
        const b = e.target.closest('[data-move]');
        if (b) setDir(b.dataset.move, false);
      };
      on(touch, 'pointerup', release);
      on(touch, 'pointercancel', release);
      on(touch, 'pointerleave', release);
      on(touch, 'contextmenu', (e) => e.preventDefault());
    }

    on(canvas, 'pointerdown', () => {
      const box = document.getElementById('ftSay');
      if (box && !box.hidden) { if (!nextSay()) box.hidden = true; return; }
      if (near) interact();
    });
  }

  function spriteFor(roomId, objId) {
    /* the outdoor places all live in W.square, whichever page of the
       directory they belong to */
    const outside = W.square.find((x) => x.id === objId && (x.room || 'square') === roomId);
    if (outside) return outside.sprite;
    const spec = R[roomId];
    if (!spec) return null;
    const obj = (spec.objects || []).find((x) => (x.alias || x.id) === objId);
    return obj ? obj.sprite : null;
  }

  function leaveBrokenVillage(message) {
    if (window.PortfolioFail) window.PortfolioFail('Field Trip could not start: ' + message);
    else location.replace('/404.html');
  }

  async function start(mountPoint, opts) {
    host = mountPoint;
    host.innerHTML = SHELL;
    controller = new AbortController();
    signal = controller.signal;
    running = true;
    ready = false;
    paused = false;
    clock = 0;
    near = null;
    lastPromptKey = '';

    night = Number(store.get(KEYS.time, 0)) >= 0.65;
    loadSave();
    wire();
    resize();
    if (coarse.matches || window.innerWidth <= 760) document.getElementById('ftTouch').hidden = false;
    if (opts && opts.focus) document.getElementById('gameApp').focus({ preventScroll: true });

    if (!A || !W || !R || !P) { leaveBrokenVillage('the town data is missing'); return; }

    try {
      const [town, chars, rooms] = await Promise.all([
        loadImage(A.town.file), loadImage(A.chars.file), loadImage(A.rooms.file)
      ]);
      if (!running) return;
      images.town = town;
      images.chars = chars;
      images.rooms = rooms;
      assetsOk = true;
    } catch (err) {
      leaveBrokenVillage(err.message);
      return;
    }

    scene = buildTown();
    document.getElementById('ftLoad').hidden = true;
    ready = true;
    if (store.get(KEYS.sound, false) === true && window.PortfolioSound) {
      window.PortfolioSound.startField();
    }
    updateCamera();
    refreshPrompt();
    showHint();
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    ready = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    clearTimeout(saveTimer);
    clearTimeout(hintTimer);
    if (window.CatCourier && window.CatCourier.stop) window.CatCourier.stop();
    if (window.PortfolioSound) window.PortfolioSound.stop();
    if (sheet && sheet.open) sheet.close();
    if (controller) controller.abort();
    controller = null;
    signal = null;
    Object.keys(held).forEach((k) => (held[k] = false));
    if (host) host.innerHTML = '';
    host = null;
    sheet = null;
    canvas = null;
    ctx = null;
    scene = null;
  }

  return { start, stop };
})();
