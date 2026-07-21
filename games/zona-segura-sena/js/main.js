// ==========================================================
// ZONA SEGURA — main.js
// Lógica de la pantalla de bienvenida + navegación entre pantallas
// ==========================================================

// ---------- Identidad del jugador ----------
// El nombre y la función ya no se piden aquí: se capturan una sola vez
// al inicio de todo el recorrido (introduccion.html) y quedan guardados
// en el store global PlayerIdentity (scripts/player-identity.js).
// Si alguien entra directo a este módulo sin haber pasado por ahí,
// lo mandamos de vuelta para mantener el recorrido lineal.
const playerIdentity = (window.PlayerIdentity && window.PlayerIdentity.get()) || { name: '', role: '' };
const hasCompletePlayerIdentity = !window.PlayerIdentity || window.PlayerIdentity.isComplete();
if (!hasCompletePlayerIdentity) {
  window.location.href = '../introduccion.html';
}

const state = {
  playerName: playerIdentity.name,
  playerRole: playerIdentity.role,
};

const gameState = {
  score: 0,
  badges: 0,
  level: 0,
  startTime: Date.now(),
};

// ---------- Persistencia en localStorage ----------
const STORAGE_KEY = 'zonaSegura_historial';
const MAX_HISTORIAL = 100;

function loadHistorial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('No se pudo leer el historial guardado:', error);
    return [];
  }
}

function saveResultToHistorial(record) {
  try {
    const historial = loadHistorial();
    historial.push(record);
    // Nos quedamos con los registros más recientes para no crecer sin límite.
    const recortado = historial.slice(-MAX_HISTORIAL);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recortado));
    return recortado;
  } catch (error) {
    console.warn('No se pudo guardar el progreso en localStorage:', error);
    return loadHistorial();
  }
}

// ---------- Configuración global ----------
const DEFAULT_ROLE = 'FUNCIONARIO';

// (El arranque directo a la ronda 1 se dispara al final del archivo,
// una vez que goToScreen y el resto de la lógica de niveles ya existen.)

// ==========================================================
// SISTEMA DE NIVELES
// Cada ronda del juego equivale a un nivel. Controla el
// indicador global fijo (arriba a la izquierda) y el overlay
// de transición que aparece al entrar a un nivel nuevo.
// ==========================================================

const LEVELS = [
  { screenId: 'screen-round1', number: 1, name: 'Cinta transportadora' },
  { screenId: 'screen-round2', number: 2, name: 'Memorama SST' },
  { screenId: 'screen-round3', number: 3, name: 'Ruleta Zona Segura' },
  // La ronda 4 (Viste al Trabajador) se juega en el módulo independiente
  // games/epp.html, así que no aparece como "nivel" en este flujo.
];
const TOTAL_LEVELS = LEVELS.length;

const levelIndicator = document.getElementById('level-indicator');
const levelIndicatorCurrent = document.getElementById('level-indicator-current');
const levelIndicatorTotal = document.getElementById('level-indicator-total');
const levelIndicatorDots = document.getElementById('level-indicator-dots');
const levelUpOverlay = document.getElementById('level-up-overlay');
const levelUpTitle = document.getElementById('level-up-title');
const levelUpSubtitle = document.getElementById('level-up-subtitle');

if (levelIndicatorTotal) levelIndicatorTotal.textContent = String(TOTAL_LEVELS);

// ---------- Construye los puntos del indicador (una vez) ----------
if (levelIndicatorDots) {
  LEVELS.forEach((lvl) => {
    const dot = document.createElement('span');
    dot.className = 'level-indicator__dot';
    dot.dataset.level = String(lvl.number);
    levelIndicatorDots.appendChild(dot);
  });
}

// ---------- Actualiza el indicador fijo para el nivel dado ----------
function updateLevelIndicator(levelNumber) {
  if (!levelIndicator) return;

  if (!levelNumber) {
    levelIndicator.hidden = true;
    return;
  }

  levelIndicator.hidden = false;
  if (levelIndicatorCurrent) levelIndicatorCurrent.textContent = String(levelNumber);

  if (levelIndicatorDots) {
    Array.from(levelIndicatorDots.children).forEach((dot) => {
      const dotLevel = Number(dot.dataset.level);
      dot.classList.toggle('is-done', dotLevel < levelNumber);
      dot.classList.toggle('is-current', dotLevel === levelNumber);
    });
  }
}

let levelUpTimeoutId = null;

// ---------- Muestra el overlay "Nivel X" al entrar a una ronda nueva ----------
function showLevelUpOverlay(level) {
  if (!levelUpOverlay) return;

  levelUpTitle.textContent = `Nivel ${level.number}`;
  levelUpSubtitle.textContent = level.name;

  levelUpOverlay.hidden = false;
  // Forzar reflow para que la transición de opacidad se dispare siempre.
  void levelUpOverlay.offsetWidth;
  levelUpOverlay.classList.add('is-visible');
  SoundFX.badge();

  if (levelUpTimeoutId) clearTimeout(levelUpTimeoutId);
  levelUpTimeoutId = setTimeout(() => {
    levelUpOverlay.classList.remove('is-visible');
    setTimeout(() => { levelUpOverlay.hidden = true; }, 300);
  }, 1600);
}

// ---------- Punto de entrada: se llama cada vez que cambia de pantalla ----------
function handleLevelForScreen(screenId) {
  const level = LEVELS.find((lvl) => lvl.screenId === screenId);

  if (!level) {
    updateLevelIndicator(null);
    return;
  }

  const isNewLevel = gameState.level !== level.number;
  gameState.level = level.number;
  updateLevelIndicator(level.number);

  if (isNewLevel) {
    showLevelUpOverlay(level);
  }
}

// ---------- Transición de pantallas con GSAP (con respaldo CSS si no carga) ----------
let screenTransitioning = false;

function transitionToScreen(screenId) {
  const targetEl = document.getElementById(screenId);
  if (!targetEl) {
    console.warn(`goToScreen: no existe la pantalla "${screenId}"`);
    return;
  }

  const activeEl = document.querySelector('.screen.screen--active');
  if (activeEl === targetEl) return;

  const hasGSAP = typeof window.gsap !== 'undefined';

  // ---------- Respaldo sin GSAP: comportamiento anterior (instantáneo + CSS) ----------
  if (!hasGSAP) {
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.remove('screen--active', 'screen--css-fallback-enter');
    });
    targetEl.classList.add('screen--active', 'screen--css-fallback-enter');
    targetEl.addEventListener('animationend', () => {
      targetEl.classList.remove('screen--css-fallback-enter');
    }, { once: true });
    return;
  }

  // ---------- Con GSAP: la saliente se desvanece con un pequeño "morph"
  // y la entrante llega con su propia línea de tiempo, con un ligero solape
  // para que se sienta como una transición continua y no dos pasos sueltos. ----------
  screenTransitioning = true;

  if (activeEl) {
    gsap.killTweensOf(activeEl);
    gsap.to(activeEl, {
      opacity: 0,
      y: -16,
      scale: 0.97,
      filter: 'blur(6px)',
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => {
        activeEl.classList.remove('screen--active');
        gsap.set(activeEl, { clearProps: 'opacity,transform,filter' });
      },
    });
  }

  gsap.delayedCall(activeEl ? 0.16 : 0, () => {
    targetEl.classList.add('screen--active');
    gsap.killTweensOf(targetEl);
    gsap.fromTo(
      targetEl,
      { opacity: 0, y: 22, scale: 0.97, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.5,
        ease: 'power3.out',
        onComplete: () => {
          gsap.set(targetEl, { clearProps: 'filter' });
          screenTransitioning = false;
        },
      },
    );
  });
}

// ---------- Navegación entre pantallas ----------
function goToScreen(screenId) {
  if (screenId !== 'screen-round1' && typeof clearRound1Timer === 'function') {
    clearRound1Timer();
  }
  if (screenId !== 'screen-round2' && typeof clearRound2Preview === 'function') {
    clearRound2Preview();
  }

  transitionToScreen(screenId);
  handleLevelForScreen(screenId);
}

