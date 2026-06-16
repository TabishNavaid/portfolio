// Main site interactions and scene behavior
// Web Audio API Sound Manager
let audioCtx = null;
const clickSfx = new Audio('assets/sounds/click.mp3');
clickSfx.preload = 'auto';
const bgMusic = new Audio('assets/sounds/background-music.mp3');
bgMusic.preload = 'metadata';
bgMusic.loop = true;
bgMusic.volume = 0;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSfx(type) {
  if (!sfxOn) return;
  try {
    if (type === 'click') {
      clickSfx.currentTime = 0;
      clickSfx.play().catch(() => {});
      return;
    }

    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'open') {
      // Warm ascending chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'close') {
      // Softer descending chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'theme') {
      // Sparkly magic sweep harmony
      osc.type = 'sine';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.2);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.2);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(825, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(1650, now + 0.2);

      gain2.gain.setValueAtTime(0.04, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc2.start(now + 0.04);
      osc2.stop(now + 0.2);
    } else if (type === 'cat') {
      // Playful kitty meow slide
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.18);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (err) {
    console.warn("SFX error: ", err);
  }
}

// Theme progress: 0 = day, 0.5 = evening, 1 = night.
const root = document.documentElement;
const themeBtn = document.getElementById('themeToggle');
const themeToggleImg = document.getElementById('themeToggleImg');
const celestialControl = document.getElementById('celestialControl');
const profilePeekImg = document.getElementById('profilePeekImg');
const meadowCatImg = document.getElementById('meadowCatImg');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let themeProgress = 0;
let themeAnimationFrame = null;
let bgMusicPlaying = false;

const themeColors = {
  skyTopDay: '#cbeeff',
  skyBotDay: '#f1faf4',
  skyTopDusk: '#ffd8b5',
  skyBotDusk: '#f7c7ab',
  skyTopNight: '#111827',
  skyBotNight: '#243b5a',
  grassFarDay: '#b8cb8a',
  grassFarDusk: '#a4b978',
  grassFarNight: '#223850',
  grassNearDay: '#9fbd76',
  grassNearDusk: '#879f63',
  grassNearNight: '#182a3f',
  winBgDay: '#fdfaf2',
  winBgNight: '#17233a',
  winHeaderDay: '#2d2c29',
  winHeaderNight: '#101827',
  winTextDay: '#2d2c29',
  winTextNight: '#f0f4fb',
  winBorderDay: '#2d2c29',
  winBorderNight: '#eaf6ff',
  accentDay: '#d96e34',
  accentNight: '#aef0ff'
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const hexToRgb = hex => {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
};
const mixHex = (from, to, amount) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const mix = key => Math.round(a[key] + (b[key] - a[key]) * amount);
  return `rgb(${mix('r')}, ${mix('g')}, ${mix('b')})`;
};
const mixPhase = (day, dusk, night, progress) => {
  if (progress <= 0.5) return mixHex(day, dusk, progress / 0.5);
  return mixHex(dusk, night, (progress - 0.5) / 0.5);
};

function updateProfilePeekForTheme(progress) {
  if (!profilePeekImg) return;
  const nextSrc = progress >= 0.75
    ? 'assets/images/peeking-sleeping-profile.png'
    : 'assets/images/peeking-profile.png';
  if (!profilePeekImg.src.endsWith(nextSrc)) {
    profilePeekImg.src = nextSrc;
  }
}

const catFallbackSrc = 'assets/images/cat-morning-no-music.gif';
const availableCatSrcs = new Map([[catFallbackSrc, true]]);

function catSrcForState() {
  const time = themeProgress >= 0.65 ? 'night' : 'morning';
  const music = bgMusicPlaying ? 'music' : 'no-music';
  return `assets/images/cat-${time}-${music}.gif`;
}

function setCatImageSrc(src) {
  if (!meadowCatImg || meadowCatImg.src.endsWith(src)) return;
  meadowCatImg.src = src;
}

meadowCatImg?.addEventListener('error', () => {
  availableCatSrcs.set(catSrcForState(), false);
  setCatImageSrc(catFallbackSrc);
});

