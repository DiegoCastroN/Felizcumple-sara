(function () {
  const gate   = document.getElementById('gate');
  const gateBtn= document.getElementById('gateBtn');
  const stage  = document.getElementById('stage');
  const sheet  = document.getElementById('sheet');
  const hint   = document.getElementById('hint');
  const dock   = document.getElementById('dock');
  const letter = document.getElementById('letter');
  const progress = document.getElementById('progress');
  const canvas = document.getElementById('fx');  const ctx    = canvas.getContext('2d');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines   = document.querySelectorAll('.line').length;

  /* ── Sonido (generado, sin archivos externos) ──────────────── */
  let ac = null;
  function audio() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }

  // Roce de papel: ruido filtrado con una envolvente corta.
  function paperSound(dur = .55, vol = .22) {
    const a = audio(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const env = Math.pow(Math.sin(Math.PI * t), 1.6) * (0.55 + 0.45 * Math.sin(t * 34));
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = a.createBufferSource(); src.buffer = buf;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .8;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const g  = a.createGain(); g.gain.value = vol;
    src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(a.destination);
    src.start();
  }

  // Campanita suave al abrir el regalo.
  function chime() {
    const a = audio(); if (!a) return;
    [1046.5, 1318.5, 1568].forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = a.currentTime + i * .12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.12, t + .04);
      g.gain.exponentialRampToValueAtTime(.001, t + 1.4);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 1.5);
    });
  }

  /* ── Confeti dorado ────────────────────────────────────────── */
  const COLORS = ['#DDBA72', '#F3DFA8', '#C39A46', '#F8F1E3', '#E4A29C'];
  let bits = [], raf = null;

  function size() {
    const r = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * r; canvas.height = innerHeight * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  addEventListener('resize', size); size();

  function confetti(count = 90) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      bits.push({
        x: Math.random() * innerWidth,
        y: -20 - Math.random() * innerHeight * .5,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        vy: 1.1 + Math.random() * 2.1,
        vx: -.6 + Math.random() * 1.2,
        rot: Math.random() * Math.PI,
        vr: -.08 + Math.random() * .16,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(b => b.life > 0);
    for (const b of bits) {
      b.x += b.vx + Math.sin((b.y + b.rot * 40) / 46) * .7;
      b.y += b.vy; b.rot += b.vr;
      if (b.y > innerHeight - 90) b.life -= .012;
      ctx.save();
      ctx.globalAlpha = Math.max(b.life, 0);
      ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.rot)));
      ctx.restore();
    }
    raf = bits.length ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, innerWidth, innerHeight), null);
  }

  /* ── 1. Abrir el regalo ────────────────────────────────────── */
  let opened = false;
  gateBtn.addEventListener('click', () => {
    if (opened) return; opened = true;
    audio(); chime(); paperSound(.7, .18); confetti(40);
    setTimeout(startButterflies, 900);
    gate.classList.add('is-gone');
    stage.classList.add('is-on');
    const wait = reduced ? 400 : 500 + lines * 500 + 800;
    setTimeout(() => hint.classList.add('is-ready'), wait);
  });

  /* ── 2. Guardar el poema en el sobre ───────────────────────── */
  let sealed = false, busy = false;

  function flyTransform() {
    const s = sheet.getBoundingClientRect(), d = dock.getBoundingClientRect();
    const k = d.width / s.width;
    const tx = (d.left + d.width / 2) - (s.left + s.width / 2);
    const ty = (d.top + d.height / 2) - (s.top + s.height / 2);
    return `translate(${tx}px, ${ty}px) rotate(-7deg) scale(${k}) scaleY(.12)`;
  }

  function seal() {
    if (busy || sealed) return;
    busy = true;
    hint.classList.add('is-hidden');
    paperSound(.75, .25);
    sheet.style.transform = flyTransform();
    sheet.classList.add('is-away');
    setTimeout(() => {
      stage.classList.remove('is-on');
      dock.classList.add('is-on');
      letter.classList.add('is-visible');
      hint.textContent = 'Volver a la carta';
      confetti(110);
      sealed = true; busy = false;
    }, reduced ? 200 : 1150);
  }

  function unseal() {
    if (busy || !sealed) return;
    busy = true;
    paperSound(.6, .22);
    dock.classList.remove('is-on');
    letter.classList.remove('is-visible');
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    stage.classList.add('is-on');
    void sheet.offsetWidth;              // fija el punto de partida
    sheet.style.transform = '';
    sheet.classList.remove('is-away');
    setTimeout(() => {
      hint.classList.remove('is-hidden');
      sealed = false; busy = false;
    }, reduced ? 200 : 1000);
  }

  hint.addEventListener('click', seal);
  sheet.addEventListener('click', () => { if (hint.classList.contains('is-ready')) seal(); });
  dock.addEventListener('click', unseal);

  /* ── Barra de progreso al leer la carta ────────────────────── */
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (max > 0 ? Math.min(scrollY / max, 1) * 100 : 0) + '%';
  }, { passive: true });

  /* ── Mariposas ──────────────────────────────────────────────── */
  const flyBack  = document.getElementById('flyBack');
  const flyFront = document.getElementById('flyFront');
  const PALETTE  = ['#FDFBF5'];

  const rnd  = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  const MAX_FRONT = 1;   // solo una mariposa de frente a la vez, para no distraer la lectura
  let frontCount = 0;

  function butterflySVG(color, front) {
    // Sin trazo oscuro y con más opacidad para que se vean más "vivas" y luminosas.
    const op = front ? 1 : .92;
    return `<svg viewBox="0 0 40 30" width="100%">
      <g class="wing wing--l"><path d="M20 15 C6 -8 -12 2 3 15 C-12 27 6 37 20 15 Z" fill="${color}" opacity="${op}"/></g>
      <g class="wing wing--r"><path d="M20 15 C34 -8 52 2 37 15 C52 27 34 37 20 15 Z" fill="${color}" opacity="${op}"/></g>
      <line x1="20" y1="7" x2="20" y2="23" stroke="#42364D" stroke-width="1.6" stroke-linecap="round" opacity="${front ? .55 : .8}"/>
    </svg>`;
    }
  function spawnButterfly(front) {
    if (reduced) return;
    if (front && frontCount >= MAX_FRONT) return;   // las de atrás no tienen tope
    if (front) frontCount++;

    const host  = front ? flyFront : flyBack;
    const side  = Math.random() < 0.5 ? -1 : 1;       // entra por izquierda o derecha
    // Las de atrás vuelan por toda la pantalla; las de adelante solo
    // rondan el borde superior o inferior para no tapar la lectura.
    const band  = front ? pick([rnd(12, 20), rnd(76, 86)]) : rnd(6, 78);

    const el = document.createElement('div');
    el.className = 'butterfly' + (front ? ' butterfly--front' : '');
    el.innerHTML = butterflySVG(pick(PALETTE), front);

    const x0 = side === -1 ? '-12vw' : '112vw';
    const x4 = side === -1 ? '112vw' : '-12vw';
    const step = front ? (side === -1 ? 1 : -1) * 31 : (side === -1 ? 1 : -1) * rnd(22, 34);

    el.style.setProperty('--x0', x0);
    el.style.setProperty('--x1', `calc(${x0} + ${step * 1}vw)`);
    el.style.setProperty('--x2', `calc(${x0} + ${step * 2}vw)`);
    el.style.setProperty('--x3', `calc(${x0} + ${step * 3}vw)`);
    el.style.setProperty('--x4', x4);

    const wob = front ? 5 : 15;   // las de adelante se desvían menos de su franja
    const y0 = band, y1 = y0 + rnd(-wob, wob), y2 = y0 + rnd(-wob, wob), y3 = y0 + rnd(-wob, wob), y4 = y0 + rnd(-wob*.7, wob*.7);
    [y0, y1, y2, y3, y4].forEach((y, i) => el.style.setProperty(`--y${i}`, `${Math.max(2, Math.min(94, y))}vh`));

    const bank = side === -1 ? 1 : -1;
    el.style.setProperty('--r0', `${bank * rnd(4, 12)}deg`);
    el.style.setProperty('--r1', `${bank * rnd(-14, 18)}deg`);
    el.style.setProperty('--r2', `${bank * rnd(-18, 14)}deg`);
    el.style.setProperty('--r3', `${bank * rnd(-10, 16)}deg`);
    el.style.setProperty('--r4', `${bank * rnd(4, 12)}deg`);

    el.style.setProperty('--s', (front ? 1 : rnd(.55, .95)).toFixed(2));
    // Vuelo de la de adelante un poco más lento y suave (más fluida).
    const durSec = front ? 24 : rnd(10, 19);
    el.style.setProperty('--dur', `${durSec.toFixed(1)}s`);

    host.appendChild(el);
    el.addEventListener('animationend', e => {
      if (e.animationName === 'flutter') { el.remove(); if (front) frontCount--; }
    });
    return durSec;
    }
  

  function startButterflies() {
    if (reduced) return;
    // Atrás: igual de abundantes que antes, dan ambiente libremente.
    for (let i = 0; i < 5; i++) setTimeout(() => spawnButterfly(false), i * 420);
    setTimeout(function loopBack() {
      spawnButterfly(false);
      if (Math.random() < 0.45) spawnButterfly(false);
      setTimeout(loopBack, rnd(900, 2200));
    }, 1600);

    // Adelante: relevo continuo, siempre UNA sola en pantalla — la
    // siguiente nace un poco antes de que la anterior termine su vuelo.
    (function keepFrontAlive() {
      const dur = spawnButterfly(true) || 24;
      setTimeout(keepFrontAlive, Math.max(3500, (dur - 3) * 1000));
    })();
  }

  /* ══════════════════════════════════════════════════════════════
     3. Bloqueo por dispositivo: solo se abre desde el celular
     ══════════════════════════════════════════════════════════════ */
  function isMobileDevice() {
    const uaMobile = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
    const touch    = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const narrow   = Math.min(innerWidth, innerHeight) <= 820;
    // Se considera móvil si el user-agent lo indica, o si es táctil Y de pantalla angosta.
    return uaMobile || (touch && narrow);
  }

  /* ══════════════════════════════════════════════════════════════
     4. Bloqueo por fecha: solo se abre el 3 de octubre a las 00:00
     ══════════════════════════════════════════════════════════════ */
  // Cambia el año si hace falta (ej. el año que cumple).
  const UNLOCK_DATE = new Date(2026, 9, 3, 0, 0, 0); // mes 9 = octubre (0-indexado)

  function pad(n) { return String(n).padStart(2, '0'); }

  function renderCountdown() {
    const now = new Date();
    const diff = UNLOCK_DATE - now;
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s };
  }

  function startCountdownLoop() {
    const dEl = document.getElementById('cd-d');
    const hEl = document.getElementById('cd-h');
    const mEl = document.getElementById('cd-m');
    const sEl = document.getElementById('cd-s');
    const tick = () => {
      const t = renderCountdown();
      if (!t) {
        // Ya llegó la hora: recarga para mostrar el regalo.
        location.reload();
        return;
      }
      dEl.textContent = t.d;
      hEl.textContent = pad(t.h);
      mEl.textContent = pad(t.m);
      sEl.textContent = pad(t.s);
      requestAnimationFrame(() => setTimeout(tick, 250));
    };
    tick();
  }

  function initGuards() {
    const desktopLock = document.getElementById('desktopLock');
    const dateLock    = document.getElementById('dateLock');

    // Modo de vista previa: abre el archivo con "?preview=1" al final del
    // enlace para saltarte los dos bloqueos y revisar cómo queda todo.
    // Quítalo (o no lo incluyas) en el enlace que le compartas a ella.
    const isPreview = new URLSearchParams(location.search).get('preview') === '1';
    if (isPreview) { gate.classList.add('is-ready-to-show'); return; }

    if (!isMobileDevice()) {
      desktopLock.classList.add('is-on');
      return; // no seguimos: en escritorio no se muestra nada más
    }

    if (renderCountdown()) {
      dateLock.classList.add('is-on');
      startCountdownLoop();
      return; // no seguimos: aún no es la fecha
    }

    // Pasaron ambos filtros: se muestra la puerta normal del regalo.
    gate.classList.add('is-ready-to-show');
  }

  initGuards();

})();