/* ==========================================================
   Etapa 2 · Vocal Hero
   Puntaje crudo: 10 por ejercicio + 20 si no hubo interrupciones,
   + 50 al completar los 10 sin saltar ninguno. Máximo: 350.
   ========================================================== */
(function () {
  'use strict';
  const { store, ui, data, journey, sfx } = window.ZS;
  const audio = window.VocalHeroAudio;
  if (!journey.mount('bienestar')) return;

  const EX = data.VOCAL_EXERCISES;
  const S = { PER: 10, CLEAN: 20, ALL: 50 };
  const MAX_RAW = EX.length * (S.PER + S.CLEAN) + S.ALL;
  const SILENCE_PROMPT_MS = 20000;
  const RING = 2 * Math.PI * 86;
  const toPts = store.scale('bienestar', MAX_RAW);

  const $ = (id) => document.getElementById(id);
  const el = {
    eyebrow: $('vh-eyebrow'), score: $('vh-score'), group: $('vh-group'), name: $('vh-name'), tip: $('vh-tip'),
    sound: $('vh-sound'), prog: $('vh-prog'), center: $('vh-center'), phase: $('vh-phase'),
    vu: $('vh-vu'), thr: $('vh-thr'), list: $('vh-list'), skip: $('btn-skip'),
  };
  el.prog.style.strokeDasharray = RING;

  const st = {
    i: 0, raw: 0, results: [], startedAt: 0,
    phase: 'idle', progress: 0, voiceMs: 0, interrupted: false, wasVoice: false,
    lastVoice: 0, lastFrame: 0, raf: 0, timers: [],
  };

  const later = (fn, ms) => { const t = setTimeout(fn, ms); st.timers.push(t); return t; };
  function clearAll() {
    st.timers.forEach(clearTimeout);
    st.timers = [];
    cancelAnimationFrame(st.raf);
  }

  /* ---------- Micrófono ---------- */
  async function startMic() {
    ui.showScreen('calib');
    $('calib-note').hidden = true;
    const ok = await audio.requestPermission();
    if (!ok) { ui.showScreen('nomic'); return; }
    const onLevel = (lvl) => ui.setMeter($('calib-vu'), lvl / 160);
    audio.on('level', onLevel);
    const res = await audio.calibrate(2000);
    audio.off('level', onLevel);
    if (!res) { ui.showScreen('nomic'); return; }
    if (res.tooNoisy) {
      ui.feedback($('calib-note'), 'info', 'El lugar está ruidoso', 'Funcionará, pero habla un poco más fuerte o acércate al micrófono.');
      await new Promise((r) => setTimeout(r, 1800));
    }
    st.startedAt = Date.now();
    audio.on('level', (lvl) => ui.setMeter(el.vu, lvl / 160));
    el.thr.style.setProperty('--t', Math.min(96, (audio.getThreshold() / 160) * 100) + '%');
    renderList();
    ui.showScreen('play');
    loadExercise(0);
  }

  /* ---------- Render ---------- */
  function renderList() {
    el.list.innerHTML = EX.map((e, i) => {
      const r = st.results[i];
      const cls = i === st.i && !r ? 'is-current' : r ? (r.skipped ? 'is-skipped' : 'is-done') : '';
      return '<li class="' + cls + '"><span class="dot">' + (r && !r.skipped ? '✓' : r ? '–' : '') + '</span><span>' + ui.esc(e.name) + '</span>' +
        '<span class="pts">' + (r && !r.skipped ? '+' + r.points : '') + '</span></li>';
    }).join('');
  }

  function setRing(p) { el.prog.style.strokeDashoffset = String(RING * (1 - p / 100)); }

  function setCenter(big, sub) {
    el.center.innerHTML = '<span class="vh-ring__pct">' + ui.esc(big) + '</span>' + (sub ? '<span class="vh-ring__sub">' + ui.esc(sub) + '</span>' : '');
  }

  function setPhase(text, kind) {
    el.phase.textContent = text;
    el.phase.className = 'vh-phase' + (kind ? ' is-' + kind : '');
  }

  function renderSound(ex, activeIdx) {
    if (ex.sequence) {
      el.sound.innerHTML = ex.sequence.map((s, i) =>
        '<span class="' + (activeIdx === i ? 'is-active' : activeIdx > i ? 'is-done' : '') + '">' + s + '</span>').join('');
    } else {
      el.sound.textContent = ex.sound;
    }
  }

  /* ---------- Flujo de un ejercicio ---------- */
  function loadExercise(i) {
    clearAll();
    st.i = i;
    const ex = EX[i];
    st.progress = 0; st.voiceMs = 0; st.interrupted = false; st.wasVoice = false;
    el.eyebrow.textContent = 'Ejercicio ' + (i + 1) + ' de ' + EX.length;
    el.group.textContent = ex.group;
    el.name.textContent = ex.name;
    el.tip.textContent = ex.tip;
    el.sound.classList.remove('is-live');
    renderSound(ex, -1);
    setRing(0);
    renderList();
    el.skip.disabled = false;

    let n = 3;
    st.phase = 'countdown';
    setPhase('Prepárate…');
    setCenter(String(n), 'segundos');
    const tick = () => {
      n -= 1;
      if (n > 0) { setCenter(String(n), 'segundos'); sfx.tick(); later(tick, 800); }
      else if (ex.inhale) inhale(ex);
      else run(ex);
    };
    later(tick, 800);
  }

  function inhale(ex) {
    st.phase = 'inhale';
    let left = ex.inhale;
    setPhase('Inhala profundo por la nariz', 'voice');
    setCenter(String(left), 'inhala');
    sfx.phase(392);
    const step = () => {
      left -= 1;
      if (left > 0) { setCenter(String(left), 'inhala'); later(step, 1000); }
      else { setPhase('Ahora suelta el aire con una S larga'); run(ex); }
    };
    later(step, 1000);
  }

  function run(ex) {
    st.phase = 'run';
    el.sound.classList.add('is-live');
    audio.start();
    const targetMs = ex.duration * 1000;
    st.lastFrame = performance.now();
    st.lastVoice = performance.now();
    setCenter('0%', 'completado');
    if (!ex.inhale) setPhase('¡Empieza!');

    const loop = (now) => {
      if (st.phase !== 'run') return;
      const dt = Math.min(100, now - st.lastFrame);
      st.lastFrame = now;
      // Voz = nivel sobre el umbral, con 250 ms de gracia entre sílabas.
      if (audio.getLevel() >= audio.getThreshold()) st.lastVoice = now;
      const gap = now - st.lastVoice;
      const voice = gap < 250;

      if (voice) {
        st.voiceMs += dt;
        st.progress = Math.min(100, (st.voiceMs / targetMs) * 100);
        if (!st.wasVoice) setPhase('¡Te escuchamos! Sostén el sonido', 'voice');
        st.wasVoice = true;
      } else if (st.progress > 0) {
        // Un silencio de más de 1,5 s a mitad del ejercicio cuenta como interrupción.
        if (gap > 1500 && !st.interrupted) st.interrupted = true;
        if (st.wasVoice) setPhase('Pausa… retoma el sonido', 'silent');
        st.wasVoice = false;
      } else if (gap > 1500) {
        setPhase('No te escuchamos todavía. ¡Con fuerza!', 'silent');
      }

      setRing(st.progress);
      setCenter(Math.round(st.progress) + '%', 'completado');
      if (ex.sequence) {
        const per = targetMs / ex.sequence.length;
        renderSound(ex, Math.min(ex.sequence.length - 1, Math.floor(st.voiceMs / per)));
      }

      if (st.progress >= 100) return complete(ex);
      if (now - st.lastVoice > SILENCE_PROMPT_MS) return silencePrompt(ex);
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
  }

  async function silencePrompt(ex) {
    st.phase = 'prompt';
    audio.stop();
    const choice = await ui.dialog({
      eyebrow: ex.name,
      title: 'No te escuchamos hace rato',
      text: 'Puede que el micrófono esté lejos o silenciado. ¿Qué quieres hacer?',
      actions: [
        { label: 'Saltar ejercicio', value: 'skip', variant: 'ghost' },
        { label: 'Reintentar', value: 'retry', variant: 'primary' },
      ],
      cancelValue: 'retry',
    });
    if (choice === 'skip') skip();
    else loadExercise(st.i);
  }

  function complete(ex) {
    st.phase = 'done';
    audio.stop();
    el.skip.disabled = true;
    const clean = !st.interrupted;
    const before = toPts(st.raw);
    st.raw += S.PER + (clean ? S.CLEAN : 0);
    const points = toPts(st.raw) - before;
    st.results[st.i] = { points, clean, skipped: false };
    ui.animateNumber(el.score, toPts(st.raw));
    setRing(100);
    setCenter('✓', clean ? 'sin cortes' : 'completado');
    setPhase(clean ? '¡Perfecto! +' + points + ' pts (sin interrupciones)' : '¡Bien! +' + points + ' pts', 'voice');
    ui.floatPoints(el.center, '+' + points);
    sfx.correct();
    if (clean) ui.confetti(el.center, 18);
    renderList();
    later(nextExercise, 1600);
  }

  function skip() {
    clearAll();
    st.phase = 'done';
    audio.stop();
    st.results[st.i] = { points: 0, clean: false, skipped: true };
    renderList();
    nextExercise();
  }

  function nextExercise() {
    if (st.i < EX.length - 1) loadExercise(st.i + 1);
    else finish();
  }

  function finish() {
    clearAll();
    audio.cleanup();
    const completed = st.results.filter((r) => !r.skipped).length;
    const clean = st.results.filter((r) => r.clean).length;
    if (completed === EX.length) st.raw += S.ALL;
    const points = toPts(st.raw);
    $('st-done').textContent = completed + '/' + EX.length;
    $('st-clean').textContent = String(clean);
    $('st-time').textContent = ui.formatDuration(Date.now() - st.startedAt);
    $('done-title').textContent = completed === EX.length ? (clean >= 8 ? '¡Maestría vocal!' : '¡Rutina completa!') : 'Buen calentamiento';
    $('done-text').textContent = completed === EX.length
      ? 'Completaste toda la rutina' + (clean ? ' y ' + clean + ' ejercicios sin cortes' : '') + '. Repítela antes de jornadas largas de habla.'
      : 'Completaste ' + completed + ' de ' + EX.length + ' ejercicios. Practicar a diario protege tus cuerdas vocales.';
    ui.showScreen('done');
    ui.animateNumber($('done-points'), points, 900);
    sfx.win();
    st.final = { raw: st.raw, max: MAX_RAW, module: 'vocal', detail: { completed, clean, total: EX.length } };
  }

  $('btn-start').addEventListener('click', startMic);
  $('btn-retry-mic').addEventListener('click', startMic);
  $('btn-replay').addEventListener('click', () => { st.raw = 0; st.results = []; el.score.textContent = '0'; el.score.dataset.value = '0'; startMic(); });
  el.skip.addEventListener('click', skip);
  $('btn-continue').addEventListener('click', () => journey.next('bienestar', st.final));
  window.addEventListener('pagehide', () => audio.cleanup());
})();
