/* ============================================
   RESPIRACIÓN GUIADA - Motor de juego
   State machine + animación del círculo + puntuación
   ============================================ */

(function () {
  'use strict';

  const { PATTERNS, SCORING, getMotivationalMessage, calcCalmPercent } = window.RespiracionData;
  const pattern = PATTERNS.BOX_4_4_6_2;

  /* ============================================
     Estado global
     ============================================ */
  const state = {
    phase: 'idle',           // idle | exercising | paused | complete
    currentCycle: 0,         // 0..cycles-1
    currentPhaseIndex: 0,    // 0..phases.length-1
    score: 0,
    cyclesCompleted: 0,
    pauseUsed: false,        // true si el usuario pausó al menos una vez
    rafId: null,
    startTime: 0,
    endTime: 0,
    phaseStart: 0,           // performance.now() al iniciar la fase actual
    elapsedBeforePause: 0,   // ms acumulados antes de pausar
    pausedAt: 0,
  };

  /* ============================================
     Cacheo de DOM
     ============================================ */
  const $ = (id) => document.getElementById(id);

  const dom = {
    screens: {
      start: $('rg-screen-start'),
      exercise: $('rg-screen-exercise'),
      final: $('rg-screen-final'),
    },
    score: $('rg-score'),
    cycleCounter: $('rg-cycle-counter'),
    miniFill: $('rg-mini-fill'),
    circle: $('rg-circle'),
    circlePhase: $('rg-circle-phase'),
    circleChrono: $('rg-circle-chrono'),
    circleHint: $('rg-circle-hint'),
    btnPause: $('btn-pause'),
    btnResume: $('btn-resume'),
    btnExit: $('btn-exit'),
    btnStart: $('rg-btn-start'),
    btnReplay: $('rg-btn-replay'),
    finalScore: $('rg-final-score'),
    finalCycles: $('rg-final-cycles'),
    finalTime: $('rg-final-time'),
    finalCalmValue: $('rg-final-calm-value'),
    finalCalmFill: $('rg-final-calm-fill'),
    finalMessage: $('rg-final-message'),
    finalTitle: $('rg-final-title'),
  };

  /* ============================================
     Utilidades
     ============================================ */
  function showScreen(name) {
    Object.entries(dom.screens).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle('hidden', key !== name);
    });
  }

  function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function clearRAF() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  /**
   * Función de easing.
   * @param {number} t  progreso 0..1
   * @param {string} type  'easeIn' | 'easeOut' | 'linear'
   */
  function ease(t, type) {
    switch (type) {
      case 'easeIn':  return t * t;
      case 'easeOut': return 1 - (1 - t) * (1 - t);
      case 'linear':
      default:        return t;
    }
  }

  function updateGlobalProgress() {
    const totalPhases = pattern.cycles * pattern.phases.length;
    const donePhases = state.currentCycle * pattern.phases.length + state.currentPhaseIndex;
    const pct = Math.round((donePhases / totalPhases) * 100);
    if (dom.miniFill) dom.miniFill.style.width = `${pct}%`;
    if (dom.cycleCounter) {
      const cur = Math.min(state.currentCycle + 1, pattern.cycles);
      dom.cycleCounter.textContent = `Ciclo ${cur} de ${pattern.cycles} · ${pct}%`;
    }
  }

  function updateScore() {
    if (dom.score) dom.score.textContent = String(state.score);
  }

  function setCircleColor(phaseKey) {
    if (!dom.circle) return;
    dom.circle.classList.remove('is-inhale', 'is-hold', 'is-exhale', 'is-rest');
    if (phaseKey) dom.circle.classList.add(`is-${phaseKey}`);
  }

  /* ============================================
     Bucle principal de animación
     ============================================ */
  function tick(now) {
    if (state.phase !== 'exercising') return;

    const phase = pattern.phases[state.currentPhaseIndex];
    const phaseDuration = phase.duration * 1000;
    const elapsed = state.elapsedBeforePause + (now - state.phaseStart);
    const t = Math.min(1, elapsed / phaseDuration);

    // Animar escala
    const eased = ease(t, phase.easing);
    const scale = phase.fromScale + (phase.toScale - phase.fromScale) * eased;
    if (dom.circle) dom.circle.style.transform = `scale(${scale})`;

    // Cronómetro (cuenta regresiva)
    const remaining = Math.max(0, Math.ceil(phase.duration - (elapsed / 1000)));
    if (dom.circleChrono) dom.circleChrono.textContent = String(remaining);

    if (t >= 1) {
      // Fase completada
      onPhaseComplete();
      return;
    }
    state.rafId = requestAnimationFrame(tick);
  }

  /* ============================================
     Transiciones de fase
     ============================================ */
  function runPhase() {
    const phase = pattern.phases[state.currentPhaseIndex];
    state.phase = 'exercising';
    state.elapsedBeforePause = 0;
    state.phaseStart = performance.now();

    if (dom.circlePhase) dom.circlePhase.textContent = phase.label;
    if (dom.circleHint) dom.circleHint.textContent = phase.hint;
    if (dom.circleChrono) dom.circleChrono.textContent = String(phase.duration);
    setCircleColor(phase.key);

    updateGlobalProgress();
    state.rafId = requestAnimationFrame(tick);
  }

  function onPhaseComplete() {
    clearRAF();
    state.currentPhaseIndex += 1;

    if (state.currentPhaseIndex >= pattern.phases.length) {
      // Ciclo terminado
      state.cyclesCompleted += 1;
      state.score += SCORING.PER_CYCLE;
      updateScore();
      state.currentPhaseIndex = 0;
      state.currentCycle += 1;

      if (state.currentCycle >= pattern.cycles) {
        finishSession();
        return;
      }
    }

    runPhase();
  }

  /* ============================================
     Pausa / Reanudar
     ============================================ */
  function pause() {
    if (state.phase !== 'exercising') return;
    clearRAF();
    state.pausedAt = performance.now();
    state.elapsedBeforePause += state.pausedAt - state.phaseStart;
    state.phase = 'paused';
    state.pauseUsed = true;

    if (dom.btnPause) dom.btnPause.classList.add('hidden');
    if (dom.btnResume) dom.btnResume.classList.remove('hidden');
    if (dom.btnExit) dom.btnExit.classList.remove('hidden');
  }

  function resume() {
    if (state.phase !== 'paused') return;
    state.phase = 'exercising';
    state.phaseStart = performance.now();  // reinicia el "reloj" interno
    // Mantener elapsedBeforePause acumulado

    if (dom.btnResume) dom.btnResume.classList.add('hidden');
    if (dom.btnPause) dom.btnPause.classList.remove('hidden');
    if (dom.btnExit) dom.btnExit.classList.add('hidden');

    state.rafId = requestAnimationFrame(tick);
  }

  function exit() {
    if (!confirm('¿Salir de la sesión? Perderás el progreso actual.')) return;
    clearRAF();
    showScreen('start');
    state.phase = 'idle';
  }

  /* ============================================
     Inicio / fin de sesión
     ============================================ */
  function startSession() {
    state.phase = 'idle';
    state.currentCycle = 0;
    state.currentPhaseIndex = 0;
    state.score = 0;
    state.cyclesCompleted = 0;
    state.pauseUsed = false;
    state.elapsedBeforePause = 0;
    state.startTime = Date.now();

    updateScore();
    showScreen('exercise');

    if (dom.btnPause) dom.btnPause.classList.remove('hidden');
    if (dom.btnResume) dom.btnResume.classList.add('hidden');
    if (dom.btnExit) dom.btnExit.classList.add('hidden');

    // pequeño delay para que se vea la transición
    setTimeout(runPhase, 400);
  }

  function finishSession() {
    clearRAF();
    state.phase = 'complete';
    state.endTime = Date.now();

    // Bonificaciones
    if (state.cyclesCompleted === pattern.cycles) {
      state.score += SCORING.ALL_CYCLES_BONUS;
    }
    if (!state.pauseUsed && state.cyclesCompleted === pattern.cycles) {
      state.score += SCORING.NO_PAUSE_BONUS;
    }
    updateScore();

    // Render pantalla final
    const elapsed = state.endTime - state.startTime;
    const msg = getMotivationalMessage(state.score);
    const calm = calcCalmPercent(state.score, state.cyclesCompleted, pattern.cycles);

    if (dom.finalScore) dom.finalScore.textContent = String(state.score);
    if (dom.finalCycles) dom.finalCycles.textContent = `${state.cyclesCompleted}/${pattern.cycles}`;
    if (dom.finalTime) dom.finalTime.textContent = formatTime(elapsed);
    if (dom.finalMessage) dom.finalMessage.textContent = msg.message;
    if (dom.finalTitle) dom.finalTitle.textContent = msg.title;
    if (dom.finalCalmValue) dom.finalCalmValue.textContent = `${calm}%`;

    // Animar la barra de calma con un pequeño delay
    if (dom.finalCalmFill) {
      dom.finalCalmFill.style.width = '0%';
      setTimeout(() => {
        dom.finalCalmFill.style.width = `${calm}%`;
      }, 200);
    }

    if (window.GlobalScore) GlobalScore.record('respiracion', state.score);

    showScreen('final');
  }

  /* ============================================
     API pública
     ============================================ */
  window.RespiracionGame = {
    start() {
      startSession();
    },
    replay() {
      startSession();
    },
    pause() {
      pause();
    },
    resume() {
      resume();
    },
    exit() {
      exit();
    },
    getState() {
      return { ...state };
    },
  };
})();
