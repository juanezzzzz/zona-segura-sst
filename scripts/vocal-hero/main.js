/* ============================================
   VOCAL HERO - Bootstrap
   Conecta los botones del DOM con el motor del juego.
   ============================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const game = window.VocalHeroGame;
    if (!game) {
      console.error('VocalHeroGame no está disponible. ¿Se cargó game.js?');
      return;
    }

    /* ---------- Botones principales ---------- */
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
      btnStart.addEventListener('click', () => game.start());
    }

    const btnBegin = document.getElementById('btn-begin-exercise');
    if (btnBegin) {
      btnBegin.addEventListener('click', () => game.beginCurrent());
    }

    const btnSkip = document.getElementById('btn-skip-success');
    if (btnSkip) {
      btnSkip.addEventListener('click', () => game.skipSuccess());
    }

    const btnReplay = document.getElementById('btn-replay');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => game.replay());
    }

    const btnRetryAborted = document.getElementById('btn-retry-aborted');
    if (btnRetryAborted) {
      btnRetryAborted.addEventListener('click', () => game.retryCurrent());
    }

    const btnRetryPermission = document.getElementById('btn-retry-permission');
    if (btnRetryPermission) {
      btnRetryPermission.addEventListener('click', () => game.start());
    }

    /* ---------- Atajos de teclado ---------- */
    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      if (e.key === ' ' || e.key === 'Enter') {
        const s = game.getState();
        if (s.phase === 'idle' && btnBegin && !btnBegin.classList.contains('hidden')) {
          e.preventDefault();
          btnBegin.click();
        } else if (s.phase === 'success') {
          e.preventDefault();
          game.skipSuccess();
        }
      }
    });
  });
})();
