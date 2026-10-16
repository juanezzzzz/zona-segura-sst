/* Página de inicio: cinta demostrativa + estado del recorrido */
(function () {
  'use strict';
  const { store, ui, data, journey } = window.ZS;

  // ---------- Cinta: tarjetas reales del banco de situaciones ----------
  const host = document.getElementById('belt-items');
  const sample = ui.shuffle(data.SITUATIONS).slice(0, 8);
  const cards = sample
    .map((s) => '<div class="belt__card" data-eje="' + s.eje + '"><b>' + ui.esc(data.EJES[s.eje].label) + '</b>' + ui.esc(s.text) + '</div>')
    .join('');
  host.innerHTML = cards + cards; // duplicado para el bucle continuo

  // ---------- Navegación fija: borde y botón al bajar ----------
  const nav = document.querySelector('.home-nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 280);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Podio del equipo (solo si ya hay participantes) ----------
  const hist = store.history.list();
  if (hist.length) {
    const top = hist.slice().sort((a, b) => b.points - a.points || a.durationMs - b.durationMs).slice(0, 3);
    document.getElementById('podio').innerHTML = top.map((h, i) =>
      '<li><span class="pos">' + (i + 1) + '</span><span class="who">' + ui.esc(h.name) + '<small>' + ui.esc(h.role || '') + ' · ' + ui.formatDuration(h.durationMs || 0) + '</small></span><span class="pts">' + h.points + '</span></li>'
    ).join('');
    document.getElementById('podio-meta').textContent = ui.plural(hist.length, 'participante ha', 'participantes han') + ' completado el recorrido en este equipo. ¿Puedes superarlos?';
    document.getElementById('podio-wrap').hidden = false;
  }

  // ---------- Recorrido en curso ----------
  const s = store.get();
  if (!s.player) return;

  const cur = store.currentStage(s);
  const finished = !!s.done.resultados;
  const main = document.getElementById('cta-main');
  const reset = document.getElementById('cta-reset');
  const resume = document.getElementById('hero-resume');
  const target = journey.href(cur.href);

  main.href = target;
  main.innerHTML = (finished ? 'Ver mis resultados' : 'Continuar recorrido') + ' <span aria-hidden="true">→</span>';
  ui.$$('.js-cta').forEach((a) => {
    a.href = target;
    a.firstChild.textContent = a.classList.contains('home-nav__cta') ? (finished ? 'Resultados' : 'Continuar') : finished ? 'Ver mis resultados ' : 'Continuar recorrido ';
  });
  reset.hidden = false;

  const name = s.player.name;
  resume.hidden = false;
  resume.innerHTML =
    '<span class="avatar" aria-hidden="true">' + ui.esc(name.charAt(0).toUpperCase()) + '</span>' +
    '<span><b>' + ui.esc(name) + '</b> · ' +
    (finished ? 'recorrido terminado con ' + store.totalPoints(s) + ' pts' : 'va en la etapa ' + (store.stageIndex(cur.id) + 1) + ': ' + ui.esc(cur.label)) +
    '</span>';

  reset.addEventListener('click', async () => {
    const ok = await ui.dialog({
      eyebrow: 'Nuevo participante',
      title: '¿Empezar desde cero?',
      text: 'Se borrará el avance de ' + name + ' en este equipo. El historial de puntajes se conserva.',
      actions: [
        { label: 'Cancelar', value: false, variant: 'ghost' },
        { label: 'Sí, empezar de nuevo', value: true, variant: 'primary' },
      ],
      cancelValue: false,
    });
    if (ok) {
      store.reset();
      window.location.href = journey.href('introduccion.html');
    }
  });
})();
