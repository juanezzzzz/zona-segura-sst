/* ============================================
   VOCAL HERO - Módulo de audio (detección de voz real)
   Web Audio API + AnalyserNode + RMS + calibración.

   API expuesta en window.VocalHeroAudio:
     - requestPermission(): Promise<boolean>
     - calibrate(durationMs?): Promise<{ noiseFloor, threshold, tooNoisy } | null>
     - start(): void              Inicia el monitoreo continuo (rAF)
     - stop(): void               Detiene el monitoreo
     - getLevel(): number         RMS actual (0-255), actualizado cada frame
     - isVoiceActive(): boolean   true si level >= threshold
     - getNoiseFloor(): number
     - getThreshold(): number
     - on(event, handler): void   Eventos: 'voiceStart' | 'voiceEnd' | 'silence' | 'level'
     - off(event, handler): void
     - isReady(): boolean         true si está inicializado
   ============================================ */

(function () {
  'use strict';

  /* ============================================
     Configuración
     ============================================ */
  const CONFIG = {
    fftSize: 1024,
    smoothing: 0.4,                  // menos suavizado = más responsivo
    thresholdMargin: 12,             // margen sobre el ruido ambiente
    tooNoisyThreshold: 60,           // si el umbral supera esto, ambiente muy ruidoso
    voiceHoldMs: 60,                 // histéresis: debe haber voz este tiempo para activar
    silenceTriggerMs: 1500,          // ms sin voz para emitir 'silence' / 'voiceEnd'
  };

  /* ============================================
     Estado interno
     ============================================ */
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let stream = null;
  let source = null;

  let isInitialized = false;
  let isMonitoring = false;
  let rafId = null;

  let currentLevel = 0;              // RMS (0-255) del frame actual
  let noiseFloor = 0;                // ruido ambiente medido en calibración
  let threshold = 30;                // umbral para considerar voz
  let voiceActive = false;           // estado actual
  let lastVoiceTime = 0;             // performance.now() de la última detección
  let voiceEnteredAt = 0;            // cuando el nivel empezó a superar el umbral
  let lastEmittedSilence = false;    // evita emitir 'silence' repetidamente
  let levelContinuous = 0;           // segundos continuos por encima del umbral

  const listeners = {};              // { event: [handler, ...] }

  /* ============================================
     Event emitter
     ============================================ */
  function emit(event, payload) {
    const arr = listeners[event];
    if (!arr || arr.length === 0) return;
    for (let i = 0; i < arr.length; i++) {
      try { arr[i](payload); } catch (e) { console.warn('audio listener error:', e); }
    }
  }

  function on(event, handler) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(handler);
  }

  function off(event, handler) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(h => h !== handler);
  }

  /* ============================================
     Permisos
     ============================================ */
  async function requestPermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia no soportado en este navegador.');
      return false;
    }
    if (isInitialized) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API no soportada.');
        return false;
      }
      audioCtx = new AudioCtx();
      // Algunos navegadores crean el contexto en estado 'suspended'
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) { /* ignore */ }
      }
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = CONFIG.fftSize;
      analyser.smoothingTimeConstant = CONFIG.smoothing;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.fftSize);
      isInitialized = true;
      return true;
    } catch (err) {
      console.warn('Permiso de micrófono denegado o error:', err && err.message ? err.message : err);
      cleanup();
      return false;
    }
  }

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    isMonitoring = false;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) { /* ignore */ }
      audioCtx = null;
    }
    analyser = null;
    source = null;
    dataArray = null;
    isInitialized = false;
    currentLevel = 0;
    voiceActive = false;
  }

  /* ============================================
     Cálculo de nivel RMS
     ============================================ */
  function readLevel() {
    if (!analyser || !dataArray) return 0;
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;  // normalizar a -1..1
      sum += v * v;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    return Math.round(rms * 255 * 3);  // amplificar x3 para voces suaves
  }

  /* ============================================
     Calibración
     ============================================ */
  async function calibrate(durationMs = 2000) {
    if (!isInitialized) return null;
    if (isMonitoring) stop();

    const samples = [];
    const start = performance.now();

    return new Promise((resolve) => {
      const onCalFrame = () => {
        const level = readLevel();
        samples.push(level);
        emit('level', level);
        if (performance.now() - start < durationMs) {
          rafId = requestAnimationFrame(onCalFrame);
        } else {
          // Calcular ruido ambiente: usamos el percentil 90 (peor caso razonable)
          const sorted = samples.slice().sort((a, b) => a - b);
          const idx = Math.floor(sorted.length * 0.9);
          noiseFloor = sorted[idx] || 0;
          threshold = Math.min(255, noiseFloor + CONFIG.thresholdMargin);
          const tooNoisy = threshold > CONFIG.tooNoisyThreshold;
          rafId = null;
          resolve({ noiseFloor, threshold, tooNoisy });
        }
      };
      rafId = requestAnimationFrame(onCalFrame);
    });
  }

  /* ============================================
     Monitoreo continuo
     ============================================ */
  function monitorLoop() {
    if (!isMonitoring) return;
    const level = readLevel();
    currentLevel = level;
    const now = performance.now();

    // Actualizar tiempo continuo por encima del umbral
    if (level >= threshold) {
      if (voiceEnteredAt === 0) voiceEnteredAt = now;
      levelContinuous = now - voiceEnteredAt;
      lastVoiceTime = now;
    } else {
      voiceEnteredAt = 0;
      levelContinuous = 0;
    }

    // Determinar voz activa con histéresis
    const wasActive = voiceActive;
    if (!wasActive && levelContinuous >= CONFIG.voiceHoldMs) {
      voiceActive = true;
      lastEmittedSilence = false;
      emit('voiceStart', { level, threshold });
    } else if (wasActive && level < threshold) {
      // No desactivamos inmediatamente: esperamos a que pase silenceTriggerMs
      if (now - lastVoiceTime >= CONFIG.silenceTriggerMs) {
        voiceActive = false;
        emit('voiceEnd', { level, threshold });
      }
    }

    // Evento de silencio prolongado
    if (!voiceActive && !lastEmittedSilence && (now - lastVoiceTime) >= CONFIG.silenceTriggerMs) {
      lastEmittedSilence = true;
      emit('silence', { durationMs: now - lastVoiceTime });
    }

    emit('level', level);

    if (isMonitoring) {
      rafId = requestAnimationFrame(monitorLoop);
    }
  }

  function start() {
    if (!isInitialized) {
      console.warn('Audio no inicializado. Llama a requestPermission() primero.');
      return;
    }
    if (isMonitoring) return;
    isMonitoring = true;
    lastVoiceTime = performance.now();
    voiceEnteredAt = 0;
    levelContinuous = 0;
    voiceActive = false;
    lastEmittedSilence = false;
    monitorLoop();
  }

  function stop() {
    isMonitoring = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    voiceActive = false;
    voiceEnteredAt = 0;
    levelContinuous = 0;
  }

  /* ============================================
     Estado público
     ============================================ */
  function getLevel() { return currentLevel; }
  function isVoiceActive() { return voiceActive; }
  function getNoiseFloor() { return noiseFloor; }
  function getThreshold() { return threshold; }
  function isReady() { return isInitialized; }

  /* ============================================
     Exponer API
     ============================================ */
  window.VocalHeroAudio = {
    requestPermission,
    calibrate,
    start,
    stop,
    cleanup,
    getLevel,
    isVoiceActive,
    getNoiseFloor,
    getThreshold,
    isReady,
    on,
    off,
    CONFIG,
  };
})();