function updateCatState() {
  if (!meadowCatImg) return;
  const requestedSrc = catSrcForState();

  if (availableCatSrcs.get(requestedSrc)) {
    setCatImageSrc(requestedSrc);
    return;
  }

  if (availableCatSrcs.get(requestedSrc) === false) {
    setCatImageSrc(catFallbackSrc);
    return;
  }

  const probe = new Image();
  probe.onload = () => {
    availableCatSrcs.set(requestedSrc, true);
    if (catSrcForState() === requestedSrc) setCatImageSrc(requestedSrc);
  };
  probe.onerror = () => {
    availableCatSrcs.set(requestedSrc, false);
    if (catSrcForState() === requestedSrc) setCatImageSrc(catFallbackSrc);
  };
  probe.src = requestedSrc;
}

function setThemeProgress(progress, options = {}) {
  const { persist = true, refreshClock = true } = options;
  themeProgress = clamp(progress);

  const duskOpacity = 1 - Math.abs(themeProgress - 0.5) * 2;
  const nightOpacity = smoothstep(0.45, 1, themeProgress);
  const uiNightMix = smoothstep(0.55, 1, themeProgress);
  const sunFade = themeProgress < 0.55 ? 1 - themeProgress * 0.3 : 1 - ((themeProgress - 0.55) / 0.45);
  const moonFade = smoothstep(0.34, 1, themeProgress);

  root.style.setProperty('--theme-progress', themeProgress.toFixed(3));
  root.style.setProperty('--dusk-opacity', clamp(duskOpacity).toFixed(3));
  root.style.setProperty('--night-opacity', nightOpacity.toFixed(3));
  root.style.setProperty('--star-opacity', (smoothstep(0.28, 1, themeProgress) * 0.95).toFixed(3));
  root.style.setProperty('--cloud-opacity', (0.72 * (1 - smoothstep(0.28, 0.9, themeProgress))).toFixed(3));
  root.style.setProperty('--firefly-opacity', smoothstep(0.52, 1, themeProgress).toFixed(3));
  root.style.setProperty('--sun-opacity', clamp(sunFade).toFixed(3));
  root.style.setProperty('--moon-opacity', moonFade.toFixed(3));
  root.style.setProperty('--sun-scale', (1 - themeProgress * 0.16).toFixed(3));
  root.style.setProperty('--moon-scale', (0.82 + moonFade * 0.18).toFixed(3));
  root.style.setProperty('--sun-x', `${Math.round(themeProgress * -42)}px`);
  root.style.setProperty('--sun-y', `${Math.round(themeProgress * 28)}px`);
  root.style.setProperty('--moon-x', `${Math.round((1 - moonFade) * 34)}px`);
  root.style.setProperty('--moon-y', `${Math.round((1 - moonFade) * 18)}px`);

  root.style.setProperty('--sky-top', mixPhase(themeColors.skyTopDay, themeColors.skyTopDusk, themeColors.skyTopNight, themeProgress));
  root.style.setProperty('--sky-bot', mixPhase(themeColors.skyBotDay, themeColors.skyBotDusk, themeColors.skyBotNight, themeProgress));
  root.style.setProperty('--grass-far', mixPhase(themeColors.grassFarDay, themeColors.grassFarDusk, themeColors.grassFarNight, themeProgress));
  root.style.setProperty('--grass-near', mixPhase(themeColors.grassNearDay, themeColors.grassNearDusk, themeColors.grassNearNight, themeProgress));
  root.style.setProperty('--win-bg', mixHex(themeColors.winBgDay, themeColors.winBgNight, uiNightMix));
  root.style.setProperty('--win-header', mixHex(themeColors.winHeaderDay, themeColors.winHeaderNight, uiNightMix));
  root.style.setProperty('--win-text', mixHex(themeColors.winTextDay, themeColors.winTextNight, uiNightMix));
  root.style.setProperty('--win-border', mixHex(themeColors.winBorderDay, themeColors.winBorderNight, uiNightMix));
  root.style.setProperty('--accent', mixHex(themeColors.accentDay, themeColors.accentNight, uiNightMix));

  root.classList.toggle('dark', themeProgress >= 0.98);
  const themeIconSrc = themeProgress >= 0.75 ? 'assets/images/light-mode.png' : 'assets/images/dark-mode.png';
  if (themeToggleImg && !themeToggleImg.src.endsWith(themeIconSrc)) {
    themeToggleImg.src = themeIconSrc;
  }
  celestialControl.setAttribute('aria-valuenow', Math.round(themeProgress * 100));
  celestialControl.setAttribute('aria-valuetext', themeProgress < 0.25 ? 'day' : themeProgress < 0.75 ? 'evening' : 'night');
  updateProfilePeekForTheme(themeProgress);
  updateCatState();

  if (persist) localStorage.setItem('themeProgress', themeProgress.toFixed(3));
  if (refreshClock) updateClock();
}

