/* ============================================
   ZONA SEGURA · Sistema global de progreso (Fase 2)
   ============================================
   4 etapas del recorrido, 25% cada una:
     1. epp         → Viste al trabajador
     2. actividad   → Vocal Hero o Respiración Guiada
     3. sena        → Zona Segura SENA
     4. resultados  → Resultados finales

   El progreso es persistente (localStorage) y se muestra en una barra
   fija en la parte superior de cada página del recorrido.

   Uso:
     - Cargar este script con `defer` en cada página del recorrido,
       después de su CSS (styles/global-progress.css).
     - Marcar en qué etapa está la página actual:
         <body data-progress-stage="epp">
     - Al pulsar "Continuar con el recorrido" hacia la siguiente etapa,
       marcar la etapa actual como completada ANTES de navegar:
         ProgressTracker.complete('epp');
   ============================================ */

(() => {
  'use strict';

  const STORAGE_KEY = 'zona-segura-progress';

  const STAGES = [
    { id: 'epp', n: 1, label: 'Viste al trabajador' },
    { id: 'actividad', n: 2, label: 'Elige tu camino' },
    { id: 'sena', n: 3, label: 'Zona Segura SENA' },
    { id: 'resultados', n: 4, label: 'Resultados finales' },
  ];
  const TOTAL = STAGES.length;

  // ---------- Estado ----------
  function emptyState() {
    const stages = {};
    STAGES.forEach((s) => { stages[s.id] = false; });
    return { stages, startedAt: 0, finishedAt: 0, updated: 0 };
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      const base = emptyState();
      if (parsed && parsed.stages) {
        STAGES.forEach((s) => { base.stages[s.id] = !!parsed.stages[s.id]; });
        base.startedAt = Number(parsed.startedAt) || 0;
        base.finishedAt = Number(parsed.finishedAt) || 0;
        base.updated = Number(parsed.updated) || 0;
      }
      return base;
    } catch (e) {
      return emptyState();
    }
  }

  function write(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // localStorage no disponible (modo privado, sin espacio, etc.)
    }
  }

  function completedCount(state) {
    return STAGES.filter((s) => state.stages[s.id]).length;
  }

  // ---------- API pública ----------
  function percent(state) {
    state = state || read();
    return Math.round((completedCount(state) / TOTAL) * 100);
  }

  function complete(stageId) {
    if (!STAGES.some((s) => s.id === stageId)) return read();
    const state = read();
    let changed = false;
    if (!state.stages[stageId]) {
      state.stages[stageId] = true;
      changed = true;
    }
    if (stageId === 'resultados' && !state.finishedAt) {
      state.finishedAt = Date.now();
      changed = true;
    }
    if (changed) {
      state.updated = Date.now();
      write(state);
    }
    return state;
  }

  function get() {
    return read();
  }

  // Marca el inicio del recorrido si aún no se había registrado
  // (se llama en cada página del recorrido; solo escribe la primera vez).
  function markStart() {
    const state = read();
    if (!state.startedAt) {
      state.startedAt = Date.now();
      state.updated = Date.now();
      write(state);
    }
    return state;
  }

  // Duración del recorrido en milisegundos: desde el inicio hasta el
  // final (si ya se completó) o hasta ahora (si sigue en curso).
  function getElapsedMs() {
    const state = read();
    if (!state.startedAt) return 0;
    const end = state.finishedAt || Date.now();
    return Math.max(0, end - state.startedAt);
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  }

  // ---------- UI: barra fija en la parte superior ----------
  function mountBar() {
    if (document.querySelector('.journey-progress')) return; // idempotente

    // Registrar el inicio del recorrido la primera vez que se monta
    // la barra en cualquier página (normalmente introduccion.html).
    markStart();

    // Si la página se marca a sí misma como el final de una etapa
    // (p. ej. resultados.html), la completamos antes de calcular el %.
    const autoComplete = document.body.getAttribute('data-progress-complete-on-load');
    if (autoComplete) complete(autoComplete);

    const currentId = document.body.getAttribute('data-progress-stage');
    const currentStage = STAGES.find((s) => s.id === currentId) || null;

    const state = read();
    const pct = percent(state);
    const displayN = currentStage ? currentStage.n : Math.max(1, completedCount(state));

    const bar = document.createElement('div');
    bar.className = 'journey-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-label', 'Progreso del recorrido de capacitación');
    bar.innerHTML =
      '<div class="journey-progress__track">' +
        '<div class="journey-progress__fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="journey-progress__label">' +
        '<span class="journey-progress__step">Etapa ' + displayN + ' de ' + TOTAL +
          (currentStage ? ' · ' + currentStage.label : '') + '</span>' +
        '<span class="journey-progress__pct">' + pct + '%</span>' +
      '</div>';

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-journey-progress');
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountBar);
    } else {
      mountBar();
    }
  }

  init();

  window.ProgressTracker = { STORAGE_KEY, STAGES, TOTAL, complete, percent, get, reset, mountBar, markStart, getElapsedMs };
})();
