/* ==========================================================
   Etapa 1 · Viste al trabajador
   Puntaje crudo: 10 por zona correcta + 10 por oficio perfecto.
   Se juegan 3 oficios al azar de los 4 disponibles.
   Máximo: 3 oficios × (5 × 10 + 10) = 180.
   ========================================================== */
(function () {
  'use strict';
  const { store, ui, data, journey, sfx } = window.ZS;
  if (!journey.mount('epp')) return;

  const AREAS_PER_RUN = 3;
  const AREAS = ui.shuffle(data.EPP_AREAS).slice(0, AREAS_PER_RUN);
  const ZONES = data.BODY_ZONES;
  const ITEMS = data.EPP_ITEMS;
  const PER_ZONE = 10;
  const PERFECT_BONUS = 10;
  const MAX_RAW = AREAS.length * (ZONES.length * PER_ZONE + PERFECT_BONUS);
  const NONE = '__none__';
  const toPts = store.scale('epp', MAX_RAW);

  // Posición de cada punto sobre el personaje (% del ancho/alto de la imagen).
  const SPOTS = {
    cabeza: { x: 50, y: 8 },
    rostro: { x: 50, y: 19 },
    torso: { x: 50, y: 40 },
    manos: { x: 84, y: 52 },
    pies: { x: 40, y: 93 },
  };

  const st = {
    index: 0,
    picks: {},      // zona -> id de EPP o NONE
    checked: false,
    raw: 0,
    correct: 0,
    results: [],    // por oficio: { name, correct, perfect }
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    eyebrow: $('area-eyebrow'), title: $('area-title'), brief: $('area-brief'), photo: $('area-photo'),
    areas: $('areas'), figure: $('figure'), img: $('figure-img'), zones: $('zones'),
    count: $('zones-count'), feedback: $('epp-feedback'), hint: $('actions-hint'),
    check: $('btn-check'), next: $('btn-next'), score: $('hud-score'), correctHud: $('hud-correct'),
  };

  const area = () => AREAS[st.index];
  const filled = () => ZONES.filter((z) => st.picks[z.id]).length;

  function renderAreas() {
    el.areas.innerHTML = AREAS.map((a, i) => {
      const r = st.results[i];
      const cls = i === st.index ? 'is-current' : r ? 'is-done ' + (r.perfect ? 'is-perfect' : 'is-partial') : '';
      const n = r ? (r.perfect ? '✓' : r.correct) : i + 1;
      return '<li class="area-tab ' + cls + '"' + (i === st.index ? ' aria-current="step"' : '') + '><span class="area-tab__n">' + n + '</span>' + ui.esc(a.name) + '</li>';
    }).join('');
  }

  function setFigure(src, dressed) {
    el.img.classList.add('is-swapping');
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      el.img.src = src;
      el.img.alt = dressed ? 'Trabajador de ' + area().name + ' con su EPP completo' : 'Trabajador de ' + area().name + ' sin EPP';
      el.img.classList.remove('is-swapping');
      el.figure.classList.toggle('is-dressed', dressed);
    };
    pre.src = src;
  }

  function renderHotspots() {
    ui.$$('.hotspot', el.figure).forEach((h) => h.remove());
    if (st.checked) return;
    ZONES.forEach((z, i) => {
      const pick = st.picks[z.id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot' + (pick === NONE ? ' is-none' : pick ? ' is-filled' : '');
      b.style.left = SPOTS[z.id].x + '%';
      b.style.top = SPOTS[z.id].y + '%';
      b.setAttribute('aria-label', z.label + ': ' + (pick === NONE ? 'no necesita' : pick ? ITEMS[pick].name : 'sin elegir'));
      b.innerHTML = pick && pick !== NONE ? '<img src="' + ITEMS[pick].img + '" alt="">' : pick === NONE ? '–' : String(i + 1);
      b.addEventListener('click', () => openPicker(z));
      el.figure.appendChild(b);
    });
  }

  function renderZones() {
    const a = area();
    el.zones.innerHTML = '';
    ZONES.forEach((z, i) => {
      const pick = st.picks[z.id];
      const item = pick && pick !== NONE ? ITEMS[pick] : null;
      const answer = a.answer[z.id];
      const ok = st.checked && (pick === NONE ? answer === null : pick === answer);
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zone' + (pick ? ' is-filled' : '') + (st.checked ? (ok ? ' is-ok' : ' is-bad') : '');
      btn.disabled = st.checked;

      let fix = '';
      if (st.checked && !ok) {
        fix = '<p class="zone__fix">Lo correcto: <b>' + (answer ? ui.esc(ITEMS[answer].name) : 'no necesita EPP adicional') + '</b></p>';
      } else if (st.checked && ok && item) {
        fix = '<p class="zone__fix">' + ui.esc(item.why) + '</p>';
      }

      btn.innerHTML =
        '<span class="zone__n">' + (i + 1) + '</span>' +
        '<span class="zone__thumb">' + (item ? '<img src="' + item.img + '" alt="">' : pick === NONE ? '–' : '+') + '</span>' +
        '<span><span class="zone__label">' + ui.esc(z.label) + '</span>' +
          '<span class="zone__value' + (pick ? '' : ' is-empty') + '" style="display:block">' +
            (item ? ui.esc(item.name) : pick === NONE ? 'No necesita EPP' : 'Sin elegir') + '</span>' + fix + '</span>' +
        (st.checked
          ? '<span class="zone__mark" aria-label="' + (ok ? 'Correcto' : 'Incorrecto') + '">' + (ok ? ui.ICONS.check : ui.ICONS.x) + '</span>'
          : '<span class="zone__cta">' + (pick ? 'Cambiar' : 'Elegir') + '</span>');
      btn.addEventListener('click', () => openPicker(z));
      li.appendChild(btn);
      el.zones.appendChild(li);
    });

    const f = filled();
    el.count.textContent = st.checked ? 'Revisión' : f + ' de ' + ZONES.length + ' zonas listas';
    el.check.disabled = f < ZONES.length;
    el.check.hidden = st.checked;
    el.next.hidden = !st.checked;
    el.hint.textContent = st.checked ? '' : f < ZONES.length ? 'Completa las ' + ZONES.length + ' zonas para comprobar.' : '¿Listo? Comprueba tu elección.';
  }

  function openPicker(zone) {
    if (st.checked) return;
    sfx.click();
    const current = st.picks[zone.id];
    const tiles = zone.options.map((id) => {
      const it = ITEMS[id];
      return '<button type="button" class="pick' + (current === id ? ' is-selected' : '') + '" data-pick="' + id + '"><img src="' + it.img + '" alt=""><span>' + ui.esc(it.name) + '</span></button>';
    }).join('') +
      '<button type="button" class="pick pick--none' + (current === NONE ? ' is-selected' : '') + '" data-pick="' + NONE + '"><span aria-hidden="true">∅</span><span>No necesita EPP adicional</span></button>';

    ui.dialog({
      eyebrow: area().name + ' · Zona ' + (ZONES.indexOf(zone) + 1) + ' de ' + ZONES.length,
      title: zone.label,
      sheet: true,
      html: '<div class="picker" role="group" aria-label="Opciones de EPP">' + tiles + '</div>',
      actions: [{ label: 'Cancelar', value: null, variant: 'ghost' }],
      cancelValue: null,
      onOpen(d) {
        d.querySelector('.picker').addEventListener('click', (e) => {
          const b = e.target.closest('[data-pick]');
          if (!b) return;
          st.picks[zone.id] = b.dataset.pick;
          sfx.flip();
          d.close();
          renderZones();
          renderHotspots();
          // Avanza solo a la siguiente zona vacía para agilizar.
          const nextEmpty = ZONES.find((z) => !st.picks[z.id]);
          if (nextEmpty) {
            const row = el.zones.children[ZONES.indexOf(nextEmpty)];
            if (row) row.querySelector('button').focus();
          } else {
            el.check.focus();
          }
        });
      },
    });
  }

  function loadArea() {
    const a = area();
    st.picks = {};
    st.checked = false;
    el.eyebrow.textContent = 'Oficio ' + (st.index + 1) + ' de ' + AREAS.length;
    el.title.textContent = a.name;
    el.brief.textContent = a.brief;
    el.photo.src = (document.documentElement.dataset.base || '') + 'assets/images/fotos/' + a.id + '.webp';
    el.photo.alt = 'Foto de referencia: trabajo de ' + a.name.toLowerCase();
    el.feedback.hidden = true;
    el.figure.classList.remove('is-checked');
    el.next.innerHTML = st.index < AREAS.length - 1 ? 'Siguiente oficio <span aria-hidden="true">→</span>' : 'Ver mi resultado <span aria-hidden="true">→</span>';
    setFigure(a.img, false);
    renderAreas();
    renderZones();
    renderHotspots();
  }

  function check() {
    if (filled() < ZONES.length) return;
    const a = area();
    let correct = 0;
    ZONES.forEach((z) => {
      const pick = st.picks[z.id];
      if (pick === NONE ? a.answer[z.id] === null : pick === a.answer[z.id]) correct += 1;
    });
    const perfect = correct === ZONES.length;
    const before = toPts(st.raw);
    st.raw += correct * PER_ZONE + (perfect ? PERFECT_BONUS : 0);
    const earned = toPts(st.raw) - before;
    st.correct += correct;
    st.results[st.index] = { name: a.name, correct, perfect };
    st.checked = true;

    el.figure.classList.add('is-checked');
    setFigure(a.dressed, true);
    renderAreas();
    renderZones();
    renderHotspots();
    ui.animateNumber(el.score, toPts(st.raw));
    el.correctHud.textContent = st.correct + '/' + AREAS.length * ZONES.length;
    ui.floatPoints(el.check.parentElement, '+' + earned);

    if (perfect) {
      ui.feedback(el.feedback, 'ok', '¡Equipo perfecto! +' + earned + ' pts', 'Incluye bonificación por no fallar ninguna zona. ' + a.tip);
      sfx.correct();
      ui.confetti(el.figure);
    } else {
      ui.feedback(el.feedback, 'bad', correct + ' de ' + ZONES.length + ' zonas correctas · +' + earned + ' pts', a.tip);
      sfx.wrong();
    }
    el.next.focus();
  }

  function next() {
    if (st.index < AREAS.length - 1) {
      st.index += 1;
      loadArea();
      ui.showScreen('play');
    } else {
      finish();
    }
  }

  function finish() {
    const perfect = st.results.filter((r) => r.perfect).length;
    const points = toPts(st.raw);
    $('done-points').textContent = '0';
    $('done-title').textContent = perfect === AREAS.length ? '¡Equipos impecables!' : st.correct >= AREAS.length * ZONES.length * 0.75 ? '¡Buen ojo para el riesgo!' : 'Hay EPP por repasar';
    $('done-text').textContent = 'Acertaste ' + st.correct + ' de ' + AREAS.length * ZONES.length + ' zonas y vestiste perfecto a ' + perfect + ' de ' + AREAS.length + ' compañeros.';
    $('done-areas').innerHTML = st.results.map((r) =>
      '<li><span>' + (r.perfect ? '✅ ' : '🟡 ') + ui.esc(r.name) + '</span><span>' + r.correct + '/' + ZONES.length + '</span></li>'
    ).join('');
    ui.showScreen('done');
    ui.animateNumber($('done-points'), points, 900);
    sfx.win();
    if (perfect >= 2) ui.confetti(null, 70);
  }

  $('btn-start').addEventListener('click', () => { loadArea(); ui.showScreen('play'); });
  el.check.addEventListener('click', check);
  el.next.addEventListener('click', next);
  const result = () => ({
    raw: st.raw, max: MAX_RAW,
    detail: { correct: st.correct, total: AREAS.length * ZONES.length, perfect: st.results.filter((r) => r.perfect).length },
  });
  journey.partial(result);
  $('btn-continue').addEventListener('click', () => journey.next('epp', result()));
})();