function animateThemeProgress(target, duration = 520) {
  if (themeAnimationFrame) cancelAnimationFrame(themeAnimationFrame);
  const start = themeProgress;
  const end = clamp(target);
  const startTime = performance.now();
  const finalDuration = reduceMotion.matches ? 0 : duration;

  const tick = now => {
    const t = finalDuration === 0 ? 1 : clamp((now - startTime) / finalDuration);
    const eased = 1 - Math.pow(1 - t, 3);
    setThemeProgress(start + (end - start) * eased, { persist: t === 1, refreshClock: t === 1 });
    if (t < 1) {
      themeAnimationFrame = requestAnimationFrame(tick);
    }
  };

  themeAnimationFrame = requestAnimationFrame(tick);
}

const savedThemeProgress = Number.parseFloat(localStorage.getItem('themeProgress')) || 0;
setThemeProgress(savedThemeProgress, { persist: false, refreshClock: false });
themeBtn.addEventListener('click', () => {
  animateThemeProgress(themeProgress >= 0.75 ? 0 : 1);
  playSfx('theme');
});

let dragStartX = 0;
let dragStartProgress = 0;

let draggingCelestial = false;
celestialControl.addEventListener('pointerdown', event => {
  draggingCelestial = true;
  dragStartX = event.clientX;
  dragStartProgress = themeProgress;
  celestialControl.classList.add('dragging');
  celestialControl.setPointerCapture(event.pointerId);
  setThemeProgress(themeProgress, { persist: false, refreshClock: false });
});
celestialControl.addEventListener('pointermove', event => {
  if (!draggingCelestial) return;
  const dragRange = Math.min(260, Math.max(150, window.innerWidth * 0.16));
  setThemeProgress(dragStartProgress + (dragStartX - event.clientX) / dragRange, { persist: false, refreshClock: false });
});
celestialControl.addEventListener('pointerup', event => {
  draggingCelestial = false;
  celestialControl.classList.remove('dragging');
  celestialControl.releasePointerCapture(event.pointerId);
  setThemeProgress(themeProgress, { persist: true, refreshClock: true });
});
celestialControl.addEventListener('pointercancel', event => {
  draggingCelestial = false;
  celestialControl.classList.remove('dragging');
  celestialControl.releasePointerCapture(event.pointerId);
  setThemeProgress(themeProgress, { persist: true, refreshClock: true });
});
celestialControl.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault();
    setThemeProgress(themeProgress - 0.1);
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault();
    setThemeProgress(themeProgress + 0.1);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    animateThemeProgress(themeProgress >= 0.75 ? 0 : 1);
    playSfx('theme');
  }
});

// sfx toggle
const sfxBtn = document.getElementById('sfxToggle');
const sfxToggleImg = document.getElementById('sfxToggleImg');
let sfxOn = localStorage.getItem('sfxOn') === 'true'; // false/off by default

function updateSfxToggleIcon() {
  if (!sfxToggleImg) return;
  sfxToggleImg.src = sfxOn ? 'assets/images/sound-on.png' : 'assets/images/sound-off.png';
}

updateSfxToggleIcon();

sfxBtn.addEventListener('click', () => {
  sfxOn = !sfxOn;
  localStorage.setItem('sfxOn', sfxOn);
  updateSfxToggleIcon();
  if (sfxOn) {
    initAudio();
    playSfx('click');
  } else if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic('meadow muted');
  }
});

// generate stars
const starsContainer = document.getElementById('stars');
for (let i = 0; i < 60; i++) {
  const s = document.createElement('div');
  s.className = 'star';
  const size = Math.random() * 2.5 + 1;
  s.style.width = size + 'px';
  s.style.height = size + 'px';
  s.style.left = Math.random() * 100 + '%';
  s.style.top = Math.random() * 55 + '%';
  s.style.animationDelay = (Math.random() * 3) + 's';
  starsContainer.appendChild(s);
}

