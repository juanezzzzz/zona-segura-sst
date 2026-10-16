/* Etapa 4 · Resultados finales */
(function () {
  'use strict';
  const { store, ui, journey, sfx } = window.ZS;
  if (!journey.mount('resultados')) return;

  // Se registra en el historial solo la primera vez que se llega aquí.
  const before = store.get();
  if (!before.done.resultados) {
    store.completeStage('resultados');
    const s = store.get();
    store.history.add({
      name: s.player.name, role: s.player.role,
      points: store.totalPoints(s), durationMs: store.elapsedMs(s), date: new Date().toISOString(),
    });
  }

  const s = store.get();
  const total = store.totalPoints(s);
  const max = store.MAX_POINTS;
  const elapsed = store.elapsedMs(s);
  const name = s.player ? s.player.name : 'Participante';
  const first = name.split(' ')[0];
  const res = s.results;
  const $ = (id) => document.getElementById(id);

  // ---------- Nivel ----------
  const pct = total / max;
  const level = pct >= 0.9 ? 'Experto SST' : pct >= 0.75 ? 'Oro' : pct >= 0.5 ? 'Plata' : 'Bronce';
  $('level').textContent = level;
  $('res-title').textContent = pct >= 0.75 ? '¡Excelente, ' + first + '!' : pct >= 0.5 ? '¡Bien hecho, ' + first + '!' : '¡Recorrido completo, ' + first + '!';
  $('res-text').textContent = pct >= 0.75
    ? 'Demostraste criterio para reconocer riesgos, elegir el EPP correcto y cuidar tu bienestar. Comparte lo aprendido con tu equipo.'
    : 'Ya conoces los tres ejes de la SST. Repasa los EPP y las situaciones donde dudaste: la seguridad se construye con práctica.';
  $('time').textContent = ui.formatDuration(elapsed);

  // ---------- Medidor ----------
  const R = 2 * Math.PI * 84;
  const prog = $('gauge-prog');
  prog.style.strokeDasharray = R;
  prog.style.strokeDashoffset = R;
  requestAnimationFrame(() => requestAnimationFrame(() => { prog.style.strokeDashoffset = String(R * (1 - pct)); }));
  ui.animateNumber($('total'), total, 1600);

  // ---------- Desglose ----------
  const bienestar = res.bienestar || {};
  const rows = [
    { id: 'epp', label: 'Viste al trabajador', sub: res.epp && res.epp.detail ? res.epp.detail.correct + ' de ' + res.epp.detail.total + ' zonas correctas' : '' },
    { id: 'bienestar', label: bienestar.module === 'vocal' ? 'Bienestar · Vocal Hero' : 'Bienestar · Respiración guiada',
      sub: bienestar.detail ? (bienestar.module === 'vocal' ? bienestar.detail.completed + ' de ' + bienestar.detail.total + ' ejercicios' : bienestar.detail.cycles + ' ciclos · ' + ui.plural(bienestar.detail.pauses, 'pausa', 'pausas')) : '' },
    { id: 'sena', label: 'Retos SST', sub: res.sena && res.sena.detail ? 'Cinta ' + res.sena.detail.r1.correct + '/' + res.sena.detail.r1.total + ' · Memorama ' + ui.plural(res.sena.detail.r2.misses, 'error', 'errores') + ' · Ruleta ' + res.sena.detail.r3.ok + '/3' : '' },
  ];
  $('breakdown').innerHTML = rows.map((r) => {
    const weight = store.STAGES[store.stageIndex(r.id)].weight;
    const pts = store.stagePoints(r.id, s);
    return '<li><div class="breakdown__head"><span>' + ui.esc(r.label) + '<small>' + ui.esc(r.sub) + '</small></span><span class="breakdown__pts">' + pts + ' / ' + weight + '</span></div>' +
      '<div class="meter"><div class="meter__fill" data-p="' + (pts / weight).toFixed(3) + '"></div></div></li>';
  }).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => ui.$$('.meter__fill', $('breakdown')).forEach((f) => ui.setMeter(f, Number(f.dataset.p)))));

  // ---------- Logros ----------
  const ratio = (id) => (res[id] && res[id].max ? res[id].raw / res[id].max : 0);
  const d = (id) => (res[id] && res[id].detail) || {};
  const ACH = [
    { icon: '🏁', label: 'Recorrido completo', desc: 'Terminaste las 4 etapas.', on: true },
    { icon: '🦺', label: 'Ojo de inspector', desc: 'Vestiste perfecto a 3 o más trabajadores.', on: (d('epp').perfect || 0) >= 3 },
    { icon: bienestar.module === 'vocal' ? '🎤' : '🌿', label: bienestar.module === 'vocal' ? 'Voz de líder' : 'Calma total', desc: bienestar.module === 'vocal' ? 'Completaste la rutina vocal entera.' : 'Respiraste 5 ciclos sin pausar.', on: ratio('bienestar') >= 0.99 || (bienestar.module === 'vocal' && d('bienestar').completed === d('bienestar').total) },
    { icon: '🎯', label: 'Clasificador experto', desc: 'Cinta sin un solo error.', on: !!(d('sena').r1 && d('sena').r1.correct === d('sena').r1.total) },
    { icon: '🧠', label: 'Memoria de acero', desc: 'Memorama sin errores.', on: !!(d('sena').r2 && d('sena').r2.misses === 0) },
    { icon: '🌟', label: 'Sobresaliente', desc: '800 puntos o más.', on: total >= 800 },
    { icon: '⚡', label: 'A buen ritmo', desc: 'Recorrido en menos de 12 minutos.', on: elapsed > 0 && elapsed < 12 * 60 * 1000 },
  ];
  $('achievements').innerHTML = ACH.map((a) =>
    '<div class="ach' + (a.on ? ' is-on' : '') + '"><div class="ach__icon" aria-hidden="true">' + a.icon + '</div><b>' + ui.esc(a.label) + '</b><small>' + ui.esc(a.desc) + '</small>' +
    '<span class="sr-only">' + (a.on ? 'Desbloqueado' : 'Bloqueado') + '</span></div>').join('');
  $('ach-count').textContent = ACH.filter((a) => a.on).length + '/' + ACH.length;

  // ---------- Certificado ----------
  $('cert-name').textContent = name;
  $('cert-role').textContent = s.player ? s.player.role : '';
  $('cert-score').textContent = total + ' / ' + max + ' puntos · Nivel ' + level;
  $('cert-date').textContent = new Date(s.finishedAt || Date.now()).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  $('btn-print').addEventListener('click', () => window.print());

  // ---------- Ranking local ----------
  const hist = store.history.list();
  const mine = hist[hist.length - 1];
  const top = hist.slice().sort((a, b) => b.points - a.points || a.durationMs - b.durationMs).slice(0, 5);
  $('ranking').innerHTML = top.map((h, i) =>
    '<li class="' + (h === mine ? 'is-me' : '') + '"><span class="pos">' + (i + 1) + '</span><span class="who">' + ui.esc(h.name) + '<small>' + ui.esc(h.role) + '</small></span><span class="pts">' + h.points + '</span></li>'
  ).join('');
  const myPos = hist.slice().sort((a, b) => b.points - a.points || a.durationMs - b.durationMs).indexOf(mine) + 1;
  $('rank-meta').textContent = hist.length + (hist.length === 1 ? ' participante' : ' participantes') + ' en este equipo' + (myPos > 5 ? ' · tu puesto: ' + myPos : '');

  // ---------- Siguiente participante ----------
  $('btn-new').addEventListener('click', async () => {
    const ok = await ui.dialog({
      eyebrow: 'Siguiente participante',
      title: '¿Reiniciar el recorrido?',
      text: 'Se borrará el avance de ' + name + '. Su puntaje queda guardado en el ranking de este equipo.',
      actions: [{ label: 'Cancelar', value: false, variant: 'ghost' }, { label: 'Sí, reiniciar', value: true, variant: 'primary' }],
      cancelValue: false,
    });
    if (!ok) return;
    store.reset();
    window.location.href = journey.href('introduccion.html');
  });

  sfx.win();
  if (pct >= 0.75) setTimeout(() => ui.confetti(null, 90), 600);
})();
