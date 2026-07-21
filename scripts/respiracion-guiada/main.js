/* ============================================
   RESPIRACIÓN GUIADA - Bootstrap
   Conecta los botones del DOM con el motor.
   ============================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const game = window.RespiracionGame;
    if (!game) {
      console.error('RespiracionGame no está disponible. ¿Se cargó game.js?');
      return;
    }

    /* ---------- Botones principales ---------- */
    const btnStart = document.getElementById('rg-btn-start');
    if (btnStart) btnStart.addEventListener('click', () => game.start());

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) btnPause.addEventListener('click', () => game.pause());

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.addEventListener('click', () => game.resume());

    const btnExit = document.getElementById('btn-exit');
    if (btnExit) btnExit.addEventListener('click', () => game.exit());

    const btnReplay = document.getElementById('rg-btn-replay');
    if (btnReplay) btnReplay.addEventListener('click', () => game.replay());

    /* ---------- Atajos de teclado ---------- */
    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        const s = game.getState();
        if (s.phase === 'exercising') {
          e.preventDefault();
          game.pause();
        } else if (s.phase === 'paused') {
          e.preventDefault();
          game.resume();
        }
      } else if (e.key === 'Enter') {
        const s = game.getState();
        if (s.phase === 'idle' && btnStart) {
          e.preventDefault();
          btnStart.click();
        }
      } else if (e.key === 'Escape') {
        const s = game.getState();
        if (s.phase === 'exercising' || s.phase === 'paused') {
          e.preventDefault();
          game.exit();
        }
      }
    });
  });
})();