// popup open/close + drag
document.querySelectorAll('[data-popup]').forEach(btn => {
  btn.addEventListener('click', () => {
    playSfx('click');
    const popup = document.getElementById('popup-' + btn.dataset.popup);
    popup.classList.add('open');
    popup.style.zIndex = ++topZ;
  });
});
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    playSfx('close');
    document.getElementById('popup-' + btn.dataset.close).classList.remove('open');
  });
});

let topZ = 100;
document.querySelectorAll('.popup').forEach(popup => {
  const header = popup.querySelector('.popup-header');
  let dragging = false, offX = 0, offY = 0;

  const startDrag = (clientX, clientY) => {
    dragging = true;
    const rect = popup.getBoundingClientRect();
    offX = clientX - rect.left;
    offY = clientY - rect.top;
    popup.style.zIndex = ++topZ;
  };
  const moveDrag = (clientX, clientY) => {
    if (!dragging) return;
    let x = clientX - offX;
    let y = clientY - offY;
    x = Math.max(4, Math.min(window.innerWidth - 60, x));
    y = Math.max(4, Math.min(window.innerHeight - 60, y));
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
  };
  const endDrag = () => { dragging = false; };

  header.addEventListener('mousedown', e => { if (e.target.closest('.popup-close')) return; startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', endDrag);

  header.addEventListener('touchstart', e => {
    if (e.target.closest('.popup-close')) return;
    const t = e.touches[0]; startDrag(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchmove', e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchend', endDrag);
});

// clock widget
const SUN_ICON = `
<circle cx="11" cy="14" r="7" fill="#ffd166" stroke="#e8a154" stroke-width="1.5"/>
<g stroke="#ffd166" stroke-width="2" stroke-linecap="round">
  <line x1="11" y1="2" x2="11" y2="5"/>
  <line x1="11" y1="23" x2="11" y2="26" opacity="0"/>
  <line x1="1" y1="14" x2="4" y2="14"/>
  <line x1="3" y1="6" x2="5" y2="8"/>
  <line x1="3" y1="22" x2="5" y2="20"/>
  <line x1="19" y1="6" x2="17" y2="8"/>
</g>
<ellipse cx="29" cy="22" rx="10" ry="5" fill="#a8e6a0"/>
<ellipse cx="36" cy="24" rx="6" ry="3.5" fill="#8fd17a"/>
<ellipse cx="22" cy="24" rx="5" ry="3" fill="#8fd17a"/>
  `;
const CLOUD_ICON = `
<ellipse cx="14" cy="14" rx="9" ry="6" fill="#fff"/>
<ellipse cx="22" cy="11" rx="10" ry="7" fill="#fff"/>
<ellipse cx="30" cy="15" rx="8" ry="5.5" fill="#fff"/>
<ellipse cx="29" cy="23" rx="10" ry="5" fill="#a8e6a0"/>
<ellipse cx="10" cy="24" rx="7" ry="3.5" fill="#8fd17a"/>
  `;
const MOON_ICON = `
<circle cx="14" cy="12" r="7" fill="#e3e9f7"/>
<circle cx="11" cy="10" r="2" fill="#c7d2ea"/>
<circle cx="17" cy="14" r="1.3" fill="#c7d2ea"/>
<circle cx="33" cy="6" r="1" fill="#fff6b0"/>
<circle cx="27" cy="3" r="0.7" fill="#fff6b0"/>
<ellipse cx="29" cy="22" rx="10" ry="5" fill="#1f3d2b"/>
<ellipse cx="20" cy="24" rx="7" ry="3.5" fill="#16291c"/>
<circle cx="6" cy="22" r="1" fill="#fff6b0"/>
<circle cx="15" cy="25" r="1" fill="#fff6b0"/>
  `;

function updateClock() {
  const timeEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');
  const icon = document.getElementById('weatherIcon');
  const label = document.getElementById('clockWeatherLabel');
  if (!timeEl || !dateEl || !icon || !label) return;

  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const h12 = ((h % 12) || 12).toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  timeEl.textContent = `${h12}:${m} ${ampm}`;
  dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  if (themeProgress >= 0.75) {
    icon.innerHTML = MOON_ICON;
    label.textContent = 'starry meadow';
  } else if (themeProgress >= 0.3) {
    icon.innerHTML = SUN_ICON;
    label.textContent = 'golden meadow';
  } else {
    icon.innerHTML = h >= 7 && h < 18 ? SUN_ICON : CLOUD_ICON;
    label.textContent = h >= 7 && h < 18 ? 'sunny meadow' : 'cloudy meadow';
  }
}
updateClock();
setInterval(updateClock, 15000);

// FAQ accordion
document.querySelectorAll('[data-accordion]').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');
    btn.classList.toggle('open', !isOpen);
    panel.classList.toggle('open', !isOpen);
  });
});

