/* ==========================================================
   ZONA SEGURA · Núcleo compartido
   - ZS.store   estado único del recorrido (participante, etapas, puntajes)
   - ZS.ui      utilidades de interfaz (avisos, confeti, diálogos)
   - ZS.sfx     efectos de sonido sintetizados (con silencio persistente)
   - ZS.journey barra superior, guardia de etapas y navegación
   ========================================================== */
(function () {
  'use strict';

  const ZS = (window.ZS = window.ZS || {});

  /* ========================================================
     STORE
     ======================================================== */
  const KEY = 'zs:v2';
  const HISTORY_KEY = 'zs:history';
  const MUTE_KEY = 'zs:muted';
  const LEGACY_KEYS = ['zona-segura-progress', 'zona-segura-global', 'zonaSegura_playerIdentity', 'zonaSegura_historial'];

  // Etapas del recorrido, en orden. `weight` = puntos que aporta al total de 1000.
  const STAGES = [
    { id: 'registro', label: 'Registro', href: 'introduccion.html', weight: 0 },
    { id: 'epp', label: 'Viste al trabajador', href: 'epp.html', weight: 300 },
    { id: 'bienestar', label: 'Bienestar', href: 'elegir.html', weight: 300 },
    { id: 'sena', label: 'Retos SST', href: 'sena.html', weight: 400 },
    { id: 'resultados', label: 'Resultados', href: 'resultados.html', weight: 0 },
  ];
  const MAX_POINTS = STAGES.reduce((acc, s) => acc + s.weight, 0);

  const storage = {
    read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    write(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modo privado o sin espacio */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* noop */ }
    },
  };

  LEGACY_KEYS.forEach((k) => storage.remove(k));

  function emptyState() {
    return { player: null, done: {}, results: {}, startedAt: 0, finishedAt: 0 };
  }

  let memory = null; // respaldo en memoria si localStorage no está disponible

  function read() {
    const s = storage.read(KEY, null) || memory || emptyState();
    if (!s.done) s.done = {};
    if (!s.results) s.results = {};
    return s;
  }

  function write(s) {
    memory = s;
    storage.write(KEY, s);
    document.dispatchEvent(new CustomEvent('zs:change', { detail: s }));
  }

  function stageIndex(id) {
    return STAGES.findIndex((s) => s.id === id);
  }

  // Puntos de una etapa: raw/max escalado a su peso, redondeado.
  function stagePoints(id, s) {
    s = s || read();
    const stage = STAGES[stageIndex(id)];
    const r = s.results[id];
    if (!stage || !r || !r.max) return 0;
    return Math.round(Math.max(0, Math.min(1, r.raw / r.max)) * stage.weight);
  }

  function totalPoints(s) {
    s = s || read();
    return STAGES.reduce((acc, st) => acc + stagePoints(st.id, s), 0);
  }

  // Primera etapa no completada (la que corresponde jugar ahora).
  function currentStage(s) {
    s = s || read();
    return STAGES.find((st) => !s.done[st.id]) || STAGES[STAGES.length - 1];
  }

  ZS.store = {
    STAGES,
    MAX_POINTS,
    get: read,
    stagePoints,
    totalPoints,
    currentStage,
    stageIndex,

    setPlayer(name, role) {
      const s = read();
      s.player = { name, role };
      if (!s.startedAt) s.startedAt = Date.now();
      s.done.registro = true;
      write(s);
    },

    // Guarda el resultado de una etapa y la marca como completada.
    // result = { raw, max, module?, detail? }
    completeStage(id, result) {
      const s = read();
      if (result) s.results[id] = result;
      s.done[id] = true;
      if (id === 'resultados' && !s.finishedAt) s.finishedAt = Date.now();
      write(s);
      return stagePoints(id, s);
    },

    // Convierte puntaje crudo de un módulo a puntos del recorrido (escala de 1000).
    scale(id, maxRaw) {
      const w = STAGES[stageIndex(id)].weight;
      return (raw) => Math.round((Math.max(0, raw) / maxRaw) * w);
    },

    elapsedMs(s) {
      s = s || read();
      if (!s.startedAt) return 0;
      return Math.max(0, (s.finishedAt || Date.now()) - s.startedAt);
    },

    // Reinicia el recorrido para el siguiente participante (conserva el historial).
    reset() {
      memory = null;
      storage.remove(KEY);
      document.dispatchEvent(new CustomEvent('zs:change', { detail: emptyState() }));
    },

    history: {
      list() {
        const h = storage.read(HISTORY_KEY, []);
        return Array.isArray(h) ? h : [];
      },
      add(entry) {
        const h = ZS.store.history.list();
        h.push(entry);
        storage.write(HISTORY_KEY, h.slice(-100));
        return h;
      },
    },
  };

  /* ========================================================
     UI
     ======================================================== */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ICONS = {
    skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l8 7-8 7V5zM17 5v14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 11v6M12 7.2v.1"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  let toastHost = null;
  function toast(message, variant) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (variant ? ' toast--' + variant : '');
    el.textContent = message;
    toastHost.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function floatPoints(anchor, text, bad) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-points' + (bad ? ' float-points--bad' : '');
    el.textContent = text;
    el.style.left = r.left + r.width / 2 - 30 + 'px';
    el.style.top = r.top + Math.min(r.height / 2, 40) - 20 + 'px';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  const CONFETTI_COLORS = ['#39a900', '#ffc400', '#0b6fbf', '#d9690a', '#12161b', '#ffffff'];
  function confetti(anchor, count) {
    if (reducedMotion()) return;
    const n = count || 36;
    const r = anchor ? anchor.getBoundingClientRect() : { left: 0, top: window.innerHeight * 0.3, width: window.innerWidth, height: 0 };
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      const size = 6 + Math.random() * 7;
      const x = r.left + Math.random() * r.width;
      const y = r.top + r.height / 2;
      p.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size * 1.4 +
        'px;background:' + CONFETTI_COLORS[i % CONFETTI_COLORS.length] + ';border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.06)';
      layer.appendChild(p);
      const dx = (Math.random() - 0.5) * 420;
      const up = -(120 + Math.random() * 220);
      const down = 260 + Math.random() * 320;
      p.animate(
        [
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          { transform: 'translate(' + dx * 0.6 + 'px,' + up + 'px) rotate(' + Math.random() * 360 + 'deg)', opacity: 1, offset: 0.35 },
          { transform: 'translate(' + dx + 'px,' + down + 'px) rotate(' + Math.random() * 900 + 'deg)', opacity: 0 },
        ],
        { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.35,1)', fill: 'forwards' }
      );
    }
    setTimeout(() => layer.remove(), 2200);
  }

  function animateNumber(el, to, duration) {
    if (!el) return;
    const from = Number(el.dataset.value || el.textContent.replace(/\D/g, '')) || 0;
    el.dataset.value = String(to);
    if (reducedMotion() || from === to) { el.textContent = String(to); return; }
    const d = duration || 600;
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / d);
      el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Muestra una sola pantalla de un grupo: <section data-screen="x">.
  function showScreen(name, root) {
    $$('[data-screen]', root).forEach((el) => {
      const on = el.dataset.screen === name;
      el.hidden = !on;
      if (on) {
        el.classList.remove('screen');
        void el.offsetWidth;
        el.classList.add('screen');
      }
    });
    const target = $('[data-screen="' + name + '"]', root);
    if (target) {
      const heading = target.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  // Diálogo accesible basado en <dialog>. Devuelve una promesa con el valor del botón.
  function dialog(opts) {
    return new Promise((resolve) => {
      const d = document.createElement('dialog');
      d.className = 'dialog' + (opts.sheet ? ' dialog--sheet' : '');
      const buttons = (opts.actions || [{ label: 'Entendido', value: true, variant: 'primary' }])
        .map((a, i) => '<button type="button" class="btn btn--' + (a.variant || 'ghost') + '" data-i="' + i + '">' + esc(a.label) + '</button>')
        .join('');
      d.innerHTML =
        '<div class="dialog__body">' +
          (opts.eyebrow ? '<span class="eyebrow">' + esc(opts.eyebrow) + '</span>' : '') +
          '<h2 class="h2" style="margin-top:6px">' + esc(opts.title) + '</h2>' +
          (opts.html || (opts.text ? '<p>' + esc(opts.text) + '</p>' : '')) +
        '</div>' +
        '<div class="dialog__foot">' + buttons + '</div>';
      document.body.appendChild(d);
      let value = opts.cancelValue;
      d.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (b) { value = opts.actions ? opts.actions[Number(b.dataset.i)].value : true; d.close(); }
        else if (e.target === d && opts.dismissible !== false) d.close();
      });
      d.addEventListener('cancel', (e) => { if (opts.dismissible === false) e.preventDefault(); });
      d.addEventListener('close', () => { d.remove(); resolve(value); });
      if (typeof opts.onOpen === 'function') opts.onOpen(d);
      d.showModal();
      const primary = d.querySelector('.btn--primary') || d.querySelector('.btn');
      if (primary) primary.focus();
    });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatDuration(ms) {
    const total = Math.max(0, Math.round((ms || 0) / 1000));
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  }

  function setMeter(el, ratio) {
    if (el) el.style.setProperty('--p', String(Math.max(0, Math.min(1, ratio))));
  }

  function lives(host, total) {
    host.innerHTML = '';
    for (let i = 0; i < total; i++) host.insertAdjacentHTML('beforeend', ICONS.heart);
    host.setAttribute('role', 'img');
    return function render(left, losing) {
      $$('svg', host).forEach((svg, i) => {
        svg.classList.toggle('is-lost', i >= left);
        svg.classList.remove('is-losing');
        if (losing && i === left) { void svg.getBoundingClientRect(); svg.classList.add('is-losing'); }
      });
      host.setAttribute('aria-label', left + ' de ' + total + ' vidas');
    };
  }

  function feedback(host, kind, title, text) {
    const icon = kind === 'ok' ? ICONS.check : kind === 'bad' ? ICONS.x : ICONS.info;
    host.hidden = false;
    host.innerHTML =
      '<div class="feedback feedback--' + kind + '">' +
        '<span class="feedback__icon" aria-hidden="true">' + icon + '</span>' +
        '<div><p class="feedback__title">' + esc(title) + '</p>' +
        (text ? '<p class="feedback__text">' + esc(text) + '</p>' : '') + '</div>' +
      '</div>';
  }

  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  ZS.ui = { plural, $, $$, esc, ICONS, toast, floatPoints, confetti, animateNumber, showScreen, dialog, shuffle, formatDuration, setMeter, lives, feedback, reducedMotion };

  /* ========================================================
     SONIDO
     ======================================================== */
  let actx = null;
  let muted = storage.read(MUTE_KEY, false) === true;

  function ctx() {
    if (muted) return null;
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }

  function tone(freq, dur, type, gain, delay) {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  ZS.sfx = {
    isMuted: () => muted,
    setMuted(v) {
      muted = !!v;
      storage.write(MUTE_KEY, muted);
      document.dispatchEvent(new CustomEvent('zs:mute', { detail: muted }));
    },
    click: () => tone(520, 0.05, 'square', 0.06),
    flip: () => tone(700, 0.06, 'triangle', 0.1),
    tick: () => tone(1100, 0.03, 'square', 0.05),
    correct: () => { tone(523, 0.1, 'triangle', 0.16); tone(784, 0.16, 'triangle', 0.16, 0.09); },
    wrong: () => { tone(220, 0.12, 'sawtooth', 0.1); tone(160, 0.2, 'sawtooth', 0.1, 0.1); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.16, i * 0.1)),
    phase: (f) => tone(f || 440, 0.5, 'sine', 0.08),
  };

  /* ========================================================
     RECORRIDO: guardia + barra superior
     ======================================================== */
  const base = document.documentElement.dataset.base || '';
  const href = (page) => base + 'games/' + page;

  function guard(stageId) {
    const s = read();
    const idx = stageIndex(stageId);
    const cur = currentStage(s);
    const curIdx = stageIndex(cur.id);
    // No se puede saltar hacia adelante ni repetir etapas ya completadas
    // (el recorrido es lineal). Los resultados se pueden revisar al final.
    if (idx !== curIdx && !(stageId === 'resultados' && s.done.sena)) {
      window.location.replace(href(cur.href));
      return false;
    }
    return true;
  }

  function renderTopbar(stageId) {
    const s = read();
    const idx = stageIndex(stageId);
    const stage = STAGES[idx];
    const points = totalPoints(s);
    const progress = STAGES.filter((st) => s.done[st.id]).length / STAGES.length;

    const steps = STAGES.map((st, i) => {
      const state = s.done[st.id] && i !== idx ? 'is-done' : i === idx ? 'is-current' : '';
      return '<li class="stepper__item ' + state + '"' + (i === idx ? ' aria-current="step"' : '') + '>' +
        '<span class="stepper__dot">' + (state === 'is-done' ? '✓' : i === 0 ? '·' : i) + '</span>' + esc(st.label) + '</li>';
    }).join('');

    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML =
      '<div class="hazard" aria-hidden="true"></div>' +
      '<div class="topbar__inner">' +
        '<span class="brand"><img src="' + base + 'assets/images/logo-sena.png" alt="SENA"><span>ZONA SEGURA</span></span>' +
        '<ol class="stepper" aria-label="Etapas del recorrido">' + steps + '</ol>' +
        '<div class="topbar__compact"><p class="topbar__compact-label"><span>' + (idx === 0 ? 'ANTES DE EMPEZAR' : 'ETAPA ' + idx + ' DE ' + (STAGES.length - 1)) + '</span>' + esc(stage ? stage.label : '') + '</p></div>' +
        '<div class="topbar__tools">' +
          (stage && stage.weight > 0 ? '<button type="button" class="topbar__skip js-skip">' + ICONS.skip + '<span>Saltar etapa</span></button>' : '') +
          '<span class="score-pill" title="Puntaje del recorrido"><span class="js-total" data-value="' + points + '">' + points + '</span><small>PTS</small></span>' +
          '<button type="button" class="icon-btn js-mute"></button>' +
        '</div>' +
      '</div>' +
      '<div class="topbar__progress"><div class="topbar__progress-fill" style="--p:' + progress + '"></div></div>';

    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main';
    skip.textContent = 'Saltar al contenido';
    document.body.prepend(bar);
    document.body.prepend(skip);

    const muteBtn = $('.js-mute', bar);
    const paintMute = () => {
      const m = ZS.sfx.isMuted();
      muteBtn.innerHTML = m ? ICONS.soundOff : ICONS.soundOn;
      muteBtn.setAttribute('aria-label', m ? 'Activar sonido' : 'Silenciar sonido');
      muteBtn.setAttribute('aria-pressed', String(m));
    };
    paintMute();
    muteBtn.addEventListener('click', () => ZS.sfx.setMuted(!ZS.sfx.isMuted()));
    document.addEventListener('zs:mute', paintMute);

    const skipBtn = $('.js-skip', bar);
    if (skipBtn) skipBtn.addEventListener('click', () => skipStage(stageId));

    const pill = $('.score-pill', bar);
    document.addEventListener('zs:change', () => {
      const next = totalPoints();
      const el = $('.js-total', bar);
      if (Number(el.dataset.value) !== next) {
        animateNumber(el, next, 700);
        pill.classList.remove('is-bump');
        void pill.offsetWidth;
        pill.classList.add('is-bump');
      }
    });
  }

  // Cada módulo puede registrar una función que devuelve su resultado parcial,
  // para que al saltar la etapa se conserven los puntos ya ganados.
  let partialFn = null;

  async function skipStage(stageId) {
    const partial = (partialFn && partialFn()) || null;
    const stage = STAGES[stageIndex(stageId)];
    const keep = partial ? Math.round(Math.max(0, Math.min(1, partial.raw / partial.max)) * stage.weight) : 0;
    const ok = await dialog({
      eyebrow: stage.label,
      title: '¿Saltar esta etapa?',
      text: keep > 0
        ? 'Pasarás directo a la siguiente parada y conservas los ' + keep + ' puntos que llevas.'
        : 'Pasarás directo a la siguiente parada. Esta etapa sumará 0 puntos, pero podrás terminar el recorrido y recibir tu certificado.',
      actions: [{ label: 'Seguir jugando', value: false, variant: 'ghost' }, { label: 'Sí, saltar etapa', value: true, variant: 'primary' }],
      cancelValue: false,
    });
    if (!ok) return;
    const result = Object.assign({ raw: 0, max: 1 }, partial || {}, { skipped: true });
    ZS.journey.next(stageId, result);
  }

  ZS.journey = {
    href,
    // Registra el proveedor del resultado parcial de la etapa actual.
    partial(fn) { partialFn = fn; },
    // Llamar al inicio de cada página del recorrido.
    mount(stageId) {
      if (!guard(stageId)) return false;
      renderTopbar(stageId);
      return true;
    },
    // Completa la etapa y navega a la siguiente.
    next(stageId, result) {
      ZS.store.completeStage(stageId, result);
      const nxt = STAGES[stageIndex(stageId) + 1];
      if (nxt) window.location.href = href(nxt.href);
    },
  };
})();
