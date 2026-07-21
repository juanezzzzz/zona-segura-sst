// ==========================================================
// ZONA SEGURA — sound.js
// Efectos de sonido sintetizados (Web Audio API, sin archivos externos)
// + control de música de fondo (usa un archivo real si lo agregas en
//   assets/sounds/background-music.mp3; si no existe, simplemente no suena,
//   el juego sigue funcionando normal).
// ==========================================================

const SoundFX = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function tone({ freq = 440, duration = 0.15, type = 'sine', volume = 0.18, glideTo = null, delay = 0 }) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;

    const start = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
    }

    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  return {
    isEnabled: () => enabled,
    setEnabled: (value) => { enabled = value; },

    click: () => tone({ freq: 520, duration: 0.08, type: 'triangle', volume: 0.14 }),

    flip: () => tone({ freq: 340, duration: 0.09, type: 'triangle', volume: 0.12 }),

    correct: () => {
      tone({ freq: 523.25, duration: 0.12, type: 'sine', volume: 0.2 });
      tone({ freq: 659.25, duration: 0.18, type: 'sine', volume: 0.2, delay: 0.09 });
    },

    wrong: () => tone({ freq: 220, duration: 0.28, type: 'sawtooth', volume: 0.13, glideTo: 140 }),

    spin: () => tone({ freq: 200, duration: 0.6, type: 'sawtooth', volume: 0.09, glideTo: 480 }),

    tick: () => tone({ freq: 900, duration: 0.035, type: 'square', volume: 0.1 }),

    badge: () => {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        tone({ freq, duration: 0.22, type: 'sine', volume: 0.18, delay: i * 0.1 });
      });
    },

    streak: () => {
      [659.25, 830.61, 987.77].forEach((freq, i) => {
        tone({ freq, duration: 0.14, type: 'triangle', volume: 0.16, delay: i * 0.07 });
      });
    },

    perfect: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone({ freq, duration: 0.24, type: 'sine', volume: 0.2, delay: i * 0.09 });
      });
    },

    start: () => tone({ freq: 392, duration: 0.16, type: 'sine', volume: 0.18, glideTo: 587.33 }),
  };
})();

// ---------- Música de fondo (opcional, usa assets/sounds/background-music.mp3) ----------
const BgMusic = (() => {
  const audioEl = document.getElementById('bg-music');
  let started = false;

  function tryStart() {
    if (started || !audioEl || !SoundFX.isEnabled()) return;
    started = true;
    audioEl.volume = 0.32;
    audioEl.play().catch(() => {
      // No hay archivo de música todavía, o el navegador bloqueó el autoplay: no pasa nada.
      started = false;
    });
  }

  function stop() {
    if (!audioEl) return;
    audioEl.pause();
    audioEl.currentTime = 0;
    started = false;
  }

  function setMuted(muted) {
    if (!audioEl) return;
    audioEl.muted = muted;
    if (!muted) tryStart();
  }

  return { tryStart, stop, setMuted };
})();

// ---------- Botón global de silencio ---------- 
const soundToggleBtn = document.getElementById('sound-toggle');
if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', () => {
    const nextEnabled = !SoundFX.isEnabled();
    SoundFX.setEnabled(nextEnabled);
    BgMusic.setMuted(!nextEnabled);
    soundToggleBtn.classList.toggle('is-muted', !nextEnabled);
    soundToggleBtn.setAttribute('aria-label', nextEnabled ? 'Silenciar sonido' : 'Activar sonido');
  });
}