// Peeking profile doodle: hide behind the desktop, then pop back up.
const profilePeek = document.getElementById('profilePeek');
const profilePeekMessage = document.querySelector('.profile-peek-message');
const desktopWindow = document.querySelector('.desktop-window');
let profilePeekTimeout;

function playProfilePeek() {
  if (!profilePeek || profilePeek.classList.contains('is-hiding') || desktopWindow?.classList.contains('profile-peek-talking')) return;
  playSfx('click');
  clearTimeout(profilePeekTimeout);

  if (themeProgress >= 0.75) {
    if (profilePeekMessage) profilePeekMessage.textContent = 'just five more minutes 人´∀｀)';
    desktopWindow?.classList.add('profile-peek-talking');
    profilePeekTimeout = setTimeout(() => {
      desktopWindow?.classList.remove('profile-peek-talking');
    }, 2400);
    return;
  }

  if (profilePeekMessage) profilePeekMessage.textContent = 'brb';
  profilePeek.classList.add('is-hiding');
  desktopWindow?.classList.add('profile-peek-hiding');

  profilePeekTimeout = setTimeout(() => {
    profilePeek.classList.remove('is-hiding');
    desktopWindow?.classList.remove('profile-peek-hiding');
  }, 5000);
}

profilePeek?.addEventListener('click', playProfilePeek);
profilePeek?.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    playProfilePeek();
  }
});

// Cat music toggle. This never autoplays; the cat starts or pauses music after user input.
const catSprite = document.getElementById('catSprite');
const catBubble = document.getElementById('catBubble');
let catBubbleTimeout;
let bgMusicFadeTimer;
const bgMusicVolume = 0.22;

function showCatBubble(msg) {
  catBubble.textContent = msg;
  catBubble.style.left = (catSprite.offsetLeft + 70) + 'px';
  catBubble.classList.add('show');

  clearTimeout(catBubbleTimeout);
  catBubbleTimeout = setTimeout(() => {
    catBubble.classList.remove('show');
  }, 2000);
}

function updateCatMusicState(isPlaying) {
  bgMusicPlaying = isPlaying;
  catSprite.classList.toggle('music-playing', isPlaying);
  catSprite.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
  updateCatState();
}

function fadeMusicTo(targetVolume, onDone) {
  clearInterval(bgMusicFadeTimer);
  const startVolume = bgMusic.volume;
  const steps = 12;
  let step = 0;

  bgMusicFadeTimer = setInterval(() => {
    step++;
    bgMusic.volume = startVolume + ((targetVolume - startVolume) * (step / steps));
    if (step >= steps) {
      clearInterval(bgMusicFadeTimer);
      bgMusic.volume = targetVolume;
      if (onDone) onDone();
    }
  }, 35);
}

async function startBackgroundMusic() {
  if (!sfxOn) {
    showCatBubble('sound switch first?');
    return;
  }

  playSfx('click');
  try {
    bgMusic.currentTime = bgMusic.currentTime || 0;
    await bgMusic.play();
    updateCatMusicState(true);
    fadeMusicTo(bgMusicVolume);
    showCatBubble('tiny soundtrack activated');
  } catch (err) {
    updateCatMusicState(false);
    showCatBubble('music file not here yet');
  }
}

function stopBackgroundMusic(message = 'meadow muted') {
  if (!bgMusicPlaying && bgMusic.paused) {
    updateCatMusicState(false);
    return;
  }

  fadeMusicTo(0, () => {
    bgMusic.pause();
  });
  updateCatMusicState(false);
  showCatBubble(message);
}

function toggleBackgroundMusic() {
  if (bgMusicPlaying) {
    if (sfxOn) playSfx('click');
    stopBackgroundMusic();
  } else {
    startBackgroundMusic();
  }
}

updateCatMusicState(false);

catSprite.addEventListener('click', toggleBackgroundMusic);
catSprite.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleBackgroundMusic();
  }
});
