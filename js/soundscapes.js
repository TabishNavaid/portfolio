/* Small opt-in soundscapes shared by the ride and Field Trip.
   Audio is only created after a visitor has chosen sound. */
window.PortfolioSound = (function () {
  'use strict';

  /* Audio nodes are not attached to the DOM, so keep explicit ownership of
     them. A mode switch can then stop and disconnect everything in one pass. */
  let ctx = null;
  let master = null;
  let active = [];
  let timer = null;

  function context() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function clear() {
    /* Deliberately idempotent: stop() is called by normal exits, mode changes,
       and failed starts. Any of those may happen back-to-back. */
    clearInterval(timer);
    timer = null;
    active.forEach((node) => {
      try { node.stop && node.stop(); } catch (err) { /* already stopped */ }
      try { node.disconnect && node.disconnect(); } catch (err) { /* already disconnected */ }
    });
    active = [];
    if (master) {
      try { master.disconnect(); } catch (err) { /* already disconnected */ }
      master = null;
    }
  }

  function busNoise(audio, destination) {
    /* A short noise buffer loops through a low-pass filter. It reads as road
       rumble without loading a separate audio asset. */
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 230;
    gain.gain.value = 0.16;
    source.connect(filter); filter.connect(gain); gain.connect(destination);
    source.start();
    active.push(source, filter, gain);
  }

  function startRide() {
    try {
      const audio = context();
      clear();
      master = audio.createGain();
      master.gain.value = 0.16;
      master.connect(audio.destination);
      busNoise(audio, master);

      const engine = audio.createOscillator();
      const engineGain = audio.createGain();
      engine.type = 'triangle';
      engine.frequency.value = 58;
      engineGain.gain.value = 0.2;
      engine.connect(engineGain); engineGain.connect(master); engine.start();

      const hum = audio.createOscillator();
      const humGain = audio.createGain();
      hum.type = 'sine';
      hum.frequency.value = 116;
      humGain.gain.value = 0.055;
      hum.connect(humGain); humGain.connect(master); hum.start();
      active.push(engine, engineGain, hum, humGain);
    } catch (err) { clear(); }
  }

  function tone(notes, volume) {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    notes.forEach((note, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type || 'sine';
      osc.frequency.setValueAtTime(note.hz, now + index * 0.07);
      gain.gain.setValueAtTime(volume, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.18);
      osc.connect(gain); gain.connect(master);
      osc.start(now + index * 0.07); osc.stop(now + index * 0.07 + 0.19);
    });
  }

  function rideSfx(kind) {
    if (kind === 'lane') tone([{ hz: 330 }, { hz: 440 }], 0.15);
    else if (kind === 'crash') tone([{ hz: 130, type: 'square' }, { hz: 82, type: 'square' }], 0.12);
    else if (kind === 'arrive') tone([{ hz: 392 }, { hz: 523 }, { hz: 659 }], 0.12);
  }

  function chirp() {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180 + Math.random() * 360, now);
    osc.frequency.exponentialRampToValueAtTime(1850 + Math.random() * 400, now + 0.09);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain); gain.connect(master); osc.start(); osc.stop(now + 0.17);
  }

  function startField() {
    try {
      const audio = context();
      clear();
      master = audio.createGain();
      master.gain.value = 0.18;
      master.connect(audio.destination);

      /* The field uses a different band-pass bed from the bus so arrival feels
         like entering a new place, not continuing the same sound loop. */
      const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const breeze = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      breeze.buffer = buffer; breeze.loop = true;
      filter.type = 'bandpass'; filter.frequency.value = 620; filter.Q.value = 0.35;
      gain.gain.value = 0.055;
      breeze.connect(filter); filter.connect(gain); gain.connect(master); breeze.start();
      active.push(breeze, filter, gain);

      chirp();
      timer = setInterval(() => {
        chirp();
        if (Math.random() > 0.55) setTimeout(chirp, 170);
      }, 3400);
      tone([{ hz: 523 }, { hz: 659 }, { hz: 784 }], 0.055);
    } catch (err) { clear(); }
  }

  return { startRide, startField, rideSfx, stop: clear };
})();
