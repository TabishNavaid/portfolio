/* ==========================================================================
   arcade.js — CAT COURIER

   The cabinet in the arcade. A 75-second score-attack delivery run through a
   night-time neighbourhood, with no relation whatsoever to anybody's résumé.

   Pick a parcel up at the depot, take it to the shopfront with the matching
   colour and symbol, keep the streak alive. Puddles slow you, fish speed you
   up, the wrong door costs time rather than the game.

   Loaded only when somebody walks up to the cabinet, and disposed of when
   they walk away: its own canvas, its own loop, its own listeners.

     1  map, colours, symbols
     2  state and the round
     3  update  (mechanics — unchanged)
     4  feedback: particles, floating score, flash, shake
     5  render: neighbourhood, depot, shopfronts, courier
     6  hud, attract screen, results
     7  loop and wiring
   ========================================================================== */

window.CatCourier = (function () {
  'use strict';

  /* 1 ------------------------------------------------ map, colours, symbols */

  const TILE = 16;
  const ROUND_MS = 75000;
  const SPEED = 66;

  const COLOURS = {
    orange: '#e8823d',
    blue: '#5f9ede',
    green: '#5fb872',
    pink: '#e07aa8'
  };
  const DARK = {
    orange: '#8c4a1d',
    blue: '#2f5c8c',
    green: '#2f6d43',
    pink: '#8a4267'
  };
  /* a symbol as well as a colour, so the target never rests on hue alone */
  const SYMBOL = { orange: 'circle', blue: 'square', green: 'triangle', pink: 'star' };
  const NAMES = { orange: 'orange', blue: 'blue', green: 'green', pink: 'pink' };

  /* 20 x 13. # building, . street, D depot, o puddle. Doors sit in the wall. */
  const MAP = [
    '####################',
    '#........#.........#',
    '#.####...#...####..#',
    '#..o.#...#...#..o..#',
    '##...#.......#...###',
    '#.......DDDD.......#',
    '#....#..DDDD..#....#',
    '##...#.......#...###',
    '#..o.#...#...#..o..#',
    '#.####...#...####..#',
    '#........#.........#',
    '#........#.........#',
    '####################'
  ];

  const DOORS = [
    { colour: 'orange', tx: 10, ty: 0, face: 'down' },
    { colour: 'blue', tx: 10, ty: 12, face: 'up' },
    { colour: 'green', tx: 0, ty: 6, face: 'right' },
    { colour: 'pink', tx: 19, ty: 6, face: 'left' }
  ];

  /* street dressing: nothing here collides */
  const LAMPS = [[1, 1], [18, 1], [1, 11], [18, 11]];
  const BUSHES = [[1, 2], [18, 2], [1, 9], [18, 9], [7, 10], [12, 10]];
  const CRATES = [[6, 2], [12, 2]];

  const COLS = MAP[0].length;
  const ROWS = MAP.length;
  /* headroom above the top row so a courier in the north doorway keeps a head */
  const PAD_TOP = 12;
  const BEST_KEY = 'fieldtrip.arcade.v1';

  const RESULT_LINES = [
    'the cat has seen worse.',
    'the neighbourhood is fed.',
    'several doors were the right door.',
    'nobody filed a complaint.',
    'that is a lot of walking for one evening.'
  ];

  /* 2 ------------------------------------------------- state and the round */

  let host = null;
  let canvas = null;
  let ctx = null;
  let hud = null;
  let opts = null;
  let controller = null;
  let raf = null;
  let running = false;
  let paused = false;
  let lastT = 0;
  let scale = 3;
  let dpr = 1;
  let clock = 0;

  const held = { up: false, down: false, left: false, right: false };
  const player = { x: 0, y: 0, dir: 'down', frame: 0, frameT: 0, moving: false };

  let solid = null;
  let puddles = [];
  let state = null;
  let particles = [];
  let floats = [];

  const reduce = () => !!(opts && opts.reduceMotion);
  const rnd = (a, b) => a + Math.random() * (b - a);

  function reset(phase) {
    state = {
      phase: phase || 'attract',
      time: ROUND_MS,
      score: 0,
      combo: 1,
      bestCombo: 1,
      streak: 0,
      carrying: null,
      delivered: 0,
      misses: 0,
      boost: 0,
      slow: 0,
      fish: null,
      fishIn: 6000,
      flash: 0,
      flashColour: '#e8823d',
      shake: 0,
      hop: 0,
      newBest: false,
      attractDir: 1
    };
    particles = [];
    floats = [];
    /* centred in its tile: the streets are one tile wide */
    player.x = 10 * TILE + 8;
    player.y = 8 * TILE + 8;
    player.dir = 'up';
  }

  const isOver = () => state && state.phase === 'over';
  const isPlaying = () => state && state.phase === 'playing';

  function buildGrid() {
    solid = new Uint8Array(COLS * ROWS);
    puddles = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const ch = MAP[y][x];
        if (ch === '#') solid[y * COLS + x] = 1;
        if (ch === 'o') puddles.push([x, y]);
      }
    }
    DOORS.forEach((d) => { solid[d.ty * COLS + d.tx] = 0; });
  }

  const blocked = (x, y) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    return solid[ty * COLS + tx] === 1;
  };

  const inDepot = () => {
    const tx = Math.floor(player.x / TILE);
    const ty = Math.floor(player.y / TILE);
    return MAP[ty] && MAP[ty][tx] === 'D';
  };

  function doorUnder() {
    const tx = Math.floor(player.x / TILE);
    const ty = Math.floor(player.y / TILE);
    return DOORS.find((d) => d.tx === tx && d.ty === ty) || null;
  }

  /* Later parcels go further: bias towards the door you are not standing by. */
  function nextColour() {
    const elapsed = 1 - state.time / ROUND_MS;
    const scored = DOORS.map((d) => {
      const dx = (d.tx + 0.5) * TILE - player.x;
      const dy = (d.ty + 0.5) * TILE - player.y;
      return { colour: d.colour, dist: Math.sqrt(dx * dx + dy * dy) };
    }).sort((a, b) => b.dist - a.dist);
    const pool = elapsed > 0.55 ? scored.slice(0, 2) : scored;
    return pool[Math.floor(Math.random() * pool.length)].colour;
  }

  function spawnFish() {
    for (let i = 0; i < 40; i += 1) {
      const x = 1 + Math.floor(Math.random() * (COLS - 2));
      const y = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (MAP[y][x] === '.') return { tx: x, ty: y };
    }
    return null;
  }

  /* 3 ------------------------------------------------------------- update */

  function update(dt) {
    clock += dt * 1000;
    decayFeedback(dt);

    if (state.phase === 'attract') { attractStep(dt); return; }
    if (state.phase !== 'playing') return;

    state.time -= dt * 1000;
    if (state.time <= 0) { state.time = 0; finish(); return; }

    let dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    let dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    player.moving = !!(dx || dy);

    let speed = SPEED;
    if (state.boost > 0) { speed *= 1.55; state.boost -= dt * 1000; }
    if (state.slow > 0) { speed *= 0.55; state.slow -= dt * 1000; }

    if (player.moving) {
      if (Math.abs(dx) >= Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
      else player.dir = dy > 0 ? 'down' : 'up';
      const step = speed * dt;
      const r = 4;
      const nx = player.x + dx * step;
      if (!blocked(nx - r, player.y - r) && !blocked(nx + r, player.y - r) &&
          !blocked(nx - r, player.y + r) && !blocked(nx + r, player.y + r)) player.x = nx;
      const ny = player.y + dy * step;
      if (!blocked(player.x - r, ny - r) && !blocked(player.x + r, ny - r) &&
          !blocked(player.x - r, ny + r) && !blocked(player.x + r, ny + r)) player.y = ny;
      player.frameT += dt * 1000;
      if (player.frameT >= 100) { player.frameT = 0; player.frame = (player.frame + 1) % 8; }
    } else {
      player.frame = 0;
    }

    const ptx = Math.floor(player.x / TILE);
    const pty = Math.floor(player.y / TILE);

    /* puddles */
    if (puddles.some((p) => p[0] === ptx && p[1] === pty)) {
      if (state.slow <= 0) splash('#6ea8dc', 4);
      state.slow = Math.max(state.slow, 900);
    }

    /* fish */
    if (!state.fish) {
      state.fishIn -= dt * 1000;
      if (state.fishIn <= 0) { state.fish = spawnFish(); state.fishIn = 9000; }
    } else if (state.fish.tx === ptx && state.fish.ty === pty) {
      state.fish = null;
      state.boost = 3600;
      burst(player.x, player.y - 8, '#8fd6c0', 9);
      float(player.x, player.y - 18, 'fast!', '#8fd6c0');
      flash('#7fd0a8');
      beep(760, 0.09);
    }

    /* pick up */
    if (!state.carrying && inDepot()) {
      state.carrying = nextColour();
      burst(player.x, player.y - 10, COLOURS[state.carrying], 6);
      beep(420, 0.07);
      paintHud();
    }

    /* deliver */
    const door = doorUnder();
    if (door && state.carrying) {
      if (door.colour === state.carrying) {
        state.streak += 1;
        const before = state.combo;
        state.combo = Math.min(5, 1 + Math.floor(state.streak / 2));
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const gained = 100 * state.combo;
        state.score += gained;
        state.delivered += 1;
        state.carrying = null;
        state.hop = 340;
        burst(player.x, player.y - 10, COLOURS[door.colour], 14);
        float(player.x, player.y - 20, '+' + gained, COLOURS[door.colour]);
        if (state.combo > before) {
          float(player.x, player.y - 34, 'combo ×' + state.combo, '#ffd9be');
          beep(880, 0.12);
        }
        flash(COLOURS[door.colour]);
        beep(560 + state.combo * 60, 0.11);
        /* step back onto the pavement so the courier stays on screen */
        player.x += door.tx === 0 ? 9 : door.tx === COLS - 1 ? -9 : 0;
        player.y += door.ty === 0 ? 9 : door.ty === ROWS - 1 ? -9 : 0;
      } else {
        state.time = Math.max(0, state.time - 2000);
        state.streak = 0;
        state.combo = 1;
        state.misses += 1;
        burst(player.x, player.y - 10, '#c9543f', 10);
        float(player.x, player.y - 20, 'wrong door −2s', '#ff9c8a');
        flash('#b64a3a');
        shake(230);
        beep(180, 0.14);
        /* nudge back out of the door so it does not repeat every frame */
        player.x += door.tx === 0 ? 8 : door.tx === COLS - 1 ? -8 : 0;
        player.y += door.ty === 0 ? 8 : door.ty === ROWS - 1 ? -8 : 0;
      }
      paintHud();
    }
  }

  /* the courier paces the street until somebody presses start */
  function attractStep(dt) {
    const step = 26 * dt;
    const nx = player.x + step * state.attractDir;
    if (blocked(nx - 4, player.y) || blocked(nx + 4, player.y)) state.attractDir *= -1;
    else player.x = nx;
    player.dir = state.attractDir > 0 ? 'right' : 'left';
    player.moving = true;
    player.frameT += dt * 1000;
    if (player.frameT >= 130) { player.frameT = 0; player.frame = (player.frame + 1) % 8; }
  }

  function startRound() {
    reset('playing');
    state.phase = 'playing';
    hideOverlay('.cc-attract');
    hideOverlay('.cc-result');
    hideOverlay('.cc-pause');
    paused = false;
    paintHud();
    beep(520, 0.1);
    wake();
  }

  function finish() {
    state.phase = 'over';
    const previous = Number(window.Prefs.get(BEST_KEY, 0)) || 0;
    state.newBest = state.score > previous;
    const best = Math.max(previous, state.score);
    window.Prefs.set(BEST_KEY, best);
    if (opts.onScore) opts.onScore(state.score);
    if (state.newBest) { beep(720, 0.14); setTimeout(() => beep(960, 0.18), 130); }
    for (let i = 0; i < 14; i += 1) burst(rnd(TILE * 3, TILE * 17), rnd(TILE * 3, TILE * 10), i % 2 ? '#ffd9be' : '#8fd6c0', 3);
    render();
    paintHud();
    showResult(best);
  }

  /* 4 ---------------------------------------------------------- feedback */

  function flash(colour) {
    state.flashColour = colour;
    state.flash = reduce() ? 420 : 260;
  }

  function shake(ms) {
    if (reduce()) return;
    state.shake = ms;
  }

  function burst(x, y, colour, n) {
    const count = reduce() ? 1 : n;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: x, y: y,
        vx: reduce() ? 0 : rnd(-42, 42),
        vy: reduce() ? 0 : rnd(-58, -12),
        life: reduce() ? 420 : rnd(280, 520),
        max: 520,
        colour: colour,
        size: reduce() ? 9 : (Math.random() < 0.4 ? 3 : 2),
        ring: reduce()
      });
    }
  }

  const splash = (colour, n) => burst(player.x, player.y - 2, colour, n);

  function float(x, y, text, colour) {
    floats.push({ x: x, y: y, text: text, colour: colour, life: 900, max: 900 });
  }

  function decayFeedback(dt) {
    const ms = dt * 1000;
    if (state.flash > 0) state.flash -= ms;
    if (state.shake > 0) state.shake -= ms;
    if (state.hop > 0) state.hop -= ms;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= ms;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      if (p.ring) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 150 * dt;
    }
    for (let i = floats.length - 1; i >= 0; i -= 1) {
      const f = floats[i];
      f.life -= ms;
      if (f.life <= 0) floats.splice(i, 1);
      else if (!reduce()) f.y -= 16 * dt;
    }
  }

  /* 5 -------------------------------------------------------------- render */

  function resize() {
    if (!canvas || !host) return;
    /* measure the sunken screen well, not the frame wrapped around the canvas */
    const well = host.querySelector('.cc-screen');
    const box = (well || canvas.parentElement).getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = COLS * TILE;
    const h = ROWS * TILE + PAD_TOP;
    /* Draw at an integer scale — every sprite pixel stays a whole block — and
       let the CRT present that buffer at whatever size actually fits. The
       browser resamples it nearest-neighbour (image-rendering: pixelated), so
       the picture gets bigger without ever going soft. */
    const fit = Math.min((box.width - 10) / w, (box.height - 10) / h);
    scale = fit >= 2 ? Math.min(4, Math.floor(fit)) : Math.max(1, fit);
    const shown = Math.max(scale, Math.min(fit, scale + 0.98));
    canvas.style.width = Math.round(w * shown) + 'px';
    canvas.style.height = Math.round(h * shown) + 'px';
    canvas.width = Math.floor(w * scale * dpr);
    canvas.height = Math.floor(h * scale * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  const S = (v) => v * scale;
  const px = (v) => Math.round(v * scale);

  function sprite(pack, name, x, y) {
    const at = opts.atlas[pack];
    const f = at && at.frames[name];
    const img = opts.images[pack];
    if (!f || !img) return;
    ctx.drawImage(img, f[0], f[1], f[2], f[3], px(x), px(y), Math.round(f[2] * scale), Math.round(f[3] * scale));
  }

  /* deterministic per-tile noise, so the neighbourhood is the same every run */
  function hash(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function symbol(kind, cx, cy, r, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    if (kind === 'circle') ctx.arc(cx, cy, r, 0, Math.PI * 2);
    else if (kind === 'square') ctx.rect(cx - r, cy - r, r * 2, r * 2);
    else if (kind === 'triangle') {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.lineTo(cx - r, cy + r);
      ctx.closePath();
    } else {
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const rad = i % 2 ? r * 0.42 : r;
        const fn = i ? 'lineTo' : 'moveTo';
        ctx[fn](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  function drawStreet(late) {
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const ch = MAP[y][x];
        if (ch === '#') continue;
        const X = px(x * TILE);
        const Y = px(y * TILE);
        const s = Math.ceil(S(TILE));
        ctx.fillStyle = ch === 'D' ? '#3f3a2a' : late ? '#2c2434' : '#242b36';
        ctx.fillRect(X, Y, s, s);
        /* kerb line and a little grit, deterministic */
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.fillRect(X, Y, s, Math.max(1, Math.round(scale)));
        const h = hash(x, y);
        if (h > 0.82 && ch === '.') {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(X + Math.round(S(h * 10)), Y + Math.round(S(4 + h * 6)), Math.round(S(2)), Math.round(S(1)));
        }
      }
    }
  }

  function drawBuildings(late) {
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (MAP[y][x] !== '#') continue;
        if (DOORS.some((d) => d.tx === x && d.ty === y)) continue;
        const X = px(x * TILE);
        const Y = px(y * TILE);
        const s = Math.ceil(S(TILE));
        const h = hash(x * 3, y * 7);
        ctx.fillStyle = late ? '#4a3d5c' : (h > 0.6 ? '#3d4759' : '#39414f');
        ctx.fillRect(X, Y, s, s);
        /* eaves where the street is above, plinth where it is below */
        const openAbove = y > 0 && MAP[y - 1][x] !== '#';
        const openBelow = y < ROWS - 1 && MAP[y + 1][x] !== '#';
        if (openAbove) {
          ctx.fillStyle = late ? '#6a5580' : '#525f75';
          ctx.fillRect(X, Y, s, Math.round(S(3)));
        }
        if (openBelow) {
          ctx.fillStyle = 'rgba(0,0,0,0.32)';
          ctx.fillRect(X, Y + s - Math.round(S(3)), s, Math.round(S(3)));
        }
        /* a lit window on some blocks, blinking very slowly */
        if (h > 0.55 && (openAbove || openBelow)) {
          const on = ((clock / 2600 + h * 7) | 0) % 5 !== 0;
          ctx.fillStyle = on ? (late ? '#ffd27a' : '#ffca6b') : '#2b2f3c';
          const wx = X + Math.round(S(4));
          const wy = Y + Math.round(S(openAbove ? 6 : 4));
          ctx.fillRect(wx, wy, Math.round(S(4)), Math.round(S(4)));
          ctx.fillRect(wx + Math.round(S(6)), wy, Math.round(S(4)), Math.round(S(4)));
        }
      }
    }
  }

  function glow(cx, cy, radius, colour, alpha) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }

  function drawDressing() {
    LAMPS.forEach((l) => {
      glow(px(l[0] * TILE + 8), px(l[1] * TILE + 4), S(30), 'rgba(255, 214, 138, 0.5)', 0.55);
      sprite('town', 'lamp', l[0] * TILE + 1, l[1] * TILE - 14);
    });
    BUSHES.forEach((b, i) => sprite('town', i % 2 ? 'bush-dark' : 'bush-green', b[0] * TILE, b[1] * TILE + 1));
    CRATES.forEach((c) => sprite('rooms', 'crate-box', c[0] * TILE - 4, c[1] * TILE - 4));
  }

  function drawPuddles() {
    puddles.forEach((p, i) => {
      const cx = px(p[0] * TILE + 8);
      const cy = px(p[1] * TILE + 10);
      const wobble = reduce() ? 0 : Math.sin(clock / 700 + i) * S(0.6);
      ctx.fillStyle = 'rgba(96, 156, 214, 0.55)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, S(7.4) + wobble, S(4.2), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(190, 226, 255, 0.55)';
      ctx.fillRect(cx - Math.round(S(3)), cy - Math.round(S(1)), Math.round(S(3)), Math.max(1, Math.round(scale)));
    });
  }

  function drawDepot() {
    const x0 = px(8 * TILE);
    const y0 = px(5 * TILE);
    const w = Math.ceil(S(4 * TILE));
    const h = Math.ceil(S(2 * TILE));
    glow(x0 + w / 2, y0 + h / 2, S(40), 'rgba(255, 196, 120, 0.42)', 0.6);
    /* shed roof and posts */
    ctx.fillStyle = '#7a4a2c';
    ctx.fillRect(x0, y0 - Math.round(S(5)), w, Math.round(S(5)));
    ctx.fillStyle = '#5d3720';
    ctx.fillRect(x0, y0 - Math.round(S(1)), w, Math.round(S(1)));
    ctx.fillStyle = '#4a3524';
    ctx.fillRect(x0 + Math.round(S(1)), y0, Math.round(S(2)), h);
    ctx.fillRect(x0 + w - Math.round(S(3)), y0, Math.round(S(2)), h);
    /* sign */
    ctx.fillStyle = '#fdfaf2';
    ctx.fillRect(x0 + w / 2 - Math.round(S(15)), y0 - Math.round(S(14)), Math.round(S(30)), Math.round(S(9)));
    ctx.fillStyle = '#2d2c29';
    ctx.font = `700 ${Math.max(6, Math.round(S(6)))}px "Space Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEPOT', x0 + w / 2, y0 - Math.round(S(9.2)));
    /* stacked parcels and the cat who runs the place */
    [0, 1, 2, 3].forEach((i) => {
      const c = Object.keys(COLOURS)[i];
      const bx = x0 + Math.round(S(6 + i * 14));
      const by = y0 + h - Math.round(S(9));
      ctx.fillStyle = DARK[c];
      ctx.fillRect(bx, by, Math.round(S(8)), Math.round(S(7)));
      ctx.fillStyle = COLOURS[c];
      ctx.fillRect(bx, by, Math.round(S(8)), Math.round(S(5)));
    });
    sprite('rooms', reduce() || ((clock / 620) | 0) % 2 === 0 ? 'cat-0' : 'cat-1', 10 * TILE - 1, 5 * TILE + 12);
  }

  function drawDoors() {
    DOORS.forEach((d) => {
      const X = px(d.tx * TILE);
      const Y = px(d.ty * TILE);
      const s = Math.ceil(S(TILE));
      const active = state.carrying === d.colour;
      const colour = COLOURS[d.colour];

      /* the shopfront: frame, door slab, awning facing the street */
      ctx.fillStyle = DARK[d.colour];
      ctx.fillRect(X, Y, s, s);
      ctx.fillStyle = '#2a2119';
      ctx.fillRect(X + Math.round(S(3)), Y + Math.round(S(3)), s - Math.round(S(6)), s - Math.round(S(3)));
      ctx.fillStyle = '#3c2f22';
      ctx.fillRect(X + Math.round(S(4)), Y + Math.round(S(5)), s - Math.round(S(8)), Math.round(S(4)));
      /* handle */
      ctx.fillStyle = '#e6c98a';
      ctx.fillRect(X + s - Math.round(S(6)), Y + Math.round(S(9)), Math.round(S(2)), Math.round(S(2)));

      const inward = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] }[d.face];
      const ax = X + inward[0] * s;
      const ay = Y + inward[1] * s;

      /* striped awning over the pavement, and warm light on it */
      ctx.fillStyle = colour;
      if (d.face === 'down' || d.face === 'up') {
        ctx.fillRect(X, d.face === 'down' ? Y + s : Y - Math.round(S(4)), s, Math.round(S(4)));
      } else {
        ctx.fillRect(d.face === 'right' ? X + s : X - Math.round(S(4)), Y, Math.round(S(4)), s);
      }
      /* warm light spilling out of the shop onto the pavement */
      glow(ax + s / 2, ay + s / 2, S(22), 'rgba(255, 228, 186, 0.45)', 0.38);

      /* hanging sign with the parcel symbol, on the street side */
      const sx = ax + s / 2;
      const sy = ay + s / 2;
      ctx.fillStyle = '#1d1a16';
      ctx.fillRect(sx - Math.round(S(8)), sy - Math.round(S(8)), Math.round(S(16)), Math.round(S(16)));
      ctx.fillStyle = '#fdfaf2';
      ctx.fillRect(sx - Math.round(S(7)), sy - Math.round(S(7)), Math.round(S(14)), Math.round(S(14)));
      symbol(SYMBOL[d.colour], sx, sy, S(4.6), colour);

      if (active) {
        const pulse = reduce() ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(clock / 260));
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#fdfaf2';
        ctx.lineWidth = Math.max(2, Math.round(scale));
        ctx.strokeRect(sx - Math.round(S(9)), sy - Math.round(S(9)), Math.round(S(18)), Math.round(S(18)));
        ctx.globalAlpha = 1;
        /* a chevron pointing at the door from the street side */
        const cx = sx - inward[0] * S(13);
        const cy = sy - inward[1] * S(13);
        ctx.fillStyle = '#fdfaf2';
        ctx.beginPath();
        ctx.moveTo(cx + inward[0] * S(5) - inward[1] * S(4), cy + inward[1] * S(5) - inward[0] * S(4));
        ctx.lineTo(cx + inward[0] * S(5) + inward[1] * S(4), cy + inward[1] * S(5) + inward[0] * S(4));
        ctx.lineTo(cx - inward[0] * S(3), cy - inward[1] * S(3));
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  function drawFish() {
    if (!state.fish) return;
    const cx = px(state.fish.tx * TILE + 8);
    const cy = px(state.fish.ty * TILE + 8) + (reduce() ? 0 : Math.round(Math.sin(clock / 260) * S(1.5)));
    glow(cx, cy, S(14), 'rgba(143, 214, 192, 0.55)', 0.5);
    ctx.fillStyle = '#a9ecd6';
    ctx.beginPath();
    ctx.ellipse(cx - S(1), cy, S(7), S(4.4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + S(5), cy);
    ctx.lineTo(cx + S(11), cy - S(5));
    ctx.lineTo(cx + S(11), cy + S(5));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d3b33';
    ctx.fillRect(cx - Math.round(S(3)), cy - Math.round(S(1)), Math.max(1, Math.round(scale)), Math.max(1, Math.round(scale)));
  }

  function drawCourier() {
    const rows = opts.atlas.dirRows;
    const f = opts.atlas.chars.frames.tabish;
    const hop = state.hop > 0 && !reduce() ? -Math.round(Math.sin((1 - state.hop / 340) * Math.PI) * S(5)) : 0;
    /* shadow keeps the courier planted on the street */
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(px(player.x), px(player.y) - Math.round(S(1)), S(6), S(2.6), 0, 0, Math.PI * 2);
    ctx.fill();

    if (state.boost > 0) glow(px(player.x), px(player.y) - S(8), S(20), 'rgba(143, 214, 192, 0.5)', 0.45);
    if (state.slow > 0) glow(px(player.x), px(player.y) - S(8), S(18), 'rgba(96, 156, 214, 0.5)', 0.4);

    const ps = Math.round(scale) + 1;
    const dx = Math.round(px(player.x) - 16 * ps);
    const dy = Math.round(px(player.y + 6) - 32 * ps) + hop;
    if (f && opts.images.chars) {
      const col = Math.min(7, player.frame);
      ctx.drawImage(opts.images.chars, f[0] + col * 32, f[1] + (rows[player.dir] || 0) * 32, 32, 32,
        dx, dy, 32 * ps, 32 * ps);
    }
    if (state.hop > 0 && reduce()) {
      ctx.strokeStyle = '#ffd9be';
      ctx.lineWidth = Math.max(2, Math.round(scale));
      ctx.strokeRect(dx + 8 * ps, dy + 6 * ps, 16 * ps, 24 * ps);
    }

    /* the parcel rides above the courier's head, big enough to read */
    if (state.carrying) {
      const c = state.carrying;
      const cx = px(player.x);
      const cy = px(player.y - 42) + hop;
      const pw = Math.round(S(18));
      const ph = Math.round(S(15));
      ctx.fillStyle = '#1d1a16';
      ctx.fillRect(cx - pw / 2 - Math.round(scale), cy - Math.round(scale), pw + Math.round(scale) * 2, ph + Math.round(scale) * 2);
      ctx.fillStyle = DARK[c];
      ctx.fillRect(cx - pw / 2, cy, pw, ph);
      ctx.fillStyle = COLOURS[c];
      ctx.fillRect(cx - pw / 2, cy, pw, Math.round(S(10)));
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(cx - pw / 2, cy + Math.round(S(9)), pw, Math.max(1, Math.round(scale)));
      symbol(SYMBOL[c], cx, cy + S(5), S(3.6), '#fdfaf2');
    }
  }

  function drawParticles() {
    particles.forEach((p) => {
      const a = Math.max(0, Math.min(1, p.life / 320));
      ctx.globalAlpha = a;
      if (p.ring) {
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = Math.max(2, Math.round(scale));
        ctx.beginPath();
        ctx.arc(px(p.x), px(p.y), S(p.size), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.colour;
        ctx.fillRect(px(p.x) - Math.round(S(p.size / 2)), px(p.y) - Math.round(S(p.size / 2)),
          Math.round(S(p.size)), Math.round(S(p.size)));
      }
      ctx.globalAlpha = 1;
    });
  }

  function drawFloats() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(7, Math.round(S(7)))}px "Space Mono", ui-monospace, monospace`;
    floats.forEach((f) => {
      /* keep the text inside the screen, including the headroom strip */
      const y = Math.max(px(f.y), -S(PAD_TOP) + Math.round(S(5)));
      const x = Math.min(Math.max(px(f.x), S(30)), S(COLS * TILE - 30));
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 420));
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(f.text, x + Math.max(1, Math.round(scale)), y + Math.max(1, Math.round(scale)));
      ctx.fillStyle = f.colour;
      ctx.fillText(f.text, x, y);
      ctx.globalAlpha = 1;
    });
  }

  function render() {
    if (!ctx || !state) return;
    const late = isPlaying() && state.time <= 10000;
    const w = COLS * TILE * scale;
    const h = ROWS * TILE * scale;

    ctx.clearRect(0, 0, w, h + S(PAD_TOP));
    ctx.save();
    ctx.translate(0, S(PAD_TOP));
    if (state.shake > 0) {
      const a = state.shake / 230;
      ctx.translate(Math.round(Math.sin(clock / 22) * S(2) * a), Math.round(Math.cos(clock / 17) * S(1.5) * a));
    }

    ctx.fillStyle = late ? '#1f1830' : '#161b22';
    ctx.fillRect(-S(8), -S(PAD_TOP + 8), w + S(16), h + S(PAD_TOP + 16));

    drawStreet(late);
    drawDepot();
    drawBuildings(late);
    drawDressing();
    drawPuddles();
    drawDoors();
    drawFish();
    drawCourier();
    drawParticles();
    drawFloats();

    if (state.flash > 0) {
      ctx.globalAlpha = Math.min(0.22, state.flash / 1100);
      ctx.fillStyle = state.flashColour;
      ctx.fillRect(0, -S(PAD_TOP), w, h + S(PAD_TOP));
      ctx.globalAlpha = 1;
    }
    if (late) {
      const pulse = reduce() ? 0.08 : 0.05 + 0.05 * Math.abs(Math.sin(clock / 320));
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ff7a5c';
      ctx.fillRect(0, -S(PAD_TOP), w, h + S(PAD_TOP));
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* 6 -------------------------------------------- hud, attract, results */

  function paintHud() {
    if (!hud || !state) return;
    const secs = Math.ceil(state.time / 1000);
    const comboColour = ['', '#fdfaf2', '#ffd9be', '#ffbf8a', '#ff9f6b', '#8fd6c0'][state.combo] || '#fdfaf2';
    hud.innerHTML =
      `<span class="cc-hud__cell"><small>score</small><b>${state.score}</b></span>` +
      `<span class="cc-hud__cell cc-hud__time${secs <= 10 && isPlaying() ? ' is-low' : ''}"><small>time</small><b>${secs}</b></span>` +
      `<span class="cc-hud__cell"><small>combo</small><b style="color:${comboColour}">×${state.combo}</b></span>` +
      `<span class="cc-hud__cell cc-hud__parcel"><small>deliver to</small>` +
      (state.carrying
        ? `<b><i style="background:${COLOURS[state.carrying]}"></i>${NAMES[state.carrying]}</b>`
        : '<b class="cc-hud__idle">the depot</b>') +
      '</span>';
    const best = host && host.querySelector('#ccBest');
    if (best) best.textContent = Number(window.Prefs.get(BEST_KEY, 0)) || 0;
  }

  const hideOverlay = (sel) => { const el = host && host.querySelector(sel); if (el) el.hidden = true; };

  function showAttract() {
    const touch = opts.coarse || window.innerWidth <= 760;
    const el = host.querySelector('.cc-attract');
    if (!el) return;
    const best = Number(window.Prefs.get(BEST_KEY, 0)) || 0;
    el.hidden = false;
    el.innerHTML =
      `<p class="cc-attract__kicker">the town parcel service presents</p>
       <h2 class="cc-attract__title">CAT COURIER</h2>
       <p class="cc-attract__sub">75 seconds · take each parcel to the shopfront with the same colour and symbol</p>
       <p class="cc-attract__best">${best ? 'best run · ' + best : 'no score on the machine yet'}</p>
       <button class="cc-btn cc-btn--go cc-btn--big" type="button" data-cc="start">start game</button>
       <p class="cc-attract__keys">${touch
         ? 'the pad moves you · pause and exit are under the screen'
         : 'arrows or wasd to move · p pauses · esc leaves the cabinet'}</p>`;
    const btn = el.querySelector('[data-cc="start"]');
    if (btn) btn.focus({ preventScroll: true });
  }

  function showResult(best) {
    const box = host.querySelector('.cc-result');
    if (!box) return;
    const line = RESULT_LINES[Math.min(RESULT_LINES.length - 1, Math.floor(state.delivered / 2))];
    box.hidden = false;
    box.innerHTML =
      `<h2 class="cc-result__head">${state.newBest ? 'new best!' : "time's up"}</h2>
       <p class="cc-result__score">${state.score}</p>
       <dl class="cc-result__grid">
         <div><dt>delivered</dt><dd>${state.delivered}</dd></div>
         <div><dt>best combo</dt><dd>×${state.bestCombo}</dd></div>
         <div><dt>high score</dt><dd>${best}</dd></div>
       </dl>
       <p class="cc-result__line">${line}</p>
       <div class="cc-result__row">
         <button class="cc-btn cc-btn--go" type="button" data-cc="again">play again</button>
         <button class="cc-btn" type="button" data-cc="exit">exit to arcade</button>
       </div>`;
    const again = box.querySelector('[data-cc="again"]');
    if (again) again.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- sound */

  let audioCtx = null;
  function beep(freq, dur) {
    if (!opts.sound || !opts.sound()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.035, now);
      g.gain.exponentialRampToValueAtTime(0.004, now + dur);
      osc.start(now);
      osc.stop(now + dur);
    } catch (err) {
      /* quiet cabinet */
    }
  }

  /* 7 ------------------------------------------------------ loop and wiring */

  function loop(now) {
    raf = null;
    if (!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (paused || document.hidden) return;
    update(dt);
    render();
    if (isPlaying()) paintHud();
    /* the results screen is DOM: let the particles settle, then stop */
    if (isOver() && !particles.length && !floats.length) return;
    raf = requestAnimationFrame(loop);
  }

  function wake() {
    if (!running || raf || paused || document.hidden) return;
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
  };

  const SHELL = `
    <div class="cc" role="group" aria-label="Cat Courier, an arcade game">
      <div class="cc-cab">
        <div class="cc-marquee">
          <span class="cc-marquee__bolt" aria-hidden="true"></span>
          <span class="cc-marquee__title">CAT COURIER</span>
          <span class="cc-marquee__best">high score <b id="ccBest">0</b></span>
          <span class="cc-marquee__bolt" aria-hidden="true"></span>
        </div>
        <div class="cc-hud" id="ccHud"></div>
        <div class="cc-screen">
          <div class="cc-crt">
            <canvas id="ccCanvas"></canvas>
            <div class="cc-scan" aria-hidden="true"></div>
            <div class="cc-attract" hidden></div>
            <div class="cc-result" hidden></div>
            <div class="cc-pause" hidden><p>paused</p><button class="cc-btn cc-btn--go" type="button" data-cc="pause">resume</button></div>
            <div class="cc-touch" id="ccTouch" hidden>
              <div class="cc-dpad" role="group" aria-label="Move">
                <button class="cc-d cc-d--up" type="button" data-ccmove="up" aria-label="Up">▲</button>
                <button class="cc-d cc-d--left" type="button" data-ccmove="left" aria-label="Left">◀</button>
                <button class="cc-d cc-d--right" type="button" data-ccmove="right" aria-label="Right">▶</button>
                <button class="cc-d cc-d--down" type="button" data-ccmove="down" aria-label="Down">▼</button>
              </div>
            </div>
          </div>
        </div>
        <div class="cc-deck">
          <button class="cc-btn" type="button" data-cc="pause">pause</button>
          <button class="cc-btn" type="button" data-cc="restart">restart</button>
          <button class="cc-btn cc-btn--out" type="button" data-cc="exit">exit to arcade</button>
        </div>
      </div>
    </div>`;

  function start(mount, options) {
    if (running) return;
    host = mount;
    opts = options;
    host.innerHTML = SHELL;
    controller = new AbortController();
    const signal = controller.signal;
    const on = (el, type, fn, o) => el && el.addEventListener(type, fn, Object.assign({ signal }, o || {}));

    canvas = host.querySelector('#ccCanvas');
    hud = host.querySelector('#ccHud');
    buildGrid();
    reset('attract');
    running = true;
    paused = false;
    clock = 0;
    resize();
    paintHud();
    showAttract();

    if (opts.coarse || window.innerWidth <= 760) host.querySelector('#ccTouch').hidden = false;

    on(host, 'click', (e) => {
      const btn = e.target.closest('[data-cc]');
      if (!btn) return;
      const act = btn.dataset.cc;
      if (act === 'exit') { stop(); if (opts.onExit) opts.onExit(); }
      else if (act === 'start' || act === 'again' || act === 'restart') startRound();
      else if (act === 'pause') togglePause();
    });

    on(window, 'keydown', (e) => {
      const dir = KEYMAP[e.key];
      if (dir) { held[dir] = true; e.preventDefault(); wake(); return; }
      if (e.key === 'Escape') { e.preventDefault(); stop(); if (opts.onExit) opts.onExit(); }
      else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); startRound(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        if (isPlaying()) return;
        e.preventDefault();
        startRound();
      }
    }, { capture: true });

    on(window, 'keyup', (e) => {
      const dir = KEYMAP[e.key];
      if (dir) held[dir] = false;
    }, { capture: true });

    on(window, 'blur', () => Object.keys(held).forEach((k) => (held[k] = false)));
    on(window, 'resize', () => { resize(); render(); });
    on(document, 'visibilitychange', () => { if (!document.hidden) wake(); });

    const touch = host.querySelector('#ccTouch');
    if (touch) {
      on(touch, 'pointerdown', (e) => {
        const b = e.target.closest('[data-ccmove]');
        if (!b) return;
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        held[b.dataset.ccmove] = true;
        wake();
      });
      const release = (e) => {
        const b = e.target.closest('[data-ccmove]');
        if (b) held[b.dataset.ccmove] = false;
      };
      on(touch, 'pointerup', release);
      on(touch, 'pointercancel', release);
      on(touch, 'pointerleave', release);
    }

    render();
    /* the cabinet is laid out by flexbox: measure again once it has settled,
       or the screen well is still zero-height and the game renders small */
    setTimeout(() => { if (running) { resize(); render(); } }, 0);
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!isPlaying()) return;
    paused = !paused;
    const box = host && host.querySelector('.cc-pause');
    if (box) box.hidden = !paused;
    if (!paused) wake();
  }

  function stop() {
    running = false;
    paused = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (controller) controller.abort();
    controller = null;
    Object.keys(held).forEach((k) => (held[k] = false));
    particles = [];
    floats = [];
    canvas = null;
    ctx = null;
    hud = null;
    if (host) host.innerHTML = '';
    host = null;
  }

  return { start, stop, resize, isRunning: () => running };
})();