// ==========================================================
// FX — Animaciones de refuerzo (shake, badges, confeti, fuegos artificiales)
// ==========================================================
// ---------- Animaciones "pro" con GSAP (mejora visual de la cinta) ----------
// Si por algún motivo GSAP no cargó (ej. sin internet en el stand), cada
// función cae de vuelta a las clases CSS que ya existían antes.
const Motion = (() => {
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (!hasGSAP) {
    console.warn('GSAP no está disponible (revisa js/vendor/gsap.min.js). Usando animaciones CSS de respaldo.');
  } else if (typeof MotionPathPlugin !== 'undefined') {
    gsap.registerPlugin(MotionPathPlugin);
  }

  // Entrada escalonada de las tarjetas del turno (1 o 2 si es evento "doble")
  function cardsEntrance(cardEls) {
    if (!hasGSAP) {
      cardEls.forEach((el) => el.classList.add('item-card--entering-fallback'));
      return;
    }
    gsap.set(cardEls, { opacity: 0, y: -70, rotation: -8, scale: 0.9, transformOrigin: '50% 50%' });
    gsap.to(cardEls, {
      opacity: 1,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.55,
      ease: 'back.out(1.6)',
      stagger: 0.12,
      onComplete: () => {
        cardEls.forEach((el) => {
          el.style.transform = '';
          el.classList.remove('item-card--entering');
          el.classList.add('item-card--idle');
        });
      },
    });
  }

  // Vuelo de la tarjeta hacia la caja correcta cuando aciertas.
  // onImpact: callback que dispara confeti/insignia/toast justo en el momento
  // en que la tarjeta "cae" dentro de la caja, para que todo se sienta como
  // un solo golpe coreografiado en vez de piezas sueltas.
  function flyToBin(cardEl, binEl, onImpact) {
    if (!hasGSAP || !binEl) {
      if (onImpact) onImpact();
      return;
    }
    cardEl.style.transition = 'none';
    binEl.style.animation = 'none'; // evita que choque con @keyframes bin-pop (CSS) mientras GSAP anima el mismo transform
    const lidEl = binEl.querySelector('.bin__lid');
    if (lidEl) lidEl.style.transition = 'none';

    const cardRect = cardEl.getBoundingClientRect();
    const binRect = binEl.getBoundingClientRect();
    const dx = (binRect.left + binRect.width / 2) - (cardRect.left + cardRect.width / 2);
    const dy = (binRect.top + binRect.height / 2) - (cardRect.top + cardRect.height / 2);
    const hasMotionPath = typeof MotionPathPlugin !== 'undefined';

    const tl = gsap.timeline();

    // Anticipación: un pequeño "salto" antes de caer, como tomar impulso
    tl.to(cardEl, { y: -20, scale: 1.08, rotation: -5, duration: 0.13, ease: 'power2.out' });

    if (hasMotionPath) {
      // Arco real: sube un poco y luego cae con aceleración tipo gravedad,
      // en vez de una línea recta sin vida.
      tl.to(cardEl, {
        duration: 0.5,
        ease: 'power1.in',
        motionPath: {
          path: [
            { x: 0, y: 0 },
            { x: dx * 0.55, y: Math.min(dy * 0.35, -35) },
            { x: dx, y: dy },
          ],
          curviness: 1.25,
        },
        rotation: 22,
        scale: 0.3,
      }, '+=0.02');
    } else {
      tl.to(cardEl, { x: dx, y: dy, scale: 0.3, rotation: 22, duration: 0.45, ease: 'power3.in' }, '+=0.02');
    }

    tl.call(() => {
      // "Impacto": la tapa se abre justo cuando la tarjeta cae dentro
      if (lidEl) {
        gsap.timeline()
          .to(lidEl, { rotateX: -130, y: -2, duration: 0.16, ease: 'back.out(3)' })
          .to(lidEl, { rotateX: 0, y: 0, duration: 0.3, ease: 'power2.out' }, '+=0.12');
      }
      gsap.timeline()
        .to(binEl, { scale: 1.12, duration: 0.14, ease: 'back.out(3)' })
        .to(binEl, { scale: 1, duration: 0.25, ease: 'power2.out' });
      binEl.classList.add('is-correct-flash');
      gsap.to(cardEl, { opacity: 0, duration: 0.12 });
      if (onImpact) onImpact();
    }, null, '-=0.06');
  }

  // Sacudida rápida de la tarjeta cuando fallas (reemplaza el fx-shake CSS)
  function shakeWrong(cardEl) {
    if (!hasGSAP) return;
    cardEl.style.transition = 'none';
    gsap.timeline()
      .to(cardEl, { x: -10, duration: 0.07, ease: 'power1.inOut' })
      .to(cardEl, { x: 10, duration: 0.07, ease: 'power1.inOut' })
      .to(cardEl, { x: -7, duration: 0.07, ease: 'power1.inOut' })
      .to(cardEl, { x: 7, duration: 0.07, ease: 'power1.inOut' })
      .to(cardEl, { x: 0, duration: 0.1, ease: 'power2.out' });
  }

  return { hasGSAP, cardsEntrance, flyToBin, shakeWrong };
})();

