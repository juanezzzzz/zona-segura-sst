/* ==========================================================
   Etapa 2 · Respiración guiada 4-4-6-2
   Puntaje crudo: 10 por ciclo + 20 por completar + 50 si no se pausó.
   Máximo: 5 × 10 + 20 + 50 = 120.
   ========================================================== */
(function () {
  'use strict';
  const { store, ui, data, journey, sfx } = window.ZS;
  if (!journey.mount('bienestar')) return;

  const P = data.BREATHING;
  const S = { PER: 10, ALL: 20, NO_PAUSE: 50 };
  const MAX_RAW = P.cycles * S.PER + S.ALL + S.NO_PAUSE;
  const CYCLE_MS = P.phases.reduce((a, p) => a + p.duration, 0) * 1000;
  const RING = 2 * Math.PI * 96;
  const toPts = store.scale('bienestar', MAX_RAW);

  const $ = (id) => document.getElementById(id);
  const el = {
    orb: $('rg-orb'), phase: $('rg-phase'), count: $('rg-count'), hint: $('rg-hint'), prog: $('rg-prog'),
    cycle: $('rg-cycle'), score: $('rg-score'), timeline: $('rg-timeline'), labels: $('rg-labels'), cycles: $('rg-cycles'),
    paused: $('rg-paused'), pause: $('btn-pause'),
  };
  el.prog.style.strokeDasharray = RING;

  // Línea de tiempo de un ciclo: segmentos proporcionales a cada fase.
  el.timeline.innerHTML = P.phases.map((p) => '<span style="flex:' + p.duration + '"><i></i></span>').join('');
  el.labels.innerHTML = P.phases.map((p) => '<span style="flex:' + p.duration + '">' + p.label + '</span>').join('');
  el.cycles.innerHTML = Array.from({ length: P.cycles }, () => '<i></i>').join('');

  const st = { raw: 0, cycle: 0, pauses: 0, running: false, elapsed: 0, last: 0, raf: 0, phaseIdx: -1, startedAt: 0, lastSecond: -1 };

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function phaseAt(ms) {
    let acc = 0;
    for (let i = 0; i < P.phases.length; i++) {
      const d = P.phases[i].duration * 1000;
      if (ms < acc + d) return { i, t: (ms - acc) / d, left: (acc + d - ms) / 1000 };
      acc += d;
    }
    return { i: P.phases.length - 1, t: 1, left: 0 };
  }

  function paintCycles() {
    ui.$$('i', el.cycles).forEach((d, i) => {
      d.className = i < st.cycle ? 'is-done' : i === st.cycle ? 'is-current' : '';
    });
    el.cycle.textContent = 'Ciclo ' + Math.min(st.cycle + 1, P.cycles) + ' de ' + P.cycles;
  }

  function frame(now) {
    if (!st.running) return;
    st.elapsed += Math.min(100, now - st.last);
    st.last = now;

    if (st.elapsed >= CYCLE_MS) {
      st.elapsed -= CYCLE_MS;
      st.cycle += 1;
      st.raw += S.PER;
      ui.animateNumber(el.score, toPts(st.raw));
      if (st.cycle >= P.cycles) return finish();
      paintCycles();
    }

    const ph = phaseAt(st.elapsed);
    const phase = P.phases[ph.i];
    if (ph.i !== st.phaseIdx) {
      st.phaseIdx = ph.i;
      el.phase.textContent = phase.label;
      el.hint.textContent = phase.hint;
      el.orb.className = 'rg-orb is-' + phase.key;
      ui.$$('span', el.labels).forEach((l, i) => l.classList.toggle('is-on', i === ph.i));
      if (phase.tone) sfx.phase(phase.tone);
    }
    const scale = phase.from + (phase.to - phase.from) * easeInOut(ph.t);
    el.orb.style.setProperty('--s', scale.toFixed(4));
    const secs = Math.max(1, Math.ceil(ph.left));
    if (secs !== st.lastSecond) { st.lastSecond = secs; el.count.textContent = String(secs); }

    // Anillo = progreso total de la sesión; línea de tiempo = progreso del ciclo.
    const total = (st.cycle * CYCLE_MS + st.elapsed) / (P.cycles * CYCLE_MS);
    el.prog.style.strokeDashoffset = String(RING * (1 - total));
    ui.$$('span', el.timeline).forEach((seg, i) => {
      seg.firstChild.style.setProperty('--p', i < ph.i ? 1 : i === ph.i ? ph.t : 0);
    });

    st.raf = requestAnimationFrame(frame);
  }

  function begin() {
    Object.assign(st, { raw: 0, cycle: 0, pauses: 0, elapsed: 0, phaseIdx: -1, lastSecond: -1, startedAt: Date.now() });
    el.score.textContent = '0';
    el.score.dataset.value = '0';
    el.paused.hidden = true;
    el.prog.style.strokeDashoffset = String(RING);
    el.orb.className = 'rg-orb is-rest';
    el.orb.style.setProperty('--s', '0.45');
    paintCycles();
    ui.showScreen('play');
    let n = 3;
    el.phase.textContent = 'Prepárate';
    el.count.textContent = String(n);
    el.hint.textContent = 'Ponte cómodo, hombros relajados';
    const t = setInterval(() => {
      n -= 1;
      if (n > 0) { el.count.textContent = String(n); sfx.tick(); return; }
      clearInterval(t);
      st.running = true;
      st.last = performance.now();
      st.raf = requestAnimationFrame(frame);
    }, 900);
  }

  function pause() {
    if (!st.running) return;
    st.running = false;
    st.pauses += 1;
    cancelAnimationFrame(st.raf);
    el.paused.hidden = false;
    $('btn-resume').focus();
  }

  function resume() {
    el.paused.hidden = true;
    st.running = true;
    st.last = performance.now();
    st.raf = requestAnimationFrame(frame);
    el.pause.focus();
  }

  function finish() {
    st.running = false;
    cancelAnimationFrame(st.raf);
    st.raw += S.ALL;
    if (st.pauses === 0) st.raw += S.NO_PAUSE;
    const points = toPts(st.raw);
    $('st-cycles').textContent = P.cycles + '/' + P.cycles;
    $('st-pauses').textContent = String(st.pauses);
    $('st-pauses').nextElementSibling.textContent = st.pauses === 1 ? 'Pausa' : 'Pausas';
    $('st-time').textContent = ui.formatDuration(Date.now() - st.startedAt);
    $('done-title').textContent = st.pauses === 0 ? '¡Calma total!' : '¡Sesión completada!';
    $('done-text').textContent = st.pauses === 0
      ? 'Cinco ciclos seguidos, sin pausas. Usa esta técnica antes de una tarea de alto riesgo o tras un momento tenso.'
      : 'Completaste los cinco ciclos. Con práctica podrás hacerlos de corrido y ganar la bonificación de concentración.';
    ui.showScreen('done');
    ui.animateNumber($('done-points'), points, 900);
    sfx.win();
  }

  $('btn-start').addEventListener('click', begin);
  el.pause.addEventListener('click', pause);
  $('btn-resume').addEventListener('click', resume);
  $('btn-restart').addEventListener('click', begin);
  $('btn-replay').addEventListener('click', begin);
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' || e.target.closest('button, input')) return;
    if (st.running) { e.preventDefault(); pause(); }
    else if (!el.paused.hidden) { e.preventDefault(); resume(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  $('btn-continue').addEventListener('click', () => {
    journey.next('bienestar', { raw: st.raw, max: MAX_RAW, module: 'respiracion', detail: { cycles: P.cycles, pauses: st.pauses } });
  });
})();
