/* ==========================================================================
   arcade-extra.js — the other two cabinets

   CAT COURIER is a walking game, and one walking game is the whole arcade if
   nothing else in the room works. These two are deliberately not that: one is
   played entirely on the beat, the other is two nervous button presses and a
   long wait to find out whether you got away with it.

     BEAT STREET   four lanes, notes falling, hit them in time
     GRABBER       a claw, a grip meter, and a cat that is too heavy

   Both wear the same cabinet as CAT COURIER — same markup, same `cc-` styles,
   same contract back to game.js — so the arcade reads as one room rather than
   three separate toys.

     1  the shared cabinet: canvas, loop, input, overlays, sound
     2  BEAT STREET
     3  GRABBER
     4  what game.js gets
   ========================================================================== */

window.ArcadeExtra = (function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* 1 ---------------------------------------------------------- the cabinet */

  /* Everything a cabinet does that is not the game itself. A spec supplies
     the internal pixel space, the chart or the prize pile, and four hooks:
     reset, update, render, press. */
  function cabinet(spec) {
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
    let g = null;                      /* the round: the game's own state bag */

    const best = () => Number(window.Prefs.get(spec.bestKey, 0)) || 0;
    const reduce = () => !!(opts && opts.reduceMotion);
    const touchWanted = () => !!(opts && opts.coarse) || window.innerWidth <= 760;

    /* --- sound: the same small square-wave blip the other cabinet uses --- */
    let audioCtx = null;
    function beep(freq, dur, type) {
      if (!opts || !opts.sound || !opts.sound()) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.004, now + dur);
        osc.start(now);
        osc.stop(now + dur);
      } catch (err) {
        /* a quiet cabinet is still a cabinet */
      }
    }

    /* --- the round ------------------------------------------------------ */

    function reset(phase) {
      g = {
        phase: phase,
        score: 0,
        newBest: false,
        clock: 0,
        floats: [],
        beep: beep,
        reduce: reduce,
        W: spec.W,
        H: spec.H
      };
      spec.reset(g);
    }

    const isPlaying = () => g && g.phase === 'playing';
    const isOver = () => g && g.phase === 'over';

    function startRound() {
      hideOverlay('.cc-attract');
      hideOverlay('.cc-result');
      reset('playing');
      paused = false;
      hideOverlay('.cc-pause');
      paintHud();
      wake();
    }

    function finish() {
      g.phase = 'over';
      const prev = best();
      if (g.score > prev) {
        g.newBest = true;
        window.Prefs.set(spec.bestKey, g.score);
      }
      if (opts && opts.onScore && g.score > 0) opts.onScore(g.score);
      paintHud();
      showResult(Math.max(prev, g.score));
    }

    /* a bit of text that rises and fades: the only feedback both games share */
    function float(text, x, y, colour) {
      if (reduce()) return;
      g.floats.push({ text: text, x: x, y: y, life: 1, colour: colour || '#fdfaf2' });
      if (g.floats.length > 24) g.floats.shift();
    }

    /* --- painting ------------------------------------------------------- */

    function resize() {
      if (!canvas || !host) return;
      const well = host.querySelector('.cc-screen');
      const box = (well || canvas.parentElement).getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fit = Math.min((box.width - 10) / spec.W, (box.height - 10) / spec.H);
      scale = fit >= 2 ? Math.min(4, Math.floor(fit)) : Math.max(1, fit);
      const shown = Math.max(scale, Math.min(fit, scale + 0.98));
      canvas.style.width = Math.round(spec.W * shown) + 'px';
      canvas.style.height = Math.round(spec.H * shown) + 'px';
      canvas.width = Math.floor(spec.W * scale * dpr);
      canvas.height = Math.floor(spec.H * scale * dpr);
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.textBaseline = 'middle';
    }

    function render() {
      if (!ctx || !g) return;
      spec.render(g, ctx);
      /* the floats sit on top of whatever the game drew */
      ctx.textAlign = 'center';
      g.floats.forEach((f) => {
        ctx.globalAlpha = clamp(f.life, 0, 1);
        ctx.fillStyle = f.colour;
        ctx.font = 'bold 9px ui-monospace, monospace';
        ctx.fillText(f.text, f.x, f.y - (1 - f.life) * 14);
      });
      ctx.globalAlpha = 1;
    }

    function paintHud() {
      if (!hud || !g) return;
      hud.innerHTML = spec.hud(g)
        .map((c) => `<span class="cc-hud__cell${c.cls ? ' ' + c.cls : ''}">`
          + `<small>${c.label}</small><b${c.colour ? ` style="color:${c.colour}"` : ''}>${c.value}</b></span>`)
        .join('');
      const el = host && host.querySelector('.cc-marquee__best b');
      if (el) el.textContent = best();
    }

    const hideOverlay = (sel) => {
      const el = host && host.querySelector(sel);
      if (el) el.hidden = true;
    };

    function showAttract() {
      const el = host.querySelector('.cc-attract');
      if (!el) return;
      const b = best();
      el.hidden = false;
      el.innerHTML =
        `<p class="cc-attract__kicker">${spec.kicker}</p>
         <h2 class="cc-attract__title">${spec.title}</h2>
         <p class="cc-attract__sub">${spec.sub}</p>
         <p class="cc-attract__best">${b ? 'best run · ' + b : 'no score on the machine yet'}</p>
         <button class="cc-btn cc-btn--go cc-btn--big" type="button" data-cc="start">start game</button>
         <p class="cc-attract__keys">${touchWanted() ? spec.hintTouch : spec.hintKeys}</p>`;
      const btn = el.querySelector('[data-cc="start"]');
      if (btn) btn.focus({ preventScroll: true });
    }

    function showResult(high) {
      const box = host.querySelector('.cc-result');
      if (!box) return;
      box.hidden = false;
      box.innerHTML =
        `<h2 class="cc-result__head">${g.newBest ? 'new best!' : spec.overHead}</h2>
         <p class="cc-result__score">${g.score}</p>
         <dl class="cc-result__grid">${spec.stats(g)
          .map((s) => `<div><dt>${s.label}</dt><dd>${s.value}</dd></div>`).join('')}
           <div><dt>high score</dt><dd>${high}</dd></div>
         </dl>
         <p class="cc-result__line">${spec.line(g)}</p>
         <div class="cc-result__row">
           <button class="cc-btn cc-btn--go" type="button" data-cc="again">play again</button>
           <button class="cc-btn" type="button" data-cc="exit">exit to arcade</button>
         </div>`;
      const again = box.querySelector('[data-cc="again"]');
      if (again) again.focus({ preventScroll: true });
    }

    /* --- loop ----------------------------------------------------------- */

    function loop(now) {
      raf = null;
      if (!running) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      if (paused || document.hidden) return;
      g.clock += dt * 1000;
      g.floats.forEach((f) => { f.life -= dt * 1.4; });
      g.floats = g.floats.filter((f) => f.life > 0);
      if (isPlaying() && spec.update(g, dt) === 'over') finish();
      render();
      if (isPlaying()) paintHud();
      if (isOver() && !g.floats.length) return;
      raf = requestAnimationFrame(loop);
    }

    function wake() {
      if (!running || raf || paused || document.hidden) return;
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

    /* --- wiring --------------------------------------------------------- */

    const shell = () => `
      <div class="cc" role="group" aria-label="${spec.title}, an arcade game">
        <div class="cc-cab">
          <div class="cc-marquee">
            <span class="cc-marquee__bolt" aria-hidden="true"></span>
            <span class="cc-marquee__title">${spec.title}</span>
            <span class="cc-marquee__best">high score <b>0</b></span>
            <span class="cc-marquee__bolt" aria-hidden="true"></span>
          </div>
          <div class="cc-hud"></div>
          <div class="cc-screen">
            <div class="cc-crt">
              <canvas></canvas>
              <div class="cc-scan" aria-hidden="true"></div>
              <div class="cc-attract" hidden></div>
              <div class="cc-result" hidden></div>
              <div class="cc-pause" hidden><p>paused</p><button class="cc-btn cc-btn--go" type="button" data-cc="pause">resume</button></div>
              <div class="cc-touch" hidden>${spec.touchHtml}</div>
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
      opts = options || {};
      host.innerHTML = shell();
      controller = new AbortController();
      const signal = controller.signal;
      const on = (el, type, fn, o) => el && el.addEventListener(type, fn, Object.assign({ signal: signal }, o || {}));

      canvas = host.querySelector('canvas');
      hud = host.querySelector('.cc-hud');
      reset('attract');
      running = true;
      paused = false;
      resize();
      paintHud();
      showAttract();
      if (touchWanted()) host.querySelector('.cc-touch').hidden = false;

      on(host, 'click', (e) => {
        const btn = e.target.closest('[data-cc]');
        if (!btn) return;
        const act = btn.dataset.cc;
        if (act === 'exit') { stop(); if (opts.onExit) opts.onExit(); }
        else if (act === 'start' || act === 'again' || act === 'restart') startRound();
        else if (act === 'pause') togglePause();
      });

      on(window, 'keydown', (e) => {
        if (e.repeat) return;
        const action = spec.keys[e.key];
        if (action && isPlaying() && !paused) { e.preventDefault(); spec.press(g, action); wake(); return; }
        if (e.key === 'Escape') { e.preventDefault(); stop(); if (opts.onExit) opts.onExit(); }
        else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); startRound(); }
        else if ((e.key === 'Enter' || e.key === ' ') && !isPlaying()) { e.preventDefault(); startRound(); }
      }, { capture: true });

      const pad = host.querySelector('.cc-touch');
      on(pad, 'pointerdown', (e) => {
        const b = e.target.closest('[data-ccpress]');
        if (!b) return;
        e.preventDefault();
        if (!isPlaying() || paused) return;
        spec.press(g, b.dataset.ccpress);
        wake();
      });

      on(window, 'resize', () => { resize(); render(); });
      on(document, 'visibilitychange', () => { if (!document.hidden) wake(); });

      render();
      /* the cabinet is laid out by flexbox: measure again once it has settled,
         or the screen well is still zero-height and the game renders small */
      setTimeout(() => { if (running) { resize(); render(); } }, 0);
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      paused = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (controller) controller.abort();
      controller = null;
      g = null;
      canvas = null;
      ctx = null;
      hud = null;
      if (host) host.innerHTML = '';
      host = null;
    }

    return { start: start, stop: stop, resize: resize, isRunning: () => running };
  }

  /* 2 --------------------------------------------------------- BEAT STREET */

  const LANES = ['left', 'down', 'up', 'right'];
  const LANE_GLYPH = { left: '◀', down: '▼', up: '▲', right: '▶' };
  const LANE_COLOUR = { left: '#ff9f6b', down: '#8fd6c0', up: '#c9a6ff', right: '#7fc2ff' };

  const BPM = 128;
  const BEAT_MS = 60000 / BPM;
  const LEAD_IN = 2400;                /* silence before the first note */
  const FALL_MS = 1500;                /* a note's trip down the lane */
  const BARS = 20;
  const HIT_Y = 150;
  const TOP_Y = -14;
  const PERFECT_MS = 58;
  const GOOD_MS = 118;

  /* The same eight bars since 2019, and the seed says so. A fixed chart means
     the machine is learnable, which is the whole point of a rhythm cabinet. */
  function chart() {
    let s = 20190108;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const notes = [];
    const taken = {};
    const add = (t, lane) => {
      const key = Math.round(t) + ':' + lane;
      if (taken[key]) return;
      taken[key] = 1;
      notes.push({ t: t, lane: lane, judged: 0 });
    };
    for (let bar = 0; bar < BARS; bar += 1) {
      const heat = bar / (BARS - 1);
      for (let step = 0; step < 8; step += 1) {       /* eighth notes */
        const onBeat = step % 2 === 0;
        const chance = onBeat ? 0.58 + heat * 0.36 : heat * 0.5;
        if (rnd() > chance) continue;
        const t = LEAD_IN + (bar * 4 + step / 2) * BEAT_MS;
        add(t, LANES[Math.floor(rnd() * 4) % 4]);
        /* once it has warmed up, the strong beats get a second hand */
        if (heat > 0.5 && onBeat && rnd() > 0.8) add(t, LANES[Math.floor(rnd() * 4) % 4]);
      }
    }
    notes.sort((a, b) => a.t - b.t);
    return notes;
  }

  const CHART_MS = LEAD_IN + BARS * 4 * BEAT_MS + 1800;
  const laneX = (lane) => 26 + LANES.indexOf(lane) * 48;
  const LANE_W = 40;

  const BEAT_STREET = {
    id: 'beat',
    title: 'BEAT STREET',
    kicker: 'the arrows still light up',
    sub: 'Hit each arrow as it crosses the line. The chart never changes, so you can learn it.',
    hintKeys: 'arrow keys · p pauses · esc leaves the cabinet',
    hintTouch: 'the four pads are the four lanes · pause and exit are under the screen',
    overHead: 'set complete',
    bestKey: 'fieldtrip.arcade.beat.v1',
    W: 218,
    H: 180,
    keys: {
      ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right',
      a: 'left', s: 'down', w: 'up', d: 'right',
      A: 'left', S: 'down', W: 'up', D: 'right'
    },
    touchHtml: `
      <div class="cc-dpad" role="group" aria-label="Lanes">
        <button class="cc-d cc-d--up" type="button" data-ccpress="up" aria-label="Up lane">▲</button>
        <button class="cc-d cc-d--left" type="button" data-ccpress="left" aria-label="Left lane">◀</button>
        <button class="cc-d cc-d--right" type="button" data-ccpress="right" aria-label="Right lane">▶</button>
        <button class="cc-d cc-d--down" type="button" data-ccpress="down" aria-label="Down lane">▼</button>
      </div>`,

    reset(g) {
      g.notes = chart();
      g.now = 0;
      g.combo = 0;
      g.bestCombo = 0;
      g.perfect = 0;
      g.good = 0;
      g.missed = 0;
      g.flash = { left: 0, down: 0, up: 0, right: 0 };
      g.pulse = 0;
    },

    update(g, dt) {
      g.now += dt * 1000;
      g.pulse = Math.max(0, g.pulse - dt * 3);
      LANES.forEach((l) => { g.flash[l] = Math.max(0, g.flash[l] - dt * 5); });

      /* a note that has gone past the window without being hit is a miss */
      g.notes.forEach((n) => {
        if (n.judged || g.now - n.t <= GOOD_MS) return;
        n.judged = -1;
        g.missed += 1;
        g.combo = 0;
      });

      /* the four-on-the-floor pulse, so the screen breathes on the beat */
      if (g.now > LEAD_IN - BEAT_MS) {
        const since = (g.now - LEAD_IN) % BEAT_MS;
        if (since < dt * 1000) g.pulse = 1;
      }
      return g.now >= CHART_MS ? 'over' : null;
    },

    press(g, lane) {
      g.flash[lane] = 1;
      /* the nearest unjudged note in that lane, in either direction */
      let best = null;
      let bestD = Infinity;
      g.notes.forEach((n) => {
        if (n.judged || n.lane !== lane) return;
        const d = Math.abs(n.t - g.now);
        if (d < bestD) { bestD = d; best = n; }
      });
      if (!best || bestD > GOOD_MS) return;      /* a stray press costs nothing */

      const mult = 1 + Math.min(4, Math.floor(g.combo / 8));
      if (bestD <= PERFECT_MS) {
        best.judged = 2;
        g.perfect += 1;
        g.combo += 1;
        g.score += 120 * mult;
        this._say(g, lane, 'PERFECT', '#8fd6c0');
        g.beep(880, 0.05);
      } else {
        best.judged = 1;
        g.good += 1;
        g.combo += 1;
        g.score += 55 * mult;
        this._say(g, lane, 'good', '#ffd9be');
        g.beep(620, 0.05);
      }
      g.bestCombo = Math.max(g.bestCombo, g.combo);
    },

    _say(g, lane, text, colour) {
      if (g.reduce()) return;
      g.floats.push({ text: text, x: laneX(lane) + LANE_W / 2, y: HIT_Y - 16, life: 1, colour: colour });
      if (g.floats.length > 24) g.floats.shift();
    },

    render(g, ctx) {
      const W = g.W;
      const H = g.H;
      ctx.fillStyle = '#141019';
      ctx.fillRect(0, 0, W, H);

      /* lanes */
      LANES.forEach((lane) => {
        const x = laneX(lane);
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.fillRect(x, 0, LANE_W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x, 0, 1, H);
        ctx.fillRect(x + LANE_W - 1, 0, 1, H);
      });

      /* the hit line, brighter on the beat */
      const glow = 0.4 + g.pulse * 0.45;
      ctx.fillStyle = `rgba(255, 217, 190, ${glow})`;
      ctx.fillRect(14, HIT_Y - 1, W - 28, 2);

      /* the receptors: one per lane, lit while that lane is being pressed */
      LANES.forEach((lane) => {
        const x = laneX(lane);
        const f = g.flash[lane];
        ctx.globalAlpha = 1;
        ctx.fillStyle = f > 0 ? LANE_COLOUR[lane] : 'rgba(255,255,255,0.14)';
        ctx.fillRect(x + 3, HIT_Y - 9, LANE_W - 6, 18);
        ctx.fillStyle = f > 0 ? '#141019' : 'rgba(255,255,255,0.45)';
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(LANE_GLYPH[lane], x + LANE_W / 2, HIT_Y);
      });

      /* the notes still on their way down */
      g.notes.forEach((n) => {
        if (n.judged > 0) return;
        const y = HIT_Y - ((n.t - g.now) / FALL_MS) * (HIT_Y - TOP_Y);
        if (y < TOP_Y - 12 || y > HIT_Y + 14) return;
        const x = laneX(n.lane);
        ctx.globalAlpha = n.judged === -1 ? 0.25 : 1;
        ctx.fillStyle = LANE_COLOUR[n.lane];
        ctx.fillRect(x + 3, Math.round(y) - 6, LANE_W - 6, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x + 3, Math.round(y) + 3, LANE_W - 6, 3);
      });
      ctx.globalAlpha = 1;

      /* combo, centred above the lanes */
      if (g.combo >= 4) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd9be';
        ctx.font = 'bold 15px ui-monospace, monospace';
        ctx.fillText(g.combo, W / 2, 34);
        ctx.fillStyle = 'rgba(253,250,242,0.5)';
        ctx.font = 'bold 7px ui-monospace, monospace';
        ctx.fillText('COMBO', W / 2, 46);
      }

      /* the count-in, so the first note is never a surprise */
      if (g.now < LEAD_IN) {
        const left = Math.ceil((LEAD_IN - g.now) / BEAT_MS);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(253,250,242,0.75)';
        ctx.font = 'bold 20px ui-monospace, monospace';
        ctx.fillText(left <= 4 ? String(left) : 'READY', W / 2, 80);
      }

      /* how far through the loop we are */
      const p = clamp(g.now / CHART_MS, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(14, H - 8, W - 28, 3);
      ctx.fillStyle = '#c9a6ff';
      ctx.fillRect(14, H - 8, (W - 28) * p, 3);
    },

    hud(g) {
      const total = g.perfect + g.good + g.missed;
      const acc = total ? Math.round(((g.perfect + g.good * 0.5) / total) * 100) : 100;
      return [
        { label: 'score', value: g.score },
        { label: 'combo', value: '×' + g.combo, colour: g.combo >= 8 ? '#8fd6c0' : '#fdfaf2' },
        { label: 'perfect', value: g.perfect },
        { label: 'accuracy', value: acc + '%' }
      ];
    },

    stats(g) {
      return [
        { label: 'perfect', value: g.perfect },
        { label: 'good', value: g.good },
        { label: 'missed', value: g.missed },
        { label: 'best combo', value: '×' + g.bestCombo }
      ];
    },

    line(g) {
      if (g.missed === 0) return 'Every note, no misses. That’s a perfect set.';
      if (g.bestCombo >= 40) return `A ${g.bestCombo}-note combo. That’s a proper run.`;
      if (g.perfect > g.good) return 'More perfects than goods, so your timing’s already there.';
      if (g.missed > 30) return 'Lots of misses, but the chart never changes, so the next go gets easier.';
      return 'The chart’s the same every time. One more go?';
    }
  };

  /* 3 ------------------------------------------------------------- GRABBER */

  /* Real cranes vary the grip: firm at the bottom, weaker on the way up, which
     is why the prize lets go halfway. Here that is the whole game — the second
     button press sets how firm, and heavy prizes need a firmer one. */

  const PRIZES = [
    { kind: 'fish', w: 16, h: 11, value: 25, grip: 0.24, body: '#7fc2ff', trim: '#4f86c6' },
    { kind: 'bunny', w: 14, h: 16, value: 45, grip: 0.42, body: '#f4e3d7', trim: '#d8b7a4' },
    { kind: 'star', w: 15, h: 15, value: 70, grip: 0.6, body: '#ffd166', trim: '#d9a132' },
    { kind: 'cat', w: 17, h: 15, value: 120, grip: 0.82, body: '#ff9f6b', trim: '#c9713f' }
  ];

  const GLASS = { x: 18, y: 26, w: 184, h: 132 };
  const FLOOR_Y = GLASS.y + GLASS.h - 6;
  const CHUTE_X = GLASS.x + 12;
  const CLAW_Y = GLASS.y + 10;
  const TRIES = 8;

  function pile() {
    const out = [];
    /* two rows, back row higher up the glass, all of them clear of the chute */
    for (let row = 0; row < 2; row += 1) {
      const y = FLOOR_Y - row * 15;
      for (let i = 0; i < 5; i += 1) {
        const spec = PRIZES[Math.floor(Math.random() * PRIZES.length)];
        const x = GLASS.x + 34 + i * 31 + (row ? 9 : 0) + Math.random() * 6;
        if (x > GLASS.x + GLASS.w - 20) continue;
        out.push({
          kind: spec.kind, value: spec.value, grip: spec.grip,
          body: spec.body, trim: spec.trim,
          w: spec.w, h: spec.h, x: x, y: y, taken: false
        });
      }
    }
    return out;
  }

  function drawPrize(ctx, p, cx, cy) {
    const x = Math.round(cx - p.w / 2);
    const y = Math.round(cy - p.h);
    ctx.fillStyle = p.body;
    if (p.kind === 'fish') {
      ctx.fillRect(x + 4, y + 2, p.w - 5, p.h - 4);
      ctx.beginPath();
      ctx.moveTo(x + 4, y + p.h / 2);
      ctx.lineTo(x - 1, y + 1);
      ctx.lineTo(x - 1, y + p.h - 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.trim;
      ctx.fillRect(x + 6, y + 4, p.w - 9, 2);
    } else if (p.kind === 'bunny') {
      ctx.fillRect(x + 2, y + 5, p.w - 4, p.h - 5);   /* body */
      ctx.fillRect(x + 3, y, 3, 6);                   /* ears */
      ctx.fillRect(x + p.w - 6, y, 3, 6);
      ctx.fillStyle = p.trim;
      ctx.fillRect(x + 4, y + 1, 1, 4);
      ctx.fillRect(x + p.w - 5, y + 1, 1, 4);
    } else if (p.kind === 'star') {
      const c = x + p.w / 2;
      const m = y + p.h / 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? p.w * 0.22 : p.w * 0.5;
        ctx[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, m + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x + 2, y + 5, p.w - 4, p.h - 5);   /* body */
      ctx.beginPath();                                /* ears */
      ctx.moveTo(x + 3, y + 6); ctx.lineTo(x + 5, y); ctx.lineTo(x + 8, y + 6);
      ctx.moveTo(x + p.w - 3, y + 6); ctx.lineTo(x + p.w - 5, y); ctx.lineTo(x + p.w - 8, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.trim;
      ctx.fillRect(x + 3, y + 9, p.w - 6, 2);
    }
    /* everyone gets eyes */
    if (p.kind !== 'star') {
      ctx.fillStyle = '#2b2430';
      ctx.fillRect(x + 5, y + (p.kind === 'fish' ? 4 : 8), 2, 2);
      ctx.fillRect(x + p.w - 7, y + (p.kind === 'fish' ? 4 : 8), 2, 2);
    }
  }

  const GRABBER = {
    id: 'claw',
    title: 'GRABBER',
    kicker: 'the claw machine',
    sub: 'Eight goes. Stop the claw over a prize, then set the grip. Heavier prizes need a firmer grip, and they’re worth more.',
    hintKeys: 'space or enter to stop the claw, again to set the grip · p pauses · esc leaves',
    hintTouch: 'the big button stops the claw, then sets the grip · pause and exit are under the screen',
    overHead: 'out of goes',
    bestKey: 'fieldtrip.arcade.claw.v1',
    W: 220,
    H: 180,
    keys: { ' ': 'go', Enter: 'go', ArrowDown: 'go' },
    touchHtml: `
      <div class="cc-onebtn">
        <button class="cc-btn cc-btn--go cc-btn--big" type="button" data-ccpress="go">drop</button>
      </div>`,

    reset(g) {
      g.prizes = pile();
      g.tries = TRIES;
      g.won = [];
      g.phase2 = 'aim';          /* aim -> grip -> down -> close -> up -> home -> drop */
      g.clawX = GLASS.x + 30;
      g.clawY = CLAW_Y;
      g.dirX = 1;
      g.grip = 0;
      g.gripBar = 0;
      g.gripUp = true;
      g.held = null;
      g.open = 1;                /* 1 open, 0 shut */
      g.slipRoll = 0;
      g.message = '';
    },

    update(g, dt) {
      const s = dt * 1000;
      if (g.phase2 === 'aim') {
        g.clawX += g.dirX * 62 * dt;
        if (g.clawX > GLASS.x + GLASS.w - 16) { g.clawX = GLASS.x + GLASS.w - 16; g.dirX = -1; }
        if (g.clawX < GLASS.x + 14) { g.clawX = GLASS.x + 14; g.dirX = 1; }
      } else if (g.phase2 === 'grip') {
        const rate = 1.35;
        g.gripBar += (g.gripUp ? 1 : -1) * rate * dt;
        if (g.gripBar >= 1) { g.gripBar = 1; g.gripUp = false; }
        if (g.gripBar <= 0) { g.gripBar = 0; g.gripUp = true; }
      } else if (g.phase2 === 'down') {
        g.clawY += 78 * dt;
        const target = this._under(g);
        const stop = target ? target.y - target.h + 4 : FLOOR_Y - 2;
        if (g.clawY >= stop) { g.clawY = stop; g.phase2 = 'close'; g.closeT = 0; g.beep(220, 0.08); }
      } else if (g.phase2 === 'close') {
        g.closeT += s;
        g.open = clamp(1 - g.closeT / 260, 0, 1);
        if (g.closeT > 320) {
          const target = this._under(g);
          if (target) {
            target.taken = true;
            g.held = target;
            /* grip beyond what the prize needs is the margin you keep */
            g.slipRoll = g.grip - target.grip;
          } else {
            g.held = null;
          }
          g.phase2 = 'up';
        }
      } else if (g.phase2 === 'up') {
        g.clawY -= 66 * dt;
        if (g.held && g.slipRoll < 0) {
          /* short of the grip it needed: it lets go somewhere on the way up */
          const risk = Math.min(0.95, -g.slipRoll) * 1.9 * dt;
          if (Math.random() < risk) {
            g.held.taken = false;
            g.held.y = FLOOR_Y;
            g.held.x = clamp(g.clawX, GLASS.x + 24, GLASS.x + GLASS.w - 16);
            this._float(g, 'slipped!', g.clawX, g.clawY + 20, '#ff9c8a');
            g.beep(150, 0.16, 'sawtooth');
            g.held = null;
          }
        }
        if (g.clawY <= CLAW_Y) { g.clawY = CLAW_Y; g.phase2 = g.held ? 'home' : 'reset'; }
      } else if (g.phase2 === 'home') {
        g.clawX += (CHUTE_X - g.clawX) * Math.min(1, dt * 3.4);
        if (Math.abs(g.clawX - CHUTE_X) < 1.5) { g.clawX = CHUTE_X; g.phase2 = 'drop'; g.dropT = 0; }
      } else if (g.phase2 === 'drop') {
        g.dropT += s;
        g.open = clamp(g.dropT / 220, 0, 1);
        if (g.dropT > 260) {
          g.score += g.held.value;
          g.won.push(g.held);
          this._float(g, '+' + g.held.value, CHUTE_X, GLASS.y + 40, '#8fd6c0');
          g.beep(760, 0.12);
          g.held = null;
          g.phase2 = 'reset';
        }
      } else if (g.phase2 === 'reset') {
        g.open = 1;
        g.tries -= 1;
        if (g.tries <= 0) return 'over';
        if (!g.prizes.some((p) => !p.taken)) return 'over';
        g.phase2 = 'aim';
      }
      return null;
    },

    /* the prize the claw is currently over: the highest one it would reach */
    _under(g) {
      let best = null;
      g.prizes.forEach((p) => {
        if (p.taken) return;
        if (Math.abs(p.x - g.clawX) > p.w / 2 + 3) return;
        if (!best || p.y - p.h < best.y - best.h) best = p;
      });
      return best;
    },

    _float(g, text, x, y, colour) {
      if (g.reduce()) return;
      g.floats.push({ text: text, x: x, y: y, life: 1, colour: colour });
      if (g.floats.length > 24) g.floats.shift();
    },

    press(g) {
      if (g.phase2 === 'aim') {
        g.phase2 = 'grip';
        g.gripBar = 0;
        g.gripUp = true;
        g.beep(420, 0.05);
      } else if (g.phase2 === 'grip') {
        g.grip = g.gripBar;
        g.phase2 = 'down';
        g.beep(520, 0.05);
      }
    },

    render(g, ctx) {
      const W = g.W;
      const H = g.H;
      ctx.fillStyle = '#1b1424';
      ctx.fillRect(0, 0, W, H);

      /* the cabinet: glass box, chute mouth, rail along the top */
      ctx.fillStyle = '#241a30';
      ctx.fillRect(GLASS.x - 4, GLASS.y - 8, GLASS.w + 8, GLASS.h + 12);
      ctx.fillStyle = 'rgba(150, 210, 255, 0.07)';
      ctx.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
      ctx.strokeStyle = 'rgba(190, 225, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(GLASS.x + 0.5, GLASS.y + 0.5, GLASS.w - 1, GLASS.h - 1);
      ctx.fillStyle = '#3a2b4a';
      ctx.fillRect(GLASS.x, GLASS.y - 6, GLASS.w, 4);          /* the rail */
      ctx.fillStyle = '#120d18';
      ctx.fillRect(CHUTE_X - 13, FLOOR_Y - 4, 26, 12);          /* the chute */
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(CHUTE_X - 13, FLOOR_Y - 5, 26, 1);

      /* the pile */
      g.prizes.forEach((p) => { if (!p.taken) drawPrize(ctx, p, p.x, p.y); });

      /* the claw: cable, then two jaws that close as `open` falls */
      ctx.fillStyle = '#8e8399';
      ctx.fillRect(Math.round(g.clawX) - 1, GLASS.y - 4, 2, g.clawY - GLASS.y + 4);
      const spread = 3 + g.open * 5;
      ctx.strokeStyle = '#cdbcda';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.clawX - 1, g.clawY);
      ctx.lineTo(g.clawX - spread, g.clawY + 9);
      ctx.moveTo(g.clawX + 1, g.clawY);
      ctx.lineTo(g.clawX + spread, g.clawY + 9);
      ctx.stroke();
      ctx.fillStyle = '#cdbcda';
      ctx.fillRect(Math.round(g.clawX) - 4, Math.round(g.clawY) - 4, 8, 5);

      /* whatever it is holding rides with it */
      if (g.held) drawPrize(ctx, g.held, g.clawX, g.clawY + 16);

      /* the grip meter, only while it matters */
      if (g.phase2 === 'grip') {
        const bx = GLASS.x + 24;
        const bw = GLASS.w - 48;
        const by = GLASS.y + GLASS.h + 6;
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(bx, by, bw, 7);
        /* the band each prize needs, so the meter teaches you the cabinet */
        PRIZES.forEach((p) => {
          ctx.fillStyle = p.body;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(bx + p.grip * bw - 1, by, 2, 7);
          ctx.globalAlpha = 1;
        });
        ctx.fillStyle = '#ffd9be';
        ctx.fillRect(bx + g.gripBar * bw - 1, by - 2, 3, 11);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(253,250,242,0.6)';
        ctx.font = 'bold 7px ui-monospace, monospace';
        ctx.fillText('GRIP', bx, by + 15);
      } else if (g.phase2 === 'aim') {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(253,250,242,0.55)';
        ctx.font = 'bold 8px ui-monospace, monospace';
        ctx.fillText('stop the claw', W / 2, GLASS.y + GLASS.h + 12);
      }
    },

    hud(g) {
      return [
        { label: 'score', value: g.score },
        { label: 'goes left', value: g.tries, cls: g.tries <= 2 ? 'cc-hud__time is-low' : '' },
        { label: 'won', value: g.won.length },
        { label: 'holding', value: g.held ? g.held.kind : '—' }
      ];
    },

    stats(g) {
      const heavy = g.won.filter((p) => p.grip >= 0.6).length;
      return [
        { label: 'prizes', value: g.won.length },
        { label: 'heavy ones', value: heavy },
        { label: 'goes used', value: TRIES - g.tries }
      ];
    },

    line(g) {
      if (!g.won.length) return 'No prizes this time. The marks on the grip meter show how firm each prize needs you to be.';
      if (g.won.some((p) => p.kind === 'cat')) return 'You got the cat plush out. It’s the heaviest thing in the machine.';
      if (g.won.length >= 5) return `${g.won.length} prizes. This machine’s going to need restocking.`;
      return 'Nice grab. The heavier prizes are worth more if you can hold on to them.';
    }
  };

  /* 4 ------------------------------------------------------ what game.js gets */

  return { beat: cabinet(BEAT_STREET), claw: cabinet(GRABBER) };
})();
