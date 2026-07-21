/* ============================================
   VOCAL HERO - Motor de juego (versión con micrófono funcional)
   La barra de progreso solo avanza cuando el micrófono
   detecta voz. El cronómetro se pausa al dejar de hablar.
   ============================================ */

(function () {
  'use strict';

  const { EXERCISES, SCORING, getMotivationalMessage } = window.VocalHeroData;

  /* ============================================
     Estado global del juego
     ============================================ */
  const state = {
    phase: 'idle',           // idle | calibrating | countdown | exercising | success | aborted | final
    currentIndex: 0,
    score: 0,
    completed: 0,
    startTime: 0,
    endTime: 0,
    rafId: null,
    countdownTimers: [],
    successTimer: null,

    // Estado de progresión basado en voz
    progress: 0,                  // 0-100, basado en voz detectada
    virtualElapsedMs: 0,          // tiempo virtual del ejercicio (pausa sin voz)
    lastFrameTime: 0,             // para calcular delta entre frames
    lastVoiceTime: 0,             // última vez que se detectó voz
    isPausedBySilence: false,     // si está pausado por falta de voz
    currentExercise: null,        // referencia al ejercicio en curso
    aborted: false,               // si se abortó por timeout
  };

  /* ============================================
     Configuración
     ============================================ */
  const CFG = {
    silenceTimeoutMs: 30000,      // 30s sin voz = abortar
    baseCompletionRatio: 0.7,     // completar la barra en 70% del tiempo objetivo con voz continua
    minProgressPerFrame: 0,       // no avanza si no hay voz
  };

  /* ============================================
     Selectores de DOM
     ============================================ */
  const $ = (id) => document.getElementById(id);

  const dom = {
    screens: {
      start: $('screen-start'),
      calibrating: $('screen-calibrating'),
      exercise: $('screen-exercise'),
      success: $('screen-success'),
      aborted: $('screen-aborted'),
      final: $('screen-final'),
      permError: $('screen-permission-error'),
    },
    score: $('vh-score'),
    exerciseCounter: $('vh-exercise-counter'),
    levelBadge: $('vh-level-badge'),
    miniFill: $('vh-mini-fill'),
    progressFill: $('vh-progress-fill'),
    progressPercent: $('vh-progress-percent'),
    chrono: $('vh-chrono'),
    sound: $('vh-sound-display'),
    icon: $('vh-exercise-icon'),
    title: $('vh-exercise-title'),
    instruction: $('vh-exercise-instruction'),
    btnBegin: $('btn-begin-exercise'),
    btnStart: $('btn-start'),
    btnSkipSuccess: $('btn-skip-success'),
    btnReplay: $('btn-replay'),
    btnRetryAborted: $('btn-retry-aborted'),
    btnRetryPermission: $('btn-retry-permission'),
    btnBackFromError: $('btn-back-from-error'),
    pointsEarned: $('vh-points-earned'),
    finalScore: $('vh-final-score'),
    finalCompleted: $('vh-final-completed'),
    finalTime: $('vh-final-time'),
    finalMessage: $('vh-final-message'),
    finalTitle: $('vh-final-title'),
    // VU meter
    vuFill: $('vh-vu-fill'),
    vuLevel: $('vh-vu-level'),
    // Calibración
    calVuFill: $('vh-cal-vu-fill'),
    calChrono: $('vh-cal-chrono'),
    calNoisy: $('vh-cal-noisy'),
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

  function clearTimers() {
    state.countdownTimers.forEach(t => clearTimeout(t));
    state.countdownTimers = [];
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    if (state.successTimer) clearTimeout(state.successTimer);
    state.successTimer = null;
  }

  function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatSeconds(seconds) {
    return String(Math.max(0, Math.ceil(seconds)));
  }

  function updateScore() {
    if (dom.score) dom.score.textContent = String(state.score);
  }

  function updateGlobalProgress() {
    const total = EXERCISES.length;
    const done = state.completed;
    const pct = Math.round((done / total) * 100);
    if (dom.miniFill) dom.miniFill.style.width = `${pct}%`;
    if (dom.exerciseCounter) {
      const current = Math.min(state.currentIndex + 1, total);
      dom.exerciseCounter.textContent = `Ejercicio ${current} de ${total} · ${pct}%`;
    }
  }

  /* ============================================
     VU meter (indicador de nivel en vivo)
     ============================================ */
  function updateVUMeter(level) {
    if (!dom.vuFill) return;
    const max = 200;  // nivel máximo esperado tras amplificación
    const pct = Math.min(100, (level / max) * 100);
    dom.vuFill.style.width = `${pct}%`;

    if (window.VocalHeroAudio) {
      const threshold = window.VocalHeroAudio.getThreshold();
      const noiseFloor = window.VocalHeroAudio.getNoiseFloor();
      if (dom.vuLevel) {
        dom.vuLevel.textContent = `Nivel: ${level} · Umbral: ${threshold} · Ambiente: ${noiseFloor}`;
      }
    }
  }

  /* ============================================
     Flujo de inicio con micrófono
     ============================================ */
  async function start() {
    state.phase = 'idle';
    resetGame();
    state.startTime = Date.now();

    // 1. Solicitar permiso del micrófono
    if (!window.VocalHeroAudio) {
      console.error('VocalHeroAudio no disponible');
      return;
    }
    const granted = await window.VocalHeroAudio.requestPermission();
    if (!granted) {
      showScreen('permError');
      return;
    }

    // 2. Calibrar (2 segundos midiendo ruido ambiente)
    state.phase = 'calibrating';
    showScreen('calibrating');
    if (dom.calNoisy) dom.calNoisy.classList.add('hidden');
    if (dom.calVuFill) dom.calVuFill.style.width = '0%';
    if (dom.calChrono) dom.calChrono.textContent = '2';

    // Suscribirse al evento 'level' para actualizar el VU en vivo durante calibración
    const onLevel = (lvl) => {
      if (state.phase !== 'calibrating') return;
      const max = 200;
      if (dom.calVuFill) dom.calVuFill.style.width = `${Math.min(100, (lvl / max) * 100)}%`;
    };
    const onTick = (remaining) => {
      if (dom.calChrono) dom.calChrono.textContent = String(remaining);
    };
    window.VocalHeroAudio.on('level', onLevel);

    // cronómetro visual de calibración
    const calStart = performance.now();
    const CAL_DURATION = 2000;
    const calTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((CAL_DURATION - (performance.now() - calStart)) / 1000));
      onTick(remaining);
      if (remaining <= 0) clearInterval(calTimer);
    }, 100);

    const result = await window.VocalHeroAudio.calibrate(CAL_DURATION);
    clearInterval(calTimer);
    window.VocalHeroAudio.off('level', onLevel);

    if (!result) {
      // Calibración falló
      showScreen('permError');
      return;
    }

    if (result.tooNoisy && dom.calNoisy) {
      dom.calNoisy.classList.remove('hidden');
    }

    // Iniciar el monitoreo de voz
    window.VocalHeroAudio.start();

    // Pequeño delay para que el usuario vea el resultado y luego ir al primer ejercicio
    setTimeout(() => {
      startExercise(0);
    }, 800);
  }

  /* ============================================
     Render de la pantalla de ejercicio
     ============================================ */
  function renderExercise(exercise) {
    state.currentExercise = exercise;
    state.progress = 0;
    state.virtualElapsedMs = 0;
    state.isPausedBySilence = false;
    state.lastVoiceTime = performance.now();
    state.lastFrameTime = performance.now();
    state.aborted = false;

    if (dom.icon) dom.icon.textContent = exercise.icon;
    if (dom.title) dom.title.textContent = exercise.name;
    if (dom.instruction) dom.instruction.textContent = exercise.instruction;
    if (dom.levelBadge) dom.levelBadge.textContent = `Nivel ${exercise.level} · ${exercise.levelName}`;

    if (dom.sound) {
      if (exercise.sequence && exercise.sequence.length) {
        dom.sound.classList.add('is-sequence');
        dom.sound.innerHTML = exercise.sequence
          .map(syl => `<span class="vh-syllable" data-syl="${syl}">${syl}</span>`)
          .join('');
      } else {
        dom.sound.classList.remove('is-sequence');
        dom.sound.textContent = exercise.sound || '';
      }
    }

    if (dom.progressFill) {
      dom.progressFill.style.width = '0%';
      dom.progressFill.classList.remove('is-success');
    }
    if (dom.progressPercent) {
      dom.progressPercent.textContent = '0%';
      dom.progressPercent.classList.remove('is-silent');
    }
    if (dom.chrono) {
      dom.chrono.classList.remove('is-warning', 'is-couting', 'is-paused');
      dom.chrono.textContent = formatSeconds(exercise.duration);
    }
    if (dom.btnBegin) {
      dom.btnBegin.classList.remove('hidden');
      dom.btnBegin.disabled = false;
      dom.btnBegin.textContent = 'Comenzar ejercicio';
    }
    if (dom.icon) dom.icon.classList.remove('is-playing', 'is-silent');
    if (dom.vuFill) dom.vuFill.style.width = '0%';

    updateGlobalProgress();
  }

  /* ============================================
     Cuenta regresiva 3-2-1
     ============================================ */
  function runCountdown(seconds, onDone) {
    state.phase = 'countdown';
    if (dom.btnBegin) dom.btnBegin.disabled = true;

    let n = seconds;
    if (dom.chrono) {
      dom.chrono.textContent = String(n);
      dom.chrono.classList.add('is-couting');
    }

    const tick = () => {
      n -= 1;
      if (n <= 0) {
        if (dom.chrono) dom.chrono.classList.remove('is-couting');
        onDone();
        return;
      }
      if (dom.chrono) {
        dom.chrono.classList.remove('is-couting');
        void dom.chrono.offsetWidth;  // forzar reflow
        dom.chrono.textContent = String(n);
        dom.chrono.classList.add('is-couting');
      }
      const t = setTimeout(tick, 800);
      state.countdownTimers.push(t);
    };
    const t = setTimeout(tick, 800);
    state.countdownTimers.push(t);
  }

  /* ============================================
     Ejecución del ejercicio (basado en voz)
     ============================================ */
  function runExercise(exercise) {
    state.phase = 'exercising';
    state.lastFrameTime = performance.now();
    state.lastVoiceTime = performance.now();
    if (dom.btnBegin) dom.btnBegin.classList.add('hidden');
    if (dom.icon) dom.icon.classList.add('is-playing');

    const targetDurationMs = exercise.duration * 1000;
    // Velocidad base: 100% de la barra / (targetDurationMs * 0.7) por milisegundo
    // (asumiendo que se completará en ~70% del tiempo con voz continua)
    const baseProgressPerMs = 100 / (targetDurationMs * CFG.baseCompletionRatio);

    function tick(now) {
      if (state.phase !== 'exercising') return;

      const deltaMs = now - state.lastFrameTime;
      state.lastFrameTime = now;

      const audio = window.VocalHeroAudio;
      const level = audio ? audio.getLevel() : 0;
      const isVoice = audio ? audio.isVoiceActive() : false;

      // Actualizar VU meter siempre
      updateVUMeter(level);

      if (isVoice) {
        state.lastVoiceTime = now;
        if (state.isPausedBySilence) {
          state.isPausedBySilence = false;
          if (dom.progressPercent) dom.progressPercent.classList.remove('is-silent');
          if (dom.icon) dom.icon.classList.remove('is-silent');
          if (dom.chrono) dom.chrono.classList.remove('is-paused');
        }
        // Avanzar la barra con modulador de intensidad
        const intensity = Math.min(1, level / 100);  // 0-1
        const factor = 0.6 + intensity * 0.8;        // 0.6 - 1.4
        state.progress = Math.min(100, state.progress + baseProgressPerMs * deltaMs * factor);
        state.virtualElapsedMs += deltaMs;

        // Actualizar visual de barra
        if (dom.progressFill) dom.progressFill.style.width = `${state.progress}%`;
        if (dom.progressPercent) {
          dom.progressPercent.textContent = `${Math.round(state.progress)}% · ¡Te escuchamos!`;
        }
      } else {
        // Sin voz: no avanza la barra, no avanza el tiempo virtual
        // Indicador visual de pausa
        if (!state.isPausedBySilence) {
          state.isPausedBySilence = true;
          if (dom.progressPercent) dom.progressPercent.classList.add('is-silent');
          if (dom.icon) dom.icon.classList.add('is-silent');
          if (dom.chrono) dom.chrono.classList.add('is-paused');
        }
        if (dom.progressPercent) {
          dom.progressPercent.textContent = `${Math.round(state.progress)}% · Te escuchamos…`;
        }
      }

      // Cronómetro (cuenta regresiva basada en tiempo virtual)
      const remaining = (targetDurationMs - state.virtualElapsedMs) / 1000;
      if (dom.chrono) {
        dom.chrono.textContent = formatSeconds(remaining);
        if (remaining <= 3 && !state.isPausedBySilence) dom.chrono.classList.add('is-warning');
        else dom.chrono.classList.remove('is-warning');
      }

      // Secuencias: resaltar sílabas según el progreso
      if (exercise.sequence && exercise.sequence.length && dom.sound) {
        const totalSyllables = exercise.sequence.length;
        const sylDur = (exercise.syllableDuration || 1) * 1000;
        // Mapear tiempo virtual a índice de sílaba
        const idx = Math.min(totalSyllables - 1, Math.floor(state.virtualElapsedMs / sylDur));
        const syls = dom.sound.querySelectorAll('.vh-syllable');
        syls.forEach((el, i) => {
          el.classList.toggle('is-active', i === idx && !state.isPausedBySilence);
          el.classList.toggle('is-done', i < idx);
        });
      }

      // Condición de éxito: barra al 100%
      if (state.progress >= 100) {
        completeExercise(true);
        return;
      }

      // Condición de éxito alternativo: terminó el tiempo virtual
      if (state.virtualElapsedMs >= targetDurationMs && state.progress >= 80) {
        completeExercise(true);
        return;
      }

      // Condición de aborto: silencio prolongado
      const silenceDuration = now - state.lastVoiceTime;
      if (silenceDuration >= CFG.silenceTimeoutMs) {
        abortExercise('No detectamos tu voz. Inténtalo de nuevo.');
        return;
      }

      state.rafId = requestAnimationFrame(tick);
    }

    state.rafId = requestAnimationFrame(tick);
  }

  /* ============================================
     Abortar ejercicio (silencio prolongado)
     ============================================ */
  function abortExercise(message) {
    clearTimers();
    if (window.VocalHeroAudio) window.VocalHeroAudio.stop();
    state.phase = 'aborted';
    state.aborted = true;
    if (dom.icon) dom.icon.classList.remove('is-playing', 'is-silent');
    showScreen('aborted');
    const msgEl = document.getElementById('vh-aborted-message');
    if (msgEl) msgEl.textContent = message;
  }

  /* ============================================
     Finalización de un ejercicio (éxito)
     ============================================ */
  function completeExercise(noInterruptions) {
    clearTimers();
    if (window.VocalHeroAudio) window.VocalHeroAudio.stop();

    if (dom.progressFill) {
      dom.progressFill.style.width = '100%';
      dom.progressFill.classList.add('is-success');
    }
    if (dom.chrono) {
      dom.chrono.classList.remove('is-warning', 'is-paused');
    }
    if (dom.icon) dom.icon.classList.remove('is-playing', 'is-silent');
    if (dom.progressPercent) dom.progressPercent.classList.remove('is-silent');

    let earned = SCORING.PER_EXERCISE;
    if (noInterruptions) earned += SCORING.NO_INTERRUPTION_BONUS;

    state.score += earned;
    state.completed += 1;
    updateScore();

    if (dom.pointsEarned) dom.pointsEarned.textContent = String(earned);

    state.phase = 'success';
    showScreen('success');
    showConfetti();

    state.successTimer = setTimeout(() => {
      goToNextExercise();
    }, 1700);
  }

  function goToNextExercise() {
    clearTimers();
    state.currentIndex += 1;
    if (state.currentIndex >= EXERCISES.length) {
      finishGame();
      return;
    }
    startExercise(state.currentIndex);
  }

  function startExercise(index) {
    state.currentIndex = index;
    state.phase = 'idle';
    const exercise = EXERCISES[index];
    if (!exercise) {
      finishGame();
      return;
    }

    showScreen('exercise');
    renderExercise(exercise);
    updateGlobalProgress();

    // Reanudar el audio para el nuevo ejercicio
    if (window.VocalHeroAudio && window.VocalHeroAudio.isReady()) {
      window.VocalHeroAudio.start();
    }

    const t = setTimeout(() => {
      runCountdown(3, () => runExercise(exercise));
    }, 350);
    state.countdownTimers.push(t);
  }

  /* ============================================
     Final del juego
     ============================================ */
  function finishGame() {
    clearTimers();
    if (window.VocalHeroAudio) window.VocalHeroAudio.stop();
    state.phase = 'final';
    state.endTime = Date.now();

    if (state.completed === EXERCISES.length) {
      state.score += SCORING.ALL_COMPLETED_BONUS;
    }

    const elapsed = state.endTime - state.startTime;
    const msg = getMotivationalMessage(state.score);

    if (dom.finalScore) dom.finalScore.textContent = String(state.score);
    if (dom.finalCompleted) dom.finalCompleted.textContent = `${state.completed}/${EXERCISES.length}`;
    if (dom.finalTime) dom.finalTime.textContent = formatTime(elapsed);
    if (dom.finalMessage) dom.finalMessage.textContent = msg.message;
    if (dom.finalTitle) dom.finalTitle.textContent = msg.title;

    if (window.GlobalScore) GlobalScore.record('vocal', state.score);

    showScreen('final');
  }

  /* ============================================
     Confeti
     ============================================ */
  function showConfetti() {
    const colors = ['#5BA3C7', '#8DC8A8', '#E8A4C5', '#F0AD4E', '#5BC0DE'];
    const container = document.createElement('div');
    container.className = 'vh-confetti';
    const total = 32;
    for (let i = 0; i < total; i++) {
      const piece = document.createElement('span');
      piece.className = 'vh-confetti__piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.animationDuration = `${1.6 + Math.random() * 0.8}s`;
      container.appendChild(piece);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 2600);
  }

  /* ============================================
     Reset
     ============================================ */
  function resetGame() {
    clearTimers();
    if (window.VocalHeroAudio) window.VocalHeroAudio.stop();
    state.phase = 'idle';
    state.currentIndex = 0;
    state.score = 0;
    state.completed = 0;
    state.progress = 0;
    state.virtualElapsedMs = 0;
    state.isPausedBySilence = false;
    state.lastVoiceTime = 0;
    state.aborted = false;
    updateScore();
    updateGlobalProgress();
  }

  /* ============================================
     API pública
     ============================================ */
  window.VocalHeroGame = {
    async start() {
      await start();
    },
    async replay() {
      await start();
    },
    retryCurrent() {
      // Reintentar el ejercicio actual (desde abort)
      if (state.phase !== 'aborted') return;
      if (!state.currentExercise) return;
      startExercise(state.currentIndex);
    },
    skipSuccess() {
      if (state.phase !== 'success') return;
      goToNextExercise();
    },
    beginCurrent() {
      if (state.phase !== 'idle') return;
      const exercise = EXERCISES[state.currentIndex];
      if (!exercise) return;
      runCountdown(3, () => runExercise(exercise));
    },
    getState() {
      return { ...state };
    },
  };
})();