const FX = (() => {
  const COLORS = ['#39A900', '#2D7A00', '#FFB800', '#4AA8FF', '#FF5A5A', '#FFFFFF'];
  const GOLD_COLORS = ['#FFD700', '#FFB800', '#FFF3C4', '#FFFFFF'];

  function rectOf(el) {
    if (el && el.getBoundingClientRect) return el.getBoundingClientRect();
    return { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  }

  // Sacude un elemento (para respuestas incorrectas)
  function shake(el) {
    if (!el) return;
    el.classList.remove('fx-shake');
    void el.offsetWidth; // forzar reflow para poder repetir la animación
    el.classList.add('fx-shake');
    el.addEventListener('animationend', () => el.classList.remove('fx-shake'), { once: true });
  }

  // Muestra una insignia flotante: ✓ verde (correct) o ✕ roja (wrong)
  function badge(el, type) {
    if (!el) return;
    const r = rectOf(el);
    const b = document.createElement('div');
    b.className = `fx-badge fx-badge--${type}`;
    b.style.left = `${r.left + r.width / 2}px`;
    b.style.top = `${r.top + r.height / 2}px`;
    b.innerHTML = type === 'correct'
      ? '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none"><path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
    document.body.appendChild(b);
    setTimeout(() => {
      b.classList.add('is-leaving');
      setTimeout(() => b.remove(), 250);
    }, 650);
  }

  // Lanza un puñado de confeti desde el centro de un elemento
  function confetti(el, count = 26, opts = {}) {
    const r = rectOf(el);
    const originX = r.left + r.width / 2;
    const originY = r.top + r.height / 2;
    const palette = opts.gold ? GOLD_COLORS : COLORS;

    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement('div');
      piece.className = 'fx-confetti-piece';
      if (Math.random() > 0.5) piece.classList.add('is-round');

      const angle = Math.random() * Math.PI * 2;
      const distance = 55 + Math.random() * 100;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 45; // sesgo hacia arriba, como un estallido

      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      piece.style.setProperty('--fx-dx', `${dx}px`);
      piece.style.setProperty('--fx-dy', `${dy}px`);
      piece.style.setProperty('--fx-rot', `${(Math.random() * 720 - 360).toFixed(0)}deg`);
      piece.style.background = palette[Math.floor(Math.random() * palette.length)];
      piece.style.animationDelay = `${Math.random() * 90}ms`;

      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 1150);
    }
  }

  // Varias ráfagas de confeti repartidas por la pantalla, tipo "fuegos artificiales"
  function fireworks(bursts = 3, opts = {}) {
    for (let i = 0; i < bursts; i += 1) {
      setTimeout(() => {
        const x = window.innerWidth * (0.18 + Math.random() * 0.64);
        const y = window.innerHeight * (0.15 + Math.random() * 0.35);
        confetti({ getBoundingClientRect: () => ({ left: x, top: y, width: 0, height: 0 }) }, 36, opts);
      }, i * 260);
    }
  }

  // Anima un número subiendo/bajando de "from" a "to" (contador de puntaje)
  function countUp(el, from, to, duration = 450) {
    if (!el) return;
    const start = performance.now();
    const diff = to - from;
    if (diff === 0) {
      el.textContent = String(to);
      return;
    }
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = String(Math.round(from + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = String(to);
    }
    requestAnimationFrame(step);
  }

  // Toast flotante (ej. "+10 pts", "¡Racha x3!") que sube y se desvanece
  function toast(el, text, variant = 'points') {
    if (!el) return;
    const r = rectOf(el);
    const t = document.createElement('div');
    t.className = `fx-toast fx-toast--${variant}`;
    t.textContent = text;
    t.style.left = `${r.left + r.width / 2}px`;
    t.style.top = `${r.top}px`;
    document.body.appendChild(t);
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }

  // Anillo de luz pulsante alrededor de un ícono (al ganar una insignia)
  function glowRing(el) {
    if (!el) return;
    el.classList.remove('fx-glow-burst');
    void el.offsetWidth;
    el.classList.add('fx-glow-burst');
    el.addEventListener('animationend', () => el.classList.remove('fx-glow-burst'), { once: true });
  }

  // Muestra "¡Racha xN!" + confeti dorado extra
  function streakBurst(el, count) {
    toast(el, `¡Racha x${count}!`, 'streak');
    confetti(el, 30, { gold: true });
  }

  // Efecto ripple (onda) al presionar un elemento clicable
  // Efecto ripple (onda) al presionar un elemento clicable.
  // opts.clip = false evita "overflow: hidden" en el host — necesario para
  // elementos con hijos 3D (como las tarjetas del memorama), ya que
  // overflow distinto de "visible" rompe el transform-style: preserve-3d
  // del volteo (el mismo problema que causó el bug del filter anteriormente).
  function addRipple(el, opts = {}) {
    if (!el || el.dataset.fxRippleReady) return;
    el.dataset.fxRippleReady = 'true';
    el.classList.add(opts.clip === false ? 'fx-ripple-host--noclip' : 'fx-ripple-host');
    el.addEventListener('pointerdown', (event) => {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const ripple = document.createElement('span');
      ripple.className = 'fx-ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  return { shake, badge, confetti, fireworks, countUp, toast, glowRing, streakBurst, addRipple };
})();

// ==========================================================
// RONDA 1 — CINTA TRANSPORTADORA
// ==========================================================

// ---------- Banco de situaciones (CONTENIDO APROBADO) ----------
// Validado con el usuario a partir de la estructura real del SG-SST del SENA.
// Banco de 15 situaciones (5 por eje aprox). En cada partida se toma una
// selección dinámica y equilibrada (ver ROUND1_SITUATIONS_PER_EJE más abajo),
// con "trampas" realistas donde la causa aparente no coincide con el eje
// correcto — para entrenar el criterio, no la memoria.
const ROUND1_SITUATIONS = [
  {
    id: 1,
    text: 'Durante la jornada laboral, los funcionarios realizan una pausa activa para relajarse y recuperar energía.',
    eje: 'mental',
    explicacion: 'Las pausas activas fortalecen el bienestar físico y mental.',
  },
  {
    id: 2,
    text: 'El área de Talento Humano organiza una charla sobre el manejo del estrés.',
    eje: 'mental',
    explicacion: 'Estas actividades promueven el bienestar emocional.',
  },
  {
    id: 3,
    text: 'Un funcionario escucha y apoya a un compañero que se siente preocupado.',
    eje: 'mental',
    explicacion: 'La empatía fortalece un ambiente laboral saludable.',
  },
  {
    id: 4,
    text: 'El equipo de trabajo resuelve un desacuerdo mediante el diálogo y el respeto.',
    eje: 'mental',
    explicacion: 'La buena convivencia hace parte del cuidado de la salud mental.',
  },
  {
    id: 5,
    text: 'Se realiza una jornada de vacunación para los funcionarios.',
    eje: 'medicina',
    explicacion: 'Las vacunas ayudan a prevenir enfermedades.',
  },
  {
    id: 6,
    text: 'Un funcionario recibe atención en enfermería por un malestar.',
    eje: 'medicina',
    explicacion: 'La atención en salud pertenece a Medicina Laboral.',
  },
  {
    id: 7,
    text: 'El jefe inmediato recuerda mantenerse hidratado durante la jornada laboral.',
    eje: 'medicina',
    explicacion: 'La hidratación favorece el cuidado de la salud.',
  },
  {
    id: 8,
    text: 'Se realiza una campaña de hábitos de vida saludable.',
    eje: 'medicina',
    explicacion: 'Promueve la prevención y el autocuidado.',
  },
  {
    id: 9,
    text: 'Antes de ingresar al área de trabajo todos utilizan gafas de seguridad.',
    eje: 'higiene',
    explicacion: 'Los elementos de protección ayudan a prevenir accidentes.',
  },
  {
    id: 10,
    text: 'Un funcionario reporta un cable atravesando el pasillo.',
    eje: 'higiene',
    explicacion: 'Reportar riesgos evita accidentes.',
  },
  {
    id: 11,
    text: 'Las rutas de evacuación permanecen despejadas.',
    eje: 'higiene',
    explicacion: 'Las rutas libres permiten una evacuación segura.',
  },
  {
    id: 12,
    text: 'Antes de usar una herramienta el jefe de área explica las normas de seguridad.',
    eje: 'higiene',
    explicacion: 'Conocer las normas reduce el riesgo de accidentes.',
  },
  {
    id: 13,
    text: 'Se señaliza un piso mojado.',
    eje: 'higiene',
    explicacion: 'La señalización previene caídas.',
  },
  {
    id: 14,
    text: 'Cada funcionario mantiene limpio y ordenado su puesto de trabajo.',
    eje: 'higiene',
    explicacion: 'El orden contribuye a un ambiente seguro.',
  },
  {
    id: 15,
    text: 'El equipo participa en una actividad para fortalecer el trabajo en equipo.',
    eje: 'mental',
    explicacion: 'El trabajo en equipo mejora la convivencia.',
  }
];

const EJE_LABELS = {
  mental: 'Mentalmente Saludable',
  medicina: 'Medicina Laboral',
  higiene: 'Higiene y Seguridad',
};

const EJE_EMOJI = {
  mental: '🧠',
  medicina: '⚕️',
  higiene: '🦺',
};

// ---------- Configuración dinámica de cantidad de contenido ----------
// Cuántas situaciones/pares se muestran por partida, tomadas al azar
// y de forma equilibrada (mismo número por cada uno de los 3 ejes)
// desde el banco completo definido arriba. Cambiar estos números
// ajusta automáticamente Ronda 1 y Ronda 2 sin tocar el resto del código.
const ROUND1_SITUATIONS_PER_EJE = 2; // 2 por eje x 3 ejes = 6 situaciones por partida
const ROUND2_PAIRS_PER_EJE = 1;      // 1 por eje x 3 ejes = 3 parejas por partida

// Toma "perEje" elementos aleatorios de cada eje presente en "pool" y
// devuelve el resultado combinado y barajado. Si un eje tiene menos
// elementos que "perEje", toma todos los que haya (no revienta).
function pickBalancedByEje(pool, perEje) {
  const porEje = {};
  pool.forEach((item) => {
    if (!porEje[item.eje]) porEje[item.eje] = [];
    porEje[item.eje].push(item);
  });

  const seleccion = [];
  Object.keys(porEje).forEach((eje) => {
    const barajado = shuffle(porEje[eje]);
    seleccion.push(...barajado.slice(0, perEje));
  });

  return shuffle(seleccion);
}

const ROUND1_LIVES = 3;
const ROUND1_BASE_TIME = 9; // segundos para la primera situación
const ROUND1_MIN_TIME = 5;  // piso de tiempo aunque avance la dificultad
const ROUND1_TIME_STEP = 0.5; // segundos que se reducen por cada acierto

const round1State = {
  order: [],
  index: 0,
  score: 0,
  correctCount: 0,
  answered: false,
  streak: 0,
  lives: ROUND1_LIVES,
  timeLimit: ROUND1_BASE_TIME,
  timeLeft: ROUND1_BASE_TIME,
  turnTimeLimit: ROUND1_BASE_TIME,
  timerId: null,
  turnType: 'single', // 'single' | 'double' | 'wildcard' | 'speedup' | 'boss'
  activeCards: [],
  usedWildcard: false,
  usedSpeedup: false,
  usedDouble: false,
};

// ---------- Referencias DOM ----------
const round1Game = document.getElementById('round1-game');
const round1Complete = document.getElementById('round1-complete');
const progressLabel = document.getElementById('round1-progress-label');
const progressFill = document.getElementById('round1-progress-fill');
const scoreEl = document.getElementById('round1-score');
const beltEl = document.getElementById('round1-belt');
const beltItemsEl = document.getElementById('belt-items');
const eventBannerEl = document.getElementById('round1-event-banner');
const bins = Array.from(document.querySelectorAll('.bin'));
const feedbackEl = document.getElementById('round1-feedback');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackText = document.getElementById('feedback-text');
const finalScoreEl = document.getElementById('final-score');
const round1NextBtn = document.getElementById('round1-next-btn');
const livesEls = Array.from(document.querySelectorAll('.life-heart'));
const timerFillEl = document.getElementById('round1-timer-fill');
const timerCountEl = document.getElementById('round1-timer-count');
const round1GameOver = document.getElementById('round1-gameover');
const round1RetryBtn = document.getElementById('round1-retry-btn');
const MAGNET_RADIUS = 110; // px: distancia desde la que un bin empieza a "atraer" la tarjeta

function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function startRound1() {
  try {
    console.log('Starting Round 1...');

    round1State.order = pickBalancedByEje(ROUND1_SITUATIONS, ROUND1_SITUATIONS_PER_EJE);
    round1State.index = 0;
    round1State.score = 0;
    round1State.correctCount = 0;
    round1State.streak = 0;
    round1State.lives = ROUND1_LIVES;
    round1State.timeLimit = ROUND1_BASE_TIME;
    round1State.turnTimeLimit = ROUND1_BASE_TIME;
    round1State.usedWildcard = false;
    round1State.usedSpeedup = false;
    round1State.usedDouble = false;
    round1State.activeCards = [];
    round1Game.hidden = false;
    round1Complete.hidden = true;
    if (round1GameOver) round1GameOver.hidden = true;
    scoreEl.textContent = '0';
    renderLives();

    renderCurrentTurn();
    console.log('Round 1 started successfully');
  } catch (error) {
    console.error('Error in startRound1:', error);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
  }
}

// ---------- Vidas ----------
function renderLives(losingIndex = null) {
  livesEls.forEach((el, i) => {
    const alive = i < round1State.lives;
    el.classList.toggle('is-lost', !alive);
    el.classList.remove('is-losing');
    if (losingIndex !== null && i === losingIndex) {
      void el.offsetWidth;
      el.classList.add('is-losing');
    }
  });
}

function loseLife() {
  const losingIndex = round1State.lives - 1;
  round1State.lives = Math.max(0, round1State.lives - 1);
  renderLives(losingIndex);
  return round1State.lives <= 0;
}

// ---------- Cronómetro por situación ----------
function clearRound1Timer() {
  if (round1State.timerId) {
    clearInterval(round1State.timerId);
    round1State.timerId = null;
  }
}

function startRound1Timer() {
  clearRound1Timer();
  round1State.timeLeft = round1State.turnTimeLimit;
  updateTimerUI();

  round1State.timerId = setInterval(() => {
    round1State.timeLeft -= 0.1;
    if (round1State.timeLeft <= 0) {
      round1State.timeLeft = 0;
      updateTimerUI();
      clearRound1Timer();
      handleTimeout();
      return;
    }
    updateTimerUI();
  }, 100);
}

function updateTimerUI() {
  if (!timerFillEl || !timerCountEl) return;
  const pct = Math.max(0, (round1State.timeLeft / round1State.turnTimeLimit) * 100);
  timerFillEl.style.width = `${pct}%`;

  const secondsLeft = Math.ceil(round1State.timeLeft);
  timerCountEl.textContent = String(secondsLeft);

  const isDanger = round1State.timeLeft <= round1State.turnTimeLimit * 0.25;
  const isWarning = !isDanger && round1State.timeLeft <= round1State.turnTimeLimit * 0.5;

  timerFillEl.classList.toggle('is-danger', isDanger);
  timerFillEl.classList.toggle('is-warning', isWarning);
  timerCountEl.classList.toggle('is-danger', isDanger);

  if (isDanger && Math.abs(secondsLeft - round1State.timeLeft) < 0.05) {
    SoundFX.tick();
  }
}

function handleTimeout() {
  if (round1State.answered) return;
  round1State.activeCards.forEach((cardObj) => {
    if (!cardObj.answered) resolveCard(cardObj, null, true);
  });
}

// ---------- Decide qué tipo de turno toca (normal / doble / comodín / aceleración / jefe) ----------
function decideTurnType(idx, total) {
  if (idx === total - 1) return 'boss';
  if (idx === 0) return 'single';

  const canDouble = !round1State.usedDouble && idx + 1 < total - 1;
  const canWildcard = !round1State.usedWildcard;
  const canSpeedup = !round1State.usedSpeedup;

  const roll = Math.random();
  if (canDouble && roll < 0.24) return 'double';
  if (canWildcard && roll < 0.44) return 'wildcard';
  if (canSpeedup && roll < 0.68) return 'speedup';
  return 'single';
}

const EVENT_BANNER_COPY = {
  double: { text: '🎯 ¡Dos objetos a la vez!', variant: 'double' },
  wildcard: { text: '⭐ ¡Objeto comodín! Acierta rápido y gana doble', variant: 'wildcard' },
  speedup: { text: '⚡ ¡La cinta se acelera de golpe!', variant: 'speedup' },
  boss: { text: '🔥 ¡Situación final! Modo jefe', variant: 'boss' },
};

let eventBannerTimeoutId = null;
function showEventBanner(turnType) {
  if (!eventBannerEl) return;
  const copy = EVENT_BANNER_COPY[turnType];
  if (!copy) {
    eventBannerEl.classList.remove('is-visible');
    return;
  }
  eventBannerEl.hidden = false;
  eventBannerEl.textContent = copy.text;
  eventBannerEl.className = `round1__event-banner round1__event-banner--${copy.variant}`;
  void eventBannerEl.offsetWidth;
  eventBannerEl.classList.add('is-visible');
  if (eventBannerTimeoutId) clearTimeout(eventBannerTimeoutId);
  eventBannerTimeoutId = setTimeout(() => {
    eventBannerEl.classList.remove('is-visible');
  }, 1700);
}

// ---------- Construye la tarjeta (uno de los ítems que "caen" a la cinta) ----------
function buildItemCard(situation, turnType) {
  const cardEl = document.createElement('div');
  cardEl.className = 'item-card item-card--entering';
  cardEl.tabIndex = 0;
  cardEl.setAttribute('role', 'group');
  cardEl.setAttribute('aria-label', 'Situación a clasificar');
  if (turnType === 'wildcard') cardEl.classList.add('item-card--wildcard');
  if (turnType === 'boss') cardEl.classList.add('item-card--boss');

  const tag = document.createElement('span');
  tag.className = 'item-card__tag';
  tag.setAttribute('aria-hidden', 'true');
  tag.textContent = turnType === 'wildcard' ? '⭐' : (turnType === 'boss' ? '🔥' : '📦');
  cardEl.appendChild(tag);

  const text = document.createElement('p');
  text.className = 'item-card__text';
  text.textContent = situation.text;
  cardEl.appendChild(text);

  return cardEl;
}

// ---------- Renderiza el turno actual (1 o 2 situaciones según el evento) ----------
function renderCurrentTurn() {
  const total = round1State.order.length;
  const turnType = decideTurnType(round1State.index, total);
  round1State.turnType = turnType;
  if (turnType === 'double') round1State.usedDouble = true;
  if (turnType === 'wildcard') round1State.usedWildcard = true;
  if (turnType === 'speedup') round1State.usedSpeedup = true;

  round1State.answered = false;
  feedbackEl.hidden = true;
  feedbackEl.classList.remove('is-wrong');

  beltItemsEl.innerHTML = '';
  const situations = turnType === 'double'
    ? [round1State.order[round1State.index], round1State.order[round1State.index + 1]]
    : [round1State.order[round1State.index]];

  round1State.activeCards = situations.map((situation) => {
    const cardEl = buildItemCard(situation, turnType);
    beltItemsEl.appendChild(cardEl);
    const cardObj = { situation, el: cardEl, answered: false, result: null };
    attachCardInteractions(cardEl, cardObj);
    return cardObj;
  });

  Motion.cardsEntrance(round1State.activeCards.map((c) => c.el));

  beltItemsEl.classList.toggle('belt__items--double', turnType === 'double');
  beltEl.classList.toggle('belt--boss', turnType === 'boss');
  beltEl.classList.toggle('belt--speedup', turnType === 'speedup');

  bins.forEach((bin) => {
    bin.disabled = false;
    bin.classList.remove('is-correct-flash', 'is-wrong-flash', 'is-drop-target');
  });

  const situationNumber = round1State.index + 1;
  if (turnType === 'boss') {
    progressLabel.textContent = `Situación final de ${total} · Modo jefe`;
  } else if (turnType === 'double') {
    progressLabel.textContent = `Situaciones ${situationNumber} y ${situationNumber + 1} de ${total}`;
  } else {
    progressLabel.textContent = `Situación ${situationNumber} de ${total}`;
  }
  progressFill.style.width = `${(round1State.index / total) * 100 + (100 / total) * 0.15}%`;

  let turnLimit = round1State.timeLimit;
  if (turnType === 'double') turnLimit = round1State.timeLimit * 1.6;
  if (turnType === 'boss') turnLimit = Math.max(ROUND1_MIN_TIME, round1State.timeLimit * 0.75);
  round1State.turnTimeLimit = turnLimit;

  showEventBanner(turnType);
  if (turnType === 'speedup') SoundFX.spin();
  if (turnType === 'boss') SoundFX.streak();

  startRound1Timer();
}

// ---------- Resuelve una tarjeta individual (clic en caja o soltar arrastre) ----------
function resolveCard(cardObj, chosenEje, timedOut = false) {
  if (cardObj.answered || round1State.answered) return;
  cardObj.answered = true;

  const situation = cardObj.situation;
  const cardEl = cardObj.el;
  const isCorrect = !timedOut && chosenEje === situation.eje;
  const chosenBin = bins.find((bin) => bin.dataset.eje === chosenEje);
  const correctBin = bins.find((bin) => bin.dataset.eje === situation.eje);
  const isWildcard = round1State.turnType === 'wildcard';
  const isBoss = round1State.turnType === 'boss';
  let ranOutOfLives = false;

  if (isCorrect) {
    const prevScore = round1State.score;
    const fastEnough = round1State.timeLeft > round1State.turnTimeLimit * 0.6;
    const speedBonus = fastEnough ? 5 : 0;
    let earned = 10 + speedBonus;
    if (isWildcard && fastEnough) earned *= 2;
    if (isBoss) earned += 15;
    round1State.score += earned;
    round1State.correctCount += 1;
    round1State.streak += 1;
    // La cinta se acelera un poco con cada acierto (hasta un piso mínimo)
    round1State.timeLimit = Math.max(ROUND1_MIN_TIME, round1State.timeLimit - ROUND1_TIME_STEP);
    cardEl.classList.add('is-correct');
    SoundFX.correct();

    const celebrate = () => {
      FX.countUp(scoreEl, prevScore, round1State.score, 450);
      FX.badge(cardEl, 'correct');
      if (chosenBin) FX.confetti(chosenBin);
      FX.toast(cardEl, `+${earned} pts${isWildcard && fastEnough ? ' ⭐x2' : ''}`, 'points');
      if (round1State.streak >= 3 && round1State.streak % 3 === 0) {
        SoundFX.streak();
        FX.streakBurst(cardEl, round1State.streak);
      }
    };

    if (chosenBin) {
      Motion.flyToBin(cardEl, chosenBin, celebrate);
    } else {
      celebrate();
    }
  } else {
    round1State.streak = 0;
    cardEl.classList.add('is-wrong');
    if (chosenBin) chosenBin.classList.add('is-wrong-flash');
    if (correctBin) correctBin.classList.add('is-correct-flash');
    SoundFX.wrong();
    if (Motion.hasGSAP) Motion.shakeWrong(cardEl); else FX.shake(cardEl);
    FX.badge(cardEl, 'wrong');
    ranOutOfLives = loseLife();
  }

  cardEl.style.pointerEvents = 'none';
  cardObj.result = { isCorrect, ranOutOfLives, timedOut, chosenEje };

  const allAnswered = round1State.activeCards.every((c) => c.answered);
  if (allAnswered) finalizeTurn();
}

// ---------- Cuando todas las tarjetas del turno quedaron resueltas ----------
function finalizeTurn() {
  round1State.answered = true;
  clearRound1Timer();

  const total = round1State.order.length;
  const advanceBy = round1State.activeCards.length;
  progressFill.style.width = `${Math.min(100, ((round1State.index + advanceBy) / total) * 100)}%`;

  const results = round1State.activeCards.map((c) => c.result);
  const anyGameOver = results.some((r) => r.ranOutOfLives);
  const allCorrect = results.every((r) => r.isCorrect);

  bins.forEach((bin) => { bin.disabled = true; });

  if (round1State.turnType === 'double') {
    const correctCountThisTurn = results.filter((r) => r.isCorrect).length;
    feedbackTitle.textContent = allCorrect
      ? '¡Las dos correctas!'
      : `${correctCountThisTurn} de ${results.length} correctas`;
    feedbackText.textContent = 'Revisa el color de cada caja: verde marca el eje correcto de cada situación.';
    feedbackEl.classList.toggle('is-wrong', !allCorrect);
  } else {
    const situation = round1State.activeCards[0].situation;
    const r = results[0];
    if (r.isCorrect) {
      feedbackTitle.textContent = round1State.turnType === 'boss' ? '¡Superaste al jefe final!' : '¡Correcto!';
    } else {
      feedbackTitle.textContent = r.timedOut ? '¡Se acabó el tiempo!' : `Era ${EJE_LABELS[situation.eje]}`;
    }
    feedbackText.textContent = situation.explicacion;
    feedbackEl.classList.toggle('is-wrong', !r.isCorrect);
  }
  feedbackEl.hidden = false;

  setTimeout(() => {
    if (anyGameOver) {
      showRound1GameOver();
      return;
    }
    const nextIndex = round1State.index + advanceBy;
    if (nextIndex < total) {
      round1State.index = nextIndex;
      renderCurrentTurn();
    } else {
      finishRound1();
    }
  }, round1State.turnType === 'double' ? 2500 : 2200);
}

function showRound1GameOver() {
  round1Game.hidden = true;
  if (round1GameOver) round1GameOver.hidden = false;
  SoundFX.wrong();
}

if (round1RetryBtn) {
  round1RetryBtn.addEventListener('click', () => {
    SoundFX.click();
    startRound1();
  });
}

function finishRound1() {
  clearRound1Timer();
  round1Game.hidden = true;
  round1Complete.hidden = false;
  finalScoreEl.textContent = String(round1State.correctCount);

  const isPerfect = round1State.correctCount === round1State.order.length;

  gameState.score += round1State.score;
  if (isPerfect) {
    gameState.badges += 1;
    SoundFX.perfect();
    FX.fireworks(2, { gold: true });
    FX.glowRing(document.querySelector('#round1-complete .badge-icon'));
  } else {
    FX.fireworks(2);
  }
}

// ---------- Clic directo en un eje: resuelve la primera tarjeta activa sin responder ----------
bins.forEach((bin) => {
  bin.addEventListener('click', () => {
    if (round1State.answered) return;
    const target = round1State.activeCards.find((c) => !c.answered);
    if (!target) return;
    SoundFX.click();
    resolveCard(target, bin.dataset.eje, false);
  });
});

// ---------- Arrastrar una tarjeta (pointer events: mouse + touch) ----------
// Generalizado para funcionar con 1 o 2 tarjetas activas a la vez (evento "doble").
function attachCardInteractions(cardEl, cardObj) {
  let dragState = null;

  cardEl.addEventListener('pointerdown', (event) => {
    if (cardObj.answered || round1State.answered) return;
    cardEl.classList.remove('is-returning');
    const rect = cardEl.getBoundingClientRect();
    dragState = {
      startX: event.clientX,
      startY: event.clientY,
      originCenterX: rect.left + rect.width / 2,
      originCenterY: rect.top + rect.height / 2,
    };
    cardEl.setPointerCapture(event.pointerId);
    cardEl.classList.add('is-dragging');
  });

  cardEl.addEventListener('pointermove', (event) => {
    if (!dragState || cardObj.answered || round1State.answered) return;
    let dx = event.clientX - dragState.startX;
    let dy = event.clientY - dragState.startY;

    // Buscar el bin más "atractivo" dentro del radio de imán
    let magnetTarget = null;
    let magnetStrength = 0;

    bins.forEach((bin) => {
      const r = bin.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(event.clientX - cx, event.clientY - cy);
      const over = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      bin.classList.toggle('is-drop-target', over);

      if (dist < MAGNET_RADIUS) {
        const strength = 1 - dist / MAGNET_RADIUS;
        bin.classList.add('is-magnet-target');
        if (strength > magnetStrength) {
          magnetStrength = strength;
          magnetTarget = { cx, cy };
        }
      } else {
        bin.classList.remove('is-magnet-target');
      }
    });

    if (magnetTarget) {
      const pull = 0.4 * magnetStrength;
      const targetDx = magnetTarget.cx - dragState.originCenterX;
      const targetDy = magnetTarget.cy - dragState.originCenterY;
      dx += (targetDx - dx) * pull;
      dy += (targetDy - dy) * pull;
    }

    cardEl.style.transform = `translate(${dx}px, ${dy}px) scale(${magnetTarget ? 1.05 : 1})`;
  });

  cardEl.addEventListener('pointerup', (event) => {
    if (!dragState || cardObj.answered || round1State.answered) {
      dragState = null;
      return;
    }
    cardEl.classList.remove('is-dragging');

    const dropBin = bins.find((bin) => {
      const r = bin.getBoundingClientRect();
      return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    });

    bins.forEach((bin) => bin.classList.remove('is-drop-target', 'is-magnet-target'));

    if (dropBin) {
      resolveCard(cardObj, dropBin.dataset.eje, false);
    } else {
      // No soltó sobre ningún bin: rebote elástico de vuelta a su lugar
      cardEl.classList.add('is-returning');
      cardEl.style.transform = '';
      cardEl.addEventListener('transitionend', () => {
        cardEl.classList.remove('is-returning');
      }, { once: true });
    }
    dragState = null;
  });
}

// ---------- Botón para continuar a Ronda 2 ----------
round1NextBtn.addEventListener('click', () => {
  goToScreen('screen-round2');
});

// ---------- Arrancar Ronda 1 al entrar a esa pantalla ----------
const originalGoToScreen = goToScreen;
goToScreen = function (screenId) {
  originalGoToScreen(screenId);
  if (screenId === 'screen-round1') {
    startRound1();
  }
};

// ==========================================================
// RONDA 2 — MEMORAMA TEMÁTICO
// ==========================================================

// ---------- Contenido aprobado (2 situaciones por eje) ----------
const ROUND2_SITUATIONS = [
  { eje: 'mental', text: 'Pausa activa', emoji: '🧘', explicacion: 'Es Mentalmente Saludable: las pausas activas favorecen el bienestar físico y emocional.' },
  { eje: 'mental', text: 'Empatía', emoji: '🤝', explicacion: 'Es Mentalmente Saludable: escuchar y apoyar a un compañero fortalece la convivencia.' },
  { eje: 'mental', text: 'Trabajo en equipo', emoji: '👥', explicacion: 'Es Mentalmente Saludable: colaborar fortalece el clima emocional del grupo.' },
  { eje: 'mental', text: 'Manejo del estrés', emoji: '😌', explicacion: 'Es Mentalmente Saludable: atender el estrés cuida el bienestar psicológico.' },
  { eje: 'medicina', text: 'Vacunación', emoji: '💉', explicacion: 'Es Medicina Laboral: previene enfermedades mediante una intervención médica.' },
  { eje: 'medicina', text: 'Hidratación', emoji: '💧', explicacion: 'Es Medicina Laboral: mantenerse hidratado favorece la salud durante la jornada.' },
  { eje: 'medicina', text: 'Enfermería', emoji: '🩺', explicacion: 'Es Medicina Laboral: la atención de un malestar corresponde al cuidado de la salud.' },
  { eje: 'higiene', text: 'Casco', emoji: '⛑️', explicacion: 'Es Higiene y Seguridad Industrial: los elementos de protección previenen accidentes.' },
  { eje: 'higiene', text: 'Ruta de evacuación', emoji: '🚪', explicacion: 'Es Higiene y Seguridad Industrial: mantener las rutas despejadas permite evacuar con seguridad.' },
  { eje: 'higiene', text: 'Señalización', emoji: '⚠️', explicacion: 'Es Higiene y Seguridad Industrial: señalizar un riesgo ayuda a prevenir accidentes.' },
];

// (Los íconos de eje ahora se representan con emoji, ver EJE_EMOJI)

// ---------- Elementos de Protección Personal (EPP) — variedad extra para el memorama ----------
// Fase 5: cada EPP usa una foto real (PNG recortado) en vez de emoji.
// Assets propios del módulo (autocontenido), copiados desde assets/images/epps/.
const EPP_ASSET_BASE = 'assets/images/epps';

const EPP_ITEMS = [
  {
    id: 'casco', nombre: 'Casco de seguridad',
    explicacion: 'El casco protege la cabeza de golpes e impactos en el taller.',
    img: `${EPP_ASSET_BASE}/maquinaria/casco.png`
  },
  {
    id: 'gafas', nombre: 'Gafas de seguridad',
    explicacion: 'Las gafas protegen los ojos de partículas, chispas o químicos.',
    img: `${EPP_ASSET_BASE}/ganaderia/gafas.png`
  },
  {
    id: 'gafas_laboratorio', nombre: 'Gafas de laboratorio',
    explicacion: 'Protegen los ojos de salpicaduras químicas en entornos de laboratorio.',
    img: `${EPP_ASSET_BASE}/variados/gafas_laboratorio.png`
  },
  {
    id: 'guantes', nombre: 'Guantes de protección',
    explicacion: 'Los guantes protegen las manos al manipular herramientas o materiales.',
    img: `${EPP_ASSET_BASE}/ganaderia/guantes.png`
  },
  {
    id: 'guantes_soldador', nombre: 'Guantes de soldador',
    explicacion: 'Guantes de carnaza largos que protegen manos y antebrazos del calor y las chispas.',
    img: `${EPP_ASSET_BASE}/soldadura/guantes.png`
  },
  {
    id: 'guantes_nitrilo', nombre: 'Guantes de nitrilo',
    explicacion: 'Guantes finos e impermeables, ideales para manipular alimentos sin contaminarlos.',
    img: `${EPP_ASSET_BASE}/cocina/guantes_nitrilo.png`
  },
  {
    id: 'guantes_caucho', nombre: 'Guantes de caucho',
    explicacion: 'Impermeables y resistentes a químicos suaves; muy usados en limpieza y labores húmedas.',
    img: `${EPP_ASSET_BASE}/variados/guantes_caucho.png`
  },
  {
    id: 'tapones', nombre: 'Protección auditiva',
    explicacion: 'Reduce el daño por exposición a ruido excesivo en máquinas.',
    img: `${EPP_ASSET_BASE}/soldadura/proteccion_auditiva.png`
  },
  {
    id: 'chaleco', nombre: 'Chaleco reflectivo',
    explicacion: 'Aumenta la visibilidad de la persona en zonas de riesgo o tránsito.',
    img: `${EPP_ASSET_BASE}/maquinaria/chaleco.png`
  },
  {
    id: 'chaleco_pescador', nombre: 'Chaleco de pescador',
    explicacion: 'Chaleco con bolsillos para faenas al aire libre; no reemplaza el chaleco reflectivo en zonas de riesgo.',
    img: `${EPP_ASSET_BASE}/variados/chaleco_pescador.png`
  },
  {
    id: 'chaleco_brigadista', nombre: 'Chaleco de brigadista',
    explicacion: 'Identifica a personal de emergencias o brigadas; no es un EPP reflectivo estándar de planta.',
    img: `${EPP_ASSET_BASE}/variados/chaleco_brigadista.png`
  },
  {
    id: 'tapabocas', nombre: 'Protección respiratoria',
    explicacion: 'Filtra el polvo, vapores u otros agentes suspendidos en el aire.',
    img: `${EPP_ASSET_BASE}/cocina/tapabocas.png`
  },
  {
    id: 'mascara_antigases', nombre: 'Máscara antigases',
    explicacion: 'Filtra gases y vapores químicos específicos; se usa según el riesgo, no en cualquier labor.',
    img: `${EPP_ASSET_BASE}/variados/mascara_antigases.png`
  },
  {
    id: 'careta_soldadura', nombre: 'Careta de soldadura',
    explicacion: 'Protege todo el rostro de chispas, luz ultravioleta y calor al soldar.',
    img: `${EPP_ASSET_BASE}/soldadura/careta.png`
  },
  {
    id: 'delantal_cuero', nombre: 'Delantal de cuero',
    explicacion: 'Protege el torso y las piernas frente a salpicaduras, calor o cortes.',
    img: `${EPP_ASSET_BASE}/soldadura/delantal.png`
  },
  {
    id: 'delantal_cocina', nombre: 'Delantal de cocina',
    explicacion: 'Delantal limpio y liviano que protege la ropa y evita contaminación cruzada con los alimentos.',
    img: `${EPP_ASSET_BASE}/cocina/delantal.png`
  },
  {
    id: 'bata_blanca', nombre: 'Bata blanca',
    explicacion: 'Común en laboratorios o áreas clínicas; protege la ropa de salpicaduras leves.',
    img: `${EPP_ASSET_BASE}/variados/bata_blanca.png`
  },
  {
    id: 'impermeable', nombre: 'Impermeable',
    explicacion: 'Protege del agua y la lluvia, útil en labores a la intemperie, pero no protege de golpes ni químicos.',
    img: `${EPP_ASSET_BASE}/variados/impermeable.png`
  },
  {
    id: 'pantalon_dril', nombre: 'Pantalón de dril',
    explicacion: 'Tela resistente que protege las piernas de raspaduras y pequeños cortes.',
    img: `${EPP_ASSET_BASE}/soldadura/pantalon.png`
  },
  {
    id: 'botas_seguridad', nombre: 'Botas de seguridad',
    explicacion: 'Protegen los pies de golpes, objetos punzantes o superficies resbalosas.',
    img: `${EPP_ASSET_BASE}/ganaderia/botas.png`
  },
  {
    id: 'botas_caucho', nombre: 'Botas de caucho',
    explicacion: 'Impermeables, ideales para zonas húmedas o con barro, pero no reemplazan la puntera de seguridad.',
    img: `${EPP_ASSET_BASE}/variados/botas_caucho.png`
  },
  {
    id: 'zapato_cerrado', nombre: 'Zapato cerrado',
    explicacion: 'Calzado cerrado y antideslizante, ideal para cocinas: protege de caídas y derrames calientes.',
    img: `${EPP_ASSET_BASE}/cocina/zapato.png`
  },
  {
    id: 'gorro', nombre: 'Gorro',
    explicacion: 'Cubre el cabello para evitar que caiga en los alimentos o se enrede con máquinas.',
    img: `${EPP_ASSET_BASE}/cocina/gorro.png`
  },
  {
    id: 'gorra', nombre: 'Gorra',
    explicacion: 'Protege la cabeza del sol en trabajos al aire libre como la ganadería.',
    img: `${EPP_ASSET_BASE}/ganaderia/gorra.png`
  },
];

// ---------- Configuración del memorama ----------
const ROUND2_EPP_PAIRS = 3; // cuántas parejas de EPP se agregan además de las de eje
// (Fase 5: el catálogo de EPP pasó de 16 items con iconos repetidos a 22 fotos reales
// distintas, por lo que se sube de 2 a 3 parejas para aprovechar la variedad sin
// alargar demasiado la partida — el tiempo de vista previa ya escala solo con totalPairs.)
const ROUND2_LIVES = 7;
const ROUND2_PREVIEW_MIN = 4;
const ROUND2_PREVIEW_MAX = 8;

const round2State = {
  cards: [],
  flipped: [],
  pairsFound: 0,
  locked: false,
  attempts: 0,
  totalPairs: 0,
  streak: 0,
  lives: ROUND2_LIVES,
  previewTimerId: null,
};

const memoGrid = document.getElementById('memo-grid');
const round2Game = document.getElementById('round2-game');
const round2Complete = document.getElementById('round2-complete');
const round2GameOver = document.getElementById('round2-gameover');
const round2PairsFound = document.getElementById('round2-pairs-found');
const round2PairsTotal = document.getElementById('round2-pairs-total');
const round2Feedback = document.getElementById('round2-feedback');
const round2FeedbackTitle = document.getElementById('round2-feedback-title');
const round2FeedbackText = document.getElementById('round2-feedback-text');
const round2NextBtn = document.getElementById('round2-next-btn');
const round2PreviewBanner = document.getElementById('round2-preview-banner');
const round2PreviewCount = document.getElementById('round2-preview-count');
const round2LivesEls = Array.from(document.querySelectorAll('#round2-lives .life-heart'));

function buildRound2Deck() {
  const situacionesElegidas = pickBalancedByEje(ROUND2_SITUATIONS, ROUND2_PAIRS_PER_EJE);
  const eppElegidos = shuffle(EPP_ITEMS).slice(0, ROUND2_EPP_PAIRS);

  const deck = [];

  // Ahora cada pareja son 2 cartas IDÉNTICAS (memorama clásico): se
  // memoriza dónde está cada una y se busca su gemela, en vez de
  // emparejar una descripción con un ícono distinto.
  situacionesElegidas.forEach((s, i) => {
    const pairId = `classify-${i}`;
    const base = { pairId, kind: 'classify', eje: s.eje, text: s.text, explicacion: s.explicacion };
    deck.push({ ...base, uid: `${pairId}-a` });
    deck.push({ ...base, uid: `${pairId}-b` });
  });

  eppElegidos.forEach((item) => {
    const pairId = `epp-${item.id}`;
    const base = { pairId, kind: 'epp', item };
    deck.push({ ...base, uid: `${pairId}-a` });
    deck.push({ ...base, uid: `${pairId}-b` });
  });

  round2State.totalPairs = situacionesElegidas.length + eppElegidos.length;
  return shuffle(deck);
}

function renderMemoCard(card) {
  const btn = document.createElement('button');
  btn.className = 'memo-card';
  btn.type = 'button';
  btn.dataset.uid = card.uid;

  let frontInner;
  if (card.kind === 'classify') {
    // Logo real del eje (no emoji) sobre la carta
    frontInner = `<img class="memo-card__eje-logo" src="assets/images/eje-${card.eje}.png" alt="${EJE_LABELS[card.eje]}" loading="lazy"><span class="memo-card__text">${card.text}</span>`;
  } else {
    frontInner = `<img class="memo-card__epp-img" src="${card.item.img}" alt="${card.item.nombre}" loading="lazy"><span class="memo-card__text">${card.item.nombre}</span>`;
  }

  btn.innerHTML = `
    <span class="memo-card__inner">
      <span class="memo-card__face memo-card__face--back"></span>
      <span class="memo-card__face memo-card__face--front">${frontInner}</span>
    </span>
  `;

  btn.addEventListener('click', () => handleMemoCardClick(card, btn));
  FX.addRipple(btn, { clip: false });
  return btn;
}

function renderRound2Lives(losingIndex = null) {
  round2LivesEls.forEach((el, i) => {
    const alive = i < round2State.lives;
    el.classList.toggle('is-lost', !alive);
    el.classList.remove('is-losing');
    if (losingIndex !== null && i === losingIndex) {
      void el.offsetWidth;
      el.classList.add('is-losing');
    }
  });
}

function loseLifeRound2() {
  const losingIndex = round2State.lives - 1;
  round2State.lives = Math.max(0, round2State.lives - 1);
  renderRound2Lives(losingIndex);
  return round2State.lives <= 0;
}

function clearRound2Preview() {
  if (round2State.previewTimerId) {
    clearInterval(round2State.previewTimerId);
    round2State.previewTimerId = null;
  }
  if (round2PreviewBanner) round2PreviewBanner.hidden = true;
}

// ---------- Fase de memorización: se muestran todas las cartas unos segundos ----------
function startRound2Preview() {
  const previewSeconds = Math.min(
    ROUND2_PREVIEW_MAX,
    Math.max(ROUND2_PREVIEW_MIN, 3 + Math.floor(round2State.totalPairs / 2))
  );
  let secondsLeft = previewSeconds;

  const cardEls = Array.from(memoGrid.children);
  cardEls.forEach((el) => el.classList.add('is-flipped'));

  if (round2PreviewBanner && round2PreviewCount) {
    round2PreviewBanner.hidden = false;
    round2PreviewCount.textContent = String(secondsLeft);
  }

  round2State.previewTimerId = setInterval(() => {
    secondsLeft -= 1;
    if (round2PreviewCount) round2PreviewCount.textContent = String(Math.max(secondsLeft, 0));
    if (secondsLeft <= 1) SoundFX.tick();

    if (secondsLeft <= 0) {
      clearInterval(round2State.previewTimerId);
      round2State.previewTimerId = null;
      cardEls.forEach((el) => el.classList.remove('is-flipped'));
      if (round2PreviewBanner) round2PreviewBanner.hidden = true;
      round2State.locked = false;
      SoundFX.click();
    }
  }, 1000);
}

function startRound2() {
  clearRound2Preview();
  round2State.cards = buildRound2Deck();
  round2State.flipped = [];
  round2State.pairsFound = 0;
  round2State.locked = true; // bloqueado durante la fase de memorización
  round2State.attempts = 0;
  round2State.streak = 0;
  round2State.lives = ROUND2_LIVES;

  round2Game.hidden = false;
  round2Complete.hidden = true;
  if (round2GameOver) round2GameOver.hidden = true;
  round2Feedback.hidden = true;
  round2PairsFound.textContent = '0';
  round2PairsTotal.textContent = String(round2State.totalPairs);
  renderRound2Lives();

  memoGrid.innerHTML = '';
  round2State.cards.forEach((card, i) => {
    const cardEl = renderMemoCard(card);
    cardEl.classList.add('fx-deal-in');
    cardEl.style.setProperty('--fx-deal-delay', `${i * 55}ms`);
    memoGrid.appendChild(cardEl);
  });

  startRound2Preview();
}

function handleMemoCardClick(card, btn) {
  if (round2State.locked) return;
  if (btn.classList.contains('is-flipped') || btn.classList.contains('is-matched')) return;
  if (round2State.flipped.length === 2) return;

  btn.classList.add('is-flipped');
  round2State.flipped.push({ card, btn });
  SoundFX.flip();

  if (round2State.flipped.length === 2) {
    round2State.locked = true;
    round2State.attempts += 1;
    const [a, b] = round2State.flipped;
    const isMatch = a.card.pairId === b.card.pairId;

    if (isMatch) {
      const textCard = a.card;
      const prevPairs = round2State.pairsFound;
      round2State.pairsFound += 1;
      round2State.streak += 1;
      FX.countUp(round2PairsFound, prevPairs, round2State.pairsFound, 350);

      const label = textCard.kind === 'classify' ? EJE_LABELS[textCard.eje] : textCard.item.nombre;
      const explicacion = textCard.kind === 'classify' ? textCard.explicacion : textCard.item.explicacion;

      round2FeedbackTitle.textContent = `¡Pareja correcta! · ${label}`;
      round2FeedbackText.textContent = explicacion;
      round2Feedback.classList.remove('is-wrong');
      round2Feedback.hidden = false;
      SoundFX.correct();
      FX.badge(b.btn, 'correct');
      FX.confetti(a.btn);

      if (round2State.streak >= 3 && round2State.streak % 3 === 0) {
        SoundFX.streak();
        FX.streakBurst(b.btn, round2State.streak);
      }

      setTimeout(() => {
        a.btn.classList.add('is-matched');
        b.btn.classList.add('is-matched');
        a.btn.disabled = true;
        b.btn.disabled = true;
        round2State.flipped = [];
        round2State.locked = false;

        if (round2State.pairsFound === round2State.totalPairs) {
          setTimeout(finishRound2, 700);
        }
      }, 1400);
    } else {
      round2State.streak = 0;
      a.btn.classList.add('is-wrong-flash');
      b.btn.classList.add('is-wrong-flash');
      SoundFX.wrong();
      FX.shake(a.btn);
      FX.shake(b.btn);
      FX.badge(b.btn, 'wrong');
      const ranOutOfLives = loseLifeRound2();

      setTimeout(() => {
        a.btn.classList.remove('is-flipped', 'is-wrong-flash');
        b.btn.classList.remove('is-flipped', 'is-wrong-flash');
        round2State.flipped = [];
        round2State.locked = false;

        if (ranOutOfLives) {
          triggerRound2GameOver();
        }
      }, 900);
    }
  }
}

function triggerRound2GameOver() {
  clearRound2Preview();
  round2Game.hidden = true;
  if (round2GameOver) round2GameOver.hidden = false;
  SoundFX.wrong();

  setTimeout(() => {
    startPenaltyWheel();
  }, 1600);
}

function finishRound2() {
  round2Game.hidden = true;
  round2Complete.hidden = false;
  gameState.badges += 1;

  const isPerfect = round2State.attempts === round2State.totalPairs;
  if (isPerfect) {
    SoundFX.perfect();
    FX.fireworks(2, { gold: true });
    FX.glowRing(document.querySelector('#round2-complete .badge-icon'));
  } else {
    SoundFX.badge();
    FX.fireworks(2);
  }
}

round2NextBtn.addEventListener('click', () => {
  goToScreen('screen-round3');
});

// ---------- Extender el arranque automático por pantalla ----------
const previousGoToScreen = goToScreen;
goToScreen = function (screenId) {
  previousGoToScreen(screenId);
  if (screenId === 'screen-round2') {
    startRound2();
  }
};

// ==========================================================
// RONDA 3 — RULETA CON PENITENCIA
// ==========================================================

// ---------- Banco de preguntas de zona premio (CONTENIDO APROBADO) ----------
const ROUND3_QUESTIONS = [
  {
    question:'Un funcionario participa en una charla sobre manejo del estrés. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:0,
    explicacion:'El manejo del estrés fortalece el bienestar emocional.'
  },
  {
    question:'Se realiza una jornada de vacunación en el SENA. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:1,
    explicacion:'La vacunación ayuda a prevenir enfermedades.'
  },
  {
    question:'Antes de ingresar al taller todos usan casco y gafas de seguridad. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:2,
    explicacion:'Los elementos de protección previenen accidentes.'
  },
  {
    question:'Un funcionario acude a enfermería porque presenta un malestar. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:1,
    explicacion:'La atención en salud corresponde a Medicina Laboral.'
  },
  {
    question:'El grupo resuelve un conflicto mediante el diálogo. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:0,
    explicacion:'La convivencia y el respeto fortalecen la salud mental.'
  },
  {
    question:'Se señaliza un piso mojado para evitar caídas. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:2,
    explicacion:'La señalización ayuda a prevenir accidentes.'
  },
  {
    question:'Los funcionarios reciben recomendaciones para mantenerse hidratados. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:1,
    explicacion:'La hidratación favorece la salud.'
  },
  {
    question:'Se realiza una pausa activa durante la jornada. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:0,
    explicacion:'Las pausas activas favorecen el bienestar.'
  },
  {
    question:'Las rutas de evacuación se mantienen libres de obstáculos. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:2,
    explicacion:'Las rutas despejadas permiten una evacuación segura.'
  },
  {
    question:'El área de Talento Humano realiza una actividad sobre trabajo en equipo. ¿A qué eje pertenece?',
    options:['Mentalmente Saludable','Medicina Laboral','Higiene y Seguridad Industrial'],
    correctIndex:0,
    explicacion:'El trabajo en equipo fortalece la convivencia.'
  }
];

// ---------- Banco de retos de penitencia ----------
const ROUND3_CHALLENGES = [
  'Realiza 3 pausas activas sencillas con tu equipo.',
  'Menciona en voz alta los tres ejes del SG-SST.',
  'Imita el uso correcto de un casco de seguridad.',
  'Representa cómo reportarías un riesgo en el SENA.',
  'Haz un saludo creativo relacionado con la seguridad.',
  'Encuentra una señal de seguridad cerca de ti.',
  'Haz equilibrio en un pie durante 10 segundos.',
  'Di una acción que ayude a cuidar la salud mental de un compañero.',
  'Explica por qué es importante hidratarse durante la jornada.',
  'Menciona un elemento de protección personal.'
];

// ---------- Retos de la Ruleta de Castigo (más exigentes, siempre pedagógicos) ----------
// Se usa cuando se pierden las vidas del memorama en la Ronda 2.
const PENALTY_CHALLENGES = [
  'Explica en voz alta los 3 ejes del SG-SST y da un ejemplo real de cada uno.',
  'Enséñale a un compañero cómo se coloca correctamente un casco de seguridad.',
  'Da una mini-charla de 30 segundos sobre por qué usar los EPP salva vidas.',
  'Nombra 5 elementos de protección personal sin repetir ninguno.',
  'Explica paso a paso cómo reportarías un riesgo eléctrico en el SENA.',
  'Haz 5 pausas activas completas guiando a tu equipo.',
  'Describe qué harías si ves a alguien sin casco en una zona de riesgo.',
  'Explica la diferencia entre Medicina Laboral e Higiene y Seguridad Industrial con un ejemplo cada una.',
];

const WHEEL_SLICES = ['premio', 'penitencia', 'premio', 'penitencia', 'premio', 'penitencia'];
const WHEEL_COLORS = ['#39A900', '#FFB800', '#2D7A00', '#FFB800', '#39A900', '#FFB800'];

const WHEEL_SLICES_PENALTY = ['penitencia', 'penitencia', 'penitencia', 'penitencia', 'penitencia', 'penitencia'];
const WHEEL_COLORS_PENALTY = ['#E2574C', '#C9432F', '#E2574C', '#C9432F', '#E2574C', '#C9432F'];

let wheelRotation = 0;

const round3State = {
  zone: null,       // 'premio' | 'penitencia'
  correct: null,    // true/false si fue premio, null si fue penitencia
  mode: 'normal',   // 'normal' | 'penalty' (ruleta de castigo tras perder vidas en Ronda 2)
};

function getWheelSlices() {
  return round3State.mode === 'penalty' ? WHEEL_SLICES_PENALTY : WHEEL_SLICES;
}

function getWheelColors() {
  return round3State.mode === 'penalty' ? WHEEL_COLORS_PENALTY : WHEEL_COLORS;
}

function buildWheelSVG() {
  const svg = document.getElementById('wheel');
  const slices = getWheelSlices();
  const colors = getWheelColors();
  const cx = 150, cy = 150, r = 148;
  const sliceAngle = 360 / slices.length;
  let html = '';

  slices.forEach((zone, i) => {
    const startAngle = i * sliceAngle - 90;
    const endAngle = startAngle + sliceAngle;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    const midAngle = (startAngle + endAngle) / 2;
    const labelX = cx + (r * 0.62) * Math.cos((midAngle * Math.PI) / 180);
    const labelY = cy + (r * 0.62) * Math.sin((midAngle * Math.PI) / 180);
    const label = zone === 'premio' ? 'PREMIO' : (round3State.mode === 'penalty' ? 'CASTIGO' : 'PENITENCIA');

    html += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="${colors[i]}" stroke="#ffffff" stroke-width="2"/>`;
    html += `<text x="${labelX}" y="${labelY}" fill="#ffffff" font-family="Baloo 2, sans-serif" font-weight="700" font-size="12" text-anchor="middle" transform="rotate(${midAngle + 90}, ${labelX}, ${labelY})">${label}</text>`;
  });

  svg.innerHTML = html;
}

function startRound3() {
  const titleEl = document.getElementById('round3-title');
  const instructionsEl = document.getElementById('round3-instructions');
  const spinBtnEl = document.getElementById('spin-btn');

  if (round3State.mode === 'penalty') {
    if (titleEl) titleEl.textContent = 'Ruleta de Castigo';
    if (instructionsEl) instructionsEl.textContent = 'Perdiste tus vidas en el memorama. Gira y cumple el reto que te toque para volver a intentarlo.';
    if (spinBtnEl) spinBtnEl.textContent = 'Girar ruleta de castigo';
  } else {
    if (titleEl) titleEl.textContent = 'Ruleta Zona Segura';
    if (instructionsEl) instructionsEl.textContent = 'Gira la ruleta: si cae en premio, respondes una pregunta rápida. Si cae en penitencia, cumples un reto en vivo.';
    if (spinBtnEl) spinBtnEl.textContent = 'Girar la ruleta';
  }

  document.getElementById('round3-game').hidden = false;
  document.getElementById('round3-complete').hidden = true;
  document.getElementById('round3-result').hidden = true;
  document.getElementById('round3-premio-panel').hidden = true;
  document.getElementById('round3-penitencia-panel').hidden = true;
  document.getElementById('round3-feedback').hidden = true;
  document.getElementById('spin-btn').disabled = false;
  wheelRotation = 0;
  document.getElementById('wheel').style.transform = 'rotate(0deg)';
  round3State.zone = null;
  round3State.correct = null;
  buildWheelSVG();
}

document.getElementById('spin-btn').addEventListener('click', () => {
  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;
  SoundFX.spin();

  const slices = getWheelSlices();
  const sliceAngle = 360 / slices.length;
  const landedIndex = Math.floor(Math.random() * slices.length);
  const extraSpins = 5 * 360;
  const targetCenter = landedIndex * sliceAngle + sliceAngle / 2;
  const finalRotation = extraSpins + (360 - targetCenter);

  wheelRotation += finalRotation;
  const wheel = document.getElementById('wheel');
  wheel.style.transform = `rotate(${wheelRotation}deg)`;

  // ---------- Ticks sincronizados con la desaceleración real ----------
  // La ruleta gira con transition cubic-bezier(0.15, 0.65, 0.15, 1) durante 3.6s
  // (ver .wheel en css/styles.css). Aproximamos esa curva con un ease-out cúbico
  // para calcular en qué momento se cruza cada límite de sector y sonar un tick
  // ahí — rápido al inicio, cada vez más espaciado al final, como una ruleta real.
  const WHEEL_SPIN_DURATION_MS = 3600;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const totalCrossings = Math.floor(finalRotation / sliceAngle);

  for (let i = 1; i <= totalCrossings; i += 1) {
    const progressNeeded = i / totalCrossings;
    const t = 1 - Math.pow(1 - progressNeeded, 1 / 3); // inversa de easeOutCubic
    const delay = t * WHEEL_SPIN_DURATION_MS;
    setTimeout(() => SoundFX.tick(), delay);
  }

  setTimeout(() => {
    showRound3Result(slices[landedIndex]);
  }, 3700);
});

function showRound3Result(zone) {
  document.getElementById('round3-result').hidden = false;
  document.getElementById('round3-feedback').hidden = true;
  round3State.zone = zone;

  // Confeti disparado desde la puntita de la ruleta, justo donde se detuvo
  FX.confetti(document.querySelector('.wheel-pointer'), zone === 'premio' ? 40 : 26);

  if (zone === 'premio') {
    showPremioQuestion();
  } else {
    showPenitenciaChallenge();
  }
}

function showPremioQuestion() {
  const panel = document.getElementById('round3-premio-panel');
  document.getElementById('round3-penitencia-panel').hidden = true;
  panel.hidden = false;

  const q = ROUND3_QUESTIONS[Math.floor(Math.random() * ROUND3_QUESTIONS.length)];
  document.getElementById('premio-question').textContent = q.question;

  const optionsWrap = document.getElementById('premio-options');
  optionsWrap.innerHTML = '';

  q.options.forEach((optionText, i) => {
    const optBtn = document.createElement('button');
    optBtn.className = 'round3-option';
    optBtn.type = 'button';
    optBtn.textContent = optionText;
    optBtn.addEventListener('click', () => {
      Array.from(optionsWrap.children).forEach((btn) => { btn.disabled = true; });

      const feedback = document.getElementById('round3-feedback');
      const feedbackTitle = document.getElementById('round3-feedback-title');
      const feedbackText = document.getElementById('round3-feedback-text');

      if (i === q.correctIndex) {
        optBtn.classList.add('is-correct');
        gameState.score += 15;
        gameState.badges += 1;
        round3State.correct = true;
        feedback.classList.remove('is-wrong');
        feedbackTitle.textContent = '¡Correcto! +15 pts';
        SoundFX.correct();
        FX.badge(optBtn, 'correct');
        FX.confetti(optBtn);
        FX.toast(optBtn, '+15 pts', 'points');
      } else {
        optBtn.classList.add('is-wrong');
        optionsWrap.children[q.correctIndex].classList.add('is-correct');
        round3State.correct = false;
        feedback.classList.add('is-wrong');
        feedbackTitle.textContent = 'Casi';
        SoundFX.wrong();
        FX.shake(optBtn);
        FX.badge(optBtn, 'wrong');
      }

      feedbackText.textContent = q.explicacion;
      feedback.hidden = false;

      setTimeout(finishRound3, 2400);
    });
    optionsWrap.appendChild(optBtn);
    FX.addRipple(optBtn);
  });
}

function showPenitenciaChallenge() {
  document.getElementById('round3-premio-panel').hidden = true;
  const panel = document.getElementById('round3-penitencia-panel');
  panel.hidden = false;

  const isPenalty = round3State.mode === 'penalty';
  const pool = isPenalty ? PENALTY_CHALLENGES : ROUND3_CHALLENGES;
  const challenge = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById('penitencia-text').textContent = challenge;

  const timerEl = document.getElementById('penitencia-timer');
  let seconds = isPenalty ? 20 : 15;
  timerEl.textContent = String(seconds);

  const doneBtn = document.getElementById('penitencia-done-btn');
  doneBtn.disabled = false;

  const interval = setInterval(() => {
    seconds -= 1;
    timerEl.textContent = String(Math.max(seconds, 0));
    if (seconds <= 0) clearInterval(interval);
  }, 1000);

  doneBtn.onclick = () => {
    clearInterval(interval);
    doneBtn.disabled = true;
    gameState.badges += 1;
    SoundFX.badge();
    const feedback = document.getElementById('round3-feedback');
    feedback.classList.remove('is-wrong');
    document.getElementById('round3-feedback-title').textContent = '¡Reto cumplido!';
    document.getElementById('round3-feedback-text').textContent = isPenalty
      ? '¡Bien hecho! Ahora vuelves al memorama con cartas nuevas.'
      : 'Ganaste una insignia por participar en vivo.';
    feedback.hidden = false;
    setTimeout(() => {
      if (isPenalty) {
        finishPenaltyWheel();
      } else {
        finishRound3();
      }
    }, isPenalty ? 2000 : 1800);
  };
}

function finishRound3() {
  document.getElementById('round3-game').hidden = true;
  document.getElementById('round3-complete').hidden = false;
  FX.fireworks(2);
}

// ---------- Ruleta de Castigo: se activa al perder las vidas del memorama ----------
function startPenaltyWheel() {
  round3State.mode = 'penalty';
  goToScreen('screen-round3');
  startRound3();
}

function finishPenaltyWheel() {
  round3State.mode = 'normal';
  goToScreen('screen-round2');
  startRound2();
}

document.getElementById('round3-next-btn').addEventListener('click', () => {
  // (Ronda 4 se juega en el módulo aparte games/epp.html)
  goToScreen('screen-final');
});

// ==========================================================
// (Ronda 4 — "Viste a tu Compañero" se movió a un módulo
// independiente: games/epp.html + epp.js + epp.css.
// EPP_ITEMS sigue aquí porque el memorama (ronda 2) lo usa.)
// ==========================================================

// Stub: la pantalla final del SENA aún consulta estos campos para mostrar
// el desglose de la ronda 4. Como la ronda se juega aparte, quedan en 0.
const round4State = { score: 0, correctPicks: 0, wrongPicks: 0 };

// ==========================================================
// PANTALLA DE CIERRE GENERAL
// ==========================================================

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function showFinalScreen() {
  const totalSituations = round1State.order.length;
  const totalPairs = round2State.totalPairs;

  // ---------- Precisión general ----------
  // Preguntas "de acierto/error" reales: ronda 1 (8) + pregunta de ronda 3 si tocó premio
  // + cada elección de EPP en la ronda 4.
  let totalPreguntas = totalSituations;
  let totalAciertos = round1State.correctCount;
  if (round3State.zone === 'premio') {
    totalPreguntas += 1;
    if (round3State.correct) totalAciertos += 1;
  }
  totalPreguntas += round4State.correctPicks + round4State.wrongPicks;
  totalAciertos += round4State.correctPicks;
  // (round4State siempre queda en 0 porque la ronda 4 se juega aparte.)
  const accuracyPct = totalPreguntas > 0 ? Math.round((totalAciertos / totalPreguntas) * 100) : 0;

  // ---------- Tiempo total ----------
  const elapsedMs = gameState.startTime ? Date.now() - gameState.startTime : 0;

  // ---------- Encabezado y tarjetas principales ----------
  document.getElementById('final-thanks').textContent = `¡Gracias, ${state.playerName || 'funcionario'}!`;
  FX.countUp(document.getElementById('final-total-score'), 0, gameState.score, 900);
  document.getElementById('final-badges').textContent = String(gameState.badges);
  document.getElementById('final-accuracy').textContent = `${accuracyPct}%`;
  document.getElementById('final-time').textContent = formatDuration(elapsedMs);

  // ---------- Desglose Ronda 1 ----------
  document.getElementById('final-round1-detail').textContent =
    `${round1State.correctCount} de ${totalSituations} aciertos`;
  document.getElementById('final-round1-pts').textContent = `${round1State.score} pts`;

  // ---------- Desglose Ronda 2 ----------
  document.getElementById('final-round2-detail').textContent =
    `${totalPairs} de ${totalPairs} parejas · ${round2State.attempts} intentos`;
  document.getElementById('final-round2-pts').textContent = 'Completado';

  // ---------- Desglose Ronda 3 ----------
  const round3DetailEl = document.getElementById('final-round3-detail');
  const round3PtsEl = document.getElementById('final-round3-pts');
  if (round3State.zone === 'premio') {
    round3DetailEl.textContent = round3State.correct ? 'Zona premio · respuesta correcta' : 'Zona premio · respuesta incorrecta';
    round3PtsEl.textContent = round3State.correct ? '+15 pts' : '0 pts';
  } else if (round3State.zone === 'penitencia') {
    round3DetailEl.textContent = 'Zona penitencia · reto cumplido';
    round3PtsEl.textContent = '+1 insignia';
  } else {
    round3DetailEl.textContent = 'Ronda no jugada';
    round3PtsEl.textContent = '0 pts';
  }

  // ---------- Desglose Ronda 4 (módulo independiente) ----------
  // Como la ronda 4 se juega en games/epp.html, este renglón
  // aparece siempre con un mensaje neutro, no con puntaje real.
  const finalRound4Detail = document.getElementById('final-round4-detail');
  const finalRound4Pts = document.getElementById('final-round4-pts');
  if (finalRound4Detail) finalRound4Detail.textContent = 'Se juega en un módulo aparte';
  if (finalRound4Pts) finalRound4Pts.textContent = '—';

  // ---------- Guardar el resultado en localStorage ----------
  const record = {
    name: state.playerName || 'Funcionario',
    role: state.playerRole || DEFAULT_ROLE,
    score: gameState.score,
    badges: gameState.badges,
    accuracy: accuracyPct,
    durationMs: elapsedMs,
    date: new Date().toISOString(),
  };
  const historial = saveResultToHistorial(record);

  // ---------- Registrar en el puntaje global del recorrido ----------
  if (window.GlobalScore) GlobalScore.record('sena', gameState.score);

  // ---------- Mostrar mejores puntajes ----------
  renderLeaderboard(historial, record);

  // ---------- Gran cierre ----------
  if (accuracyPct === 100) {
    SoundFX.perfect();
    FX.fireworks(4, { gold: true });
    setTimeout(() => FX.glowRing(document.querySelector('.final-screen__badge')), 400);
  } else {
    FX.fireworks(4);
  }
}

function renderLeaderboard(historial, currentRecord) {
  const listEl = document.getElementById('final-leaderboard-list');
  const metaEl = document.getElementById('final-leaderboard-meta');
  if (!listEl || !metaEl) return;

  const top5 = historial
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  listEl.innerHTML = '';
  top5.forEach((entry, i) => {
    const li = document.createElement('li');
    const isCurrent = entry === currentRecord;
    li.className = `final-leaderboard__item${isCurrent ? ' final-leaderboard__item--current' : ''}`;
    li.innerHTML = `
      <span class="final-leaderboard__rank">${i + 1}</span>
      <span class="final-leaderboard__name">${entry.name}</span>
      <span class="final-leaderboard__score">${entry.score} pts</span>
    `;
    listEl.appendChild(li);
  });

  const plural = historial.length === 1 ? 'participante ha jugado' : 'participantes han jugado';
  metaEl.textContent = `${historial.length} ${plural} en este equipo`;
}

document.getElementById('restart-btn').addEventListener('click', () => {
  if (window.GlobalScore) GlobalScore.reset();
  gameState.score = 0;
  gameState.badges = 0;
  gameState.level = 0;
  gameState.startTime = Date.now();
  goToScreen('screen-round1');
});

// ---------- Extender el arranque automático por pantalla ----------
const goToScreenWithRounds = goToScreen;
goToScreen = function (screenId) {
  goToScreenWithRounds(screenId);
  if (screenId === 'screen-round3') {
    startRound3();
  }
  if (screenId === 'screen-final') {
    showFinalScreen();
  }
};

// ---------- Efecto ripple en todos los botones estáticos ----------
document.querySelectorAll('.btn, .bin').forEach((el) => FX.addRipple(el));

// ---------- Arranque directo en la ronda 1 ----------
// El nombre y la función del participante ya llegan resueltos desde
// PlayerIdentity (capturados una sola vez en introduccion.html), así
// que este módulo ya no tiene pantalla de bienvenida propia: entra
// directo a la primera ronda. Si faltara la identidad, ya se disparó
// la redirección más arriba, así que no arrancamos nada aquí.
if (hasCompletePlayerIdentity) {
  SoundFX.start();
  BgMusic.tryStart();
  goToScreen('screen-round1');
}
