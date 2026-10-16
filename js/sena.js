/* ==========================================================
   Etapa 3 · Retos SST
   Ronda 1 (cinta):   10 por acierto + 5 si es rápido; la situación final vale doble.
                      Máx: 8 × 15 + 30 = 150
   Ronda 2 (memorama): 15 por pareja − 3 por error.  Máx: 6 × 15 = 90
   Ronda 3 (ruleta):  15 por pregunta acertada o reto cumplido. Máx: 3 × 15 = 45
   Total crudo máximo: 285
   ========================================================== */
(function () {
  'use strict';
  const { store, ui, data, journey, sfx } = window.ZS;
  if (!journey.mount('sena')) return;

  const EJES = data.EJES;
  const EJE_IDS = data.OPTIONS;
  const $ = (id) => document.getElementById(id);
  const IMG = (document.documentElement.dataset.base || '') + 'assets/images/';

  const R1 = { COUNT_PER_EJE: 3, PER: 10, FAST: 5, LIVES: 3, BASE_S: 12, MIN_S: 7, STEP_S: 0.6 };
  const R2 = { CONCEPTS: 3, EPP: 3, PER: 15, MISS: 3, LIVES: 6, PREVIEW_S: 5 };
  const R3 = { SPINS: 3, PER: 15, CHALLENGE_S: 20 };
  const MAX = {
    r1: (R1.COUNT_PER_EJE * 3 - 1) * (R1.PER + R1.FAST) + (R1.PER + R1.FAST) * 2,
    r2: (R2.CONCEPTS + R2.EPP) * R2.PER,
    r3: R3.SPINS * R3.PER,
  };
  const MAX_RAW = MAX.r1 + MAX.r2 + MAX.r3;
  const toPts = store.scale('sena', MAX_RAW);

  const results = { r1: null, r2: null, r3: null };
  let active = 'intro';

  function show(name) {
    active = name;
    ui.showScreen(name);
  }

  function pickBalanced(pool, perEje) {
    const out = [];
    EJE_IDS.forEach((e) => out.push(...ui.shuffle(pool.filter((p) => p.eje === e)).slice(0, perEje)));
    return ui.shuffle(out);
  }

  /* ========================================================
     RONDA 1 · CINTA TRANSPORTADORA
     ======================================================== */
  const r1 = { order: [], i: 0, lives: 0, score: 0, correct: 0, streak: 0, best: 0, limit: R1.BASE_S, raf: 0, start: 0, answered: true, card: null, lastTick: 0 };
  const paintR1Lives = ui.lives($('r1-lives'), R1.LIVES);
  const binsHost = $('bins');
  binsHost.innerHTML = EJE_IDS.map((id) => {
    const e = EJES[id];
    return '<button type="button" class="bin" data-eje="' + id + '"><img src="' + e.img + '" alt=""><span>' + ui.esc(e.label) + '</span><kbd class="bin__key" aria-hidden="true">' + e.key + '</kbd></button>';
  }).join('');
  const bins = ui.$$('.bin', binsHost);
  bins.forEach((b) => b.addEventListener('click', () => answerR1(b.dataset.eje)));

  function startR1() {
    Object.assign(r1, { order: pickBalanced(data.SITUATIONS, R1.COUNT_PER_EJE), i: 0, lives: R1.LIVES, score: 0, correct: 0, streak: 0, best: 0, limit: R1.BASE_S });
    paintR1Lives(r1.lives);
    $('r1-score').textContent = '0';
    $('r1-score').dataset.value = '0';
    $('r1-streak').textContent = '0';
    show('r1');
    nextCardR1();
  }

  function nextCardR1() {
    const s = r1.order[r1.i];
    const isFinal = r1.i === r1.order.length - 1;
    $('r1-eyebrow').textContent = 'Ronda 1 · Situación ' + (r1.i + 1) + ' de ' + r1.order.length;
    $('r1-feedback').hidden = true;
    bins.forEach((b) => { b.disabled = false; b.classList.remove('is-right', 'is-wrong', 'is-over'); });
    $('conveyor').classList.remove('is-paused');

    const badge = $('r1-badge');
    badge.hidden = !isFinal;
    badge.className = 'conveyor__badge chip chip--yellow';
    badge.textContent = '★ Situación final · puntos dobles';

    const card = document.createElement('div');
    card.className = 'sit' + (isFinal ? ' is-final' : '');
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', 'Situación ' + (r1.i + 1) + ': ' + s.text + '. Elige un eje con los botones o las teclas 1, 2 y 3.');
    card.innerHTML =
      '<p class="sit__tag"><span>SITUACIÓN ' + (r1.i + 1) + '/' + r1.order.length + '</span><span id="sit-secs"></span></p>' +
      '<p class="sit__text">' + ui.esc(s.text) + '</p>' +
      '<p class="sit__hint">Arrástrala a su eje, tócalo abajo o pulsa 1 · 2 · 3</p>' +
      '<div class="sit__timer" id="sit-timer"><i></i></div>';
    const slot = $('belt-slot');
    slot.innerHTML = '';
    slot.appendChild(card);
    r1.card = card;
    enableDrag(card);

    r1.answered = false;
    r1.start = performance.now();
    r1.lastTick = 0;
    const limitMs = r1.limit * 1000;
    const timer = $('sit-timer');
    const secs = $('sit-secs');
    const loop = (now) => {
      if (r1.answered) return;
      const left = Math.max(0, limitMs - (now - r1.start));
      const ratio = left / limitMs;
      timer.style.setProperty('--p', ratio.toFixed(4));
      timer.classList.toggle('is-warn', ratio < 0.5 && ratio >= 0.25);
      timer.classList.toggle('is-danger', ratio < 0.25);
      const sLeft = Math.ceil(left / 1000);
      secs.textContent = sLeft + ' s';
      if (sLeft <= 3 && sLeft !== r1.lastTick && left > 0) { r1.lastTick = sLeft; sfx.tick(); }
      if (left <= 0) return answerR1(null);
      r1.raf = requestAnimationFrame(loop);
    };
    r1.raf = requestAnimationFrame(loop);
  }

  function enableDrag(card) {
    let drag = null;
    const overBin = (x, y) => bins.find((b) => {
      const r = b.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    card.addEventListener('pointerdown', (e) => {
      if (r1.answered || e.button > 0) return;
      drag = { x: e.clientX, y: e.clientY };
      card.setPointerCapture(e.pointerId);
      card.classList.add('is-dragging');
      card.classList.remove('is-returning');
    });
    card.addEventListener('pointermove', (e) => {
      if (!drag) return;
      card.style.transform = 'translate(' + (e.clientX - drag.x) + 'px,' + (e.clientY - drag.y) + 'px) rotate(' + (e.clientX - drag.x) / 40 + 'deg)';
      const target = overBin(e.clientX, e.clientY);
      bins.forEach((b) => b.classList.toggle('is-over', b === target));
    });
    const end = (e) => {
      if (!drag) return;
      const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
      drag = null;
      card.classList.remove('is-dragging');
      const target = overBin(e.clientX, e.clientY);
      bins.forEach((b) => b.classList.remove('is-over'));
      if (target && moved > 10) {
        answerR1(target.dataset.eje);
      } else {
        card.classList.add('is-returning');
        card.style.transform = '';
      }
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  function answerR1(eje) {
    if (r1.answered) return;
    r1.answered = true;
    cancelAnimationFrame(r1.raf);
    $('conveyor').classList.add('is-paused');
    const s = r1.order[r1.i];
    const isFinal = r1.i === r1.order.length - 1;
    const elapsed = (performance.now() - r1.start) / 1000;
    const ok = eje === s.eje;
    const chosen = bins.find((b) => b.dataset.eje === eje);
    const right = bins.find((b) => b.dataset.eje === s.eje);
    bins.forEach((b) => { b.disabled = true; });
    right.classList.add('is-right');
    r1.card.style.transform = '';
    r1.card.classList.add('is-gone');
    const gone = r1.card;
    setTimeout(() => { if (r1.card === gone && r1.lives > 0) $('belt-slot').innerHTML = '<p class="belt-wait">' + (r1.i < r1.order.length - 1 ? 'Siguiente situación en camino…' : 'Cinta despejada') + '</p>'; }, 420);

    if (ok) {
      const fast = elapsed <= r1.limit / 2;
      const before = toPts(r1.score);
      r1.score += (R1.PER + (fast ? R1.FAST : 0)) * (isFinal ? 2 : 1);
      const pts = toPts(r1.score) - before;
      r1.correct += 1;
      r1.streak += 1;
      r1.best = Math.max(r1.best, r1.streak);
      r1.limit = Math.max(R1.MIN_S, r1.limit - R1.STEP_S);
      ui.animateNumber($('r1-score'), toPts(r1.score));
      ui.floatPoints(right, '+' + pts);
      sfx.correct();
      if (r1.streak >= 3) ui.confetti(right, 16);
      ui.feedback($('r1-feedback'), 'ok', '¡Correcto! ' + EJES[s.eje].label + ' · +' + pts + (fast ? ' (rápido)' : ''), s.why);
    } else {
      r1.streak = 0;
      r1.lives -= 1;
      paintR1Lives(r1.lives, true);
      if (chosen) chosen.classList.add('is-wrong');
      sfx.wrong();
      ui.feedback($('r1-feedback'), 'bad', (eje ? 'Era ' : '¡Se acabó el tiempo! Era ') + EJES[s.eje].label, s.why);
    }
    $('r1-streak').textContent = String(r1.streak);

    setTimeout(() => {
      if (r1.lives <= 0) return gameOverR1();
      if (r1.i < r1.order.length - 1) { r1.i += 1; nextCardR1(); }
      else finishR1();
    }, ok ? 1500 : 2600);
  }

  async function gameOverR1() {
    await ui.dialog({
      eyebrow: 'Ronda 1',
      title: 'Te quedaste sin vidas',
      text: 'Acertaste ' + r1.correct + ' situaciones. Lee con calma: la pista suele estar en quién actúa y para qué. Vuelve a intentarlo con situaciones nuevas.',
      actions: [{ label: 'Reintentar ronda 1', value: true, variant: 'primary' }],
      dismissible: false,
    });
    startR1();
  }

  function finishR1() {
    results.r1 = { raw: r1.score, correct: r1.correct, total: r1.order.length, best: r1.best };
    between({
      eyebrow: 'Ronda 1 completada',
      title: r1.correct === r1.order.length ? '¡Clasificación perfecta!' : '¡Cinta despejada!',
      text: 'Clasificaste bien ' + r1.correct + ' de ' + r1.order.length + ' situaciones.',
      stats: [[toPts(r1.score) + ' pts', 'Ronda 1'], [r1.correct + '/' + r1.order.length, 'Aciertos'], [r1.best + '', 'Mejor racha']],
      next: 'Ir a la ronda 2: Memorama',
      onNext: startR2,
    });
  }

  document.addEventListener('keydown', (e) => {
    if (active !== 'r1' || r1.answered || e.ctrlKey || e.metaKey || e.altKey) return;
    const id = EJE_IDS.find((k) => EJES[k].key === e.key);
    if (id) { e.preventDefault(); answerR1(id); }
  });

  /* ========================================================
     RONDA 2 · MEMORAMA
     ======================================================== */
  const r2 = { cards: [], up: [], pairs: 0, misses: 0, lives: 0, locked: true, timer: 0 };
  const paintR2Lives = ui.lives($('r2-lives'), R2.LIVES);
  const grid = $('memo-grid');

  function buildDeck() {
    const concepts = pickBalanced(data.MEMO_CONCEPTS, 1).slice(0, R2.CONCEPTS).map((c, i) => ({
      pair: 'c' + i, eje: c.eje, label: c.text, why: c.why, title: EJES[c.eje].label,
      face: '<img class="eje-img" src="' + EJES[c.eje].img + '" alt=""><span>' + ui.esc(c.text) + '</span>',
    }));
    const epp = ui.shuffle(data.MEMO_EPP).slice(0, R2.EPP).map((id) => {
      const it = data.EPP_ITEMS[id];
      return { pair: id, label: it.name, why: it.why, title: it.name, face: '<img src="' + it.img + '" alt=""><span>' + ui.esc(it.name) + '</span>' };
    });
    const deck = [];
    concepts.concat(epp).forEach((p) => { deck.push(Object.assign({}, p)); deck.push(Object.assign({}, p)); });
    return ui.shuffle(deck);
  }

  function startR2() {
    clearInterval(r2.timer);
    Object.assign(r2, { cards: buildDeck(), up: [], pairs: 0, misses: 0, lives: R2.LIVES, locked: true });
    paintR2Lives(r2.lives);
    $('r2-pairs').textContent = '0/' + r2.cards.length / 2;
    $('r2-feedback').hidden = true;
    grid.innerHTML = '';
    r2.cards.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'memo is-up';
      b.setAttribute('aria-label', 'Carta ' + (i + 1) + ': ' + c.label);
      b.innerHTML =
        '<span class="memo__inner">' +
          '<span class="memo__face memo__back"><img src="' + IMG + 'logo-sena.png" alt=""></span>' +
          '<span class="memo__face memo__front"' + (c.eje ? ' data-eje="' + c.eje + '"' : '') + '>' + c.face + '</span>' +
        '</span>';
      b.addEventListener('click', () => flip(c, b));
      c.el = b;
      grid.appendChild(b);
    });
    show('r2');

    let left = R2.PREVIEW_S;
    const status = $('r2-status');
    status.textContent = 'Memoriza las cartas… ' + left;
    r2.timer = setInterval(() => {
      left -= 1;
      if (left > 0) { status.textContent = 'Memoriza las cartas… ' + left; if (left <= 2) sfx.tick(); return; }
      clearInterval(r2.timer);
      r2.cards.forEach((c) => c.el.classList.remove('is-up'));
      r2.cards.forEach((c, i) => c.el.setAttribute('aria-label', 'Carta ' + (i + 1) + ' boca abajo'));
      status.textContent = '¡A buscar parejas!';
      sfx.flip();
      r2.locked = false;
    }, 1000);
  }

  function flip(card, btn) {
    if (r2.locked || btn.classList.contains('is-up') || btn.classList.contains('is-matched')) return;
    btn.classList.add('is-up');
    btn.setAttribute('aria-label', card.label);
    sfx.flip();
    r2.up.push(card);
    if (r2.up.length < 2) return;

    r2.locked = true;
    const [a, b] = r2.up;
    r2.up = [];
    if (a.pair === b.pair) {
      r2.pairs += 1;
      [a, b].forEach((c) => { c.el.classList.add('is-matched'); c.el.setAttribute('aria-label', c.label + ' (pareja encontrada)'); });
      $('r2-pairs').textContent = r2.pairs + '/' + r2.cards.length / 2;
      ui.feedback($('r2-feedback'), 'ok', '¡Pareja! ' + a.title, a.why);
      ui.floatPoints(b.el, '+' + toPts(R2.PER));
      sfx.correct();
      r2.locked = false;
      if (r2.pairs === r2.cards.length / 2) setTimeout(finishR2, 900);
    } else {
      r2.misses += 1;
      r2.lives -= 1;
      paintR2Lives(r2.lives, true);
      [a, b].forEach((c) => c.el.classList.add('is-miss'));
      sfx.wrong();
      setTimeout(() => {
        [a, b].forEach((c) => { c.el.classList.remove('is-up', 'is-miss'); c.el.setAttribute('aria-label', 'Carta boca abajo'); });
        if (r2.lives <= 0) return penaltyR2();
        r2.locked = false;
      }, 900);
    }
  }

  async function penaltyR2() {
    const challenge = data.CHALLENGES[Math.floor(Math.random() * data.CHALLENGES.length)];
    await ui.dialog({
      eyebrow: 'Ronda 2 · Sin intentos',
      title: 'Reto de penitencia',
      html: '<p>Antes de volver a intentarlo, cumple este reto en voz alta:</p><p class="h3" style="margin-top:14px;color:var(--text)">«' + ui.esc(challenge) + '»</p>',
      actions: [{ label: '¡Reto cumplido! Repartir de nuevo', value: true, variant: 'primary' }],
      dismissible: false,
    });
    startR2();
  }

  function finishR2() {
    const raw = Math.max(0, r2.pairs * R2.PER - r2.misses * R2.MISS);
    results.r2 = { raw, pairs: r2.pairs, misses: r2.misses };
    between({
      eyebrow: 'Ronda 2 completada',
      title: r2.misses === 0 ? '¡Memoria de acero!' : '¡Todas las parejas!',
      text: 'Encontraste las ' + r2.pairs + ' parejas con ' + ui.plural(r2.misses, 'error', 'errores') + '.',
      stats: [[toPts(raw) + ' pts', 'Ronda 2'], [r2.pairs + '', 'Parejas'], [r2.misses + '', r2.misses === 1 ? 'Error' : 'Errores']],
      next: 'Ir a la ronda 3: Ruleta',
      onNext: startR3,
    });
  }

  /* ========================================================
     RONDA 3 · RULETA
     ======================================================== */
  const SLICES = ['pregunta', 'reto', 'pregunta', 'pregunta', 'reto', 'pregunta'];
  const SLICE_COLORS = { pregunta: ['#39a900', '#2f8c00'], reto: ['#ffc400', '#f0b400'] };
  const r3 = { spin: 0, score: 0, rot: 0, log: [], questions: [], busy: false, timer: 0 };
  const wheel = $('wheel');
  const panel = $('r3-panel');

  (function drawWheel() {
    const c = 150, r = 150, n = SLICES.length, a = (2 * Math.PI) / n;
    let svg = '';
    SLICES.forEach((kind, i) => {
      const s = i * a - Math.PI / 2, e = s + a;
      const x1 = c + r * Math.cos(s), y1 = c + r * Math.sin(s), x2 = c + r * Math.cos(e), y2 = c + r * Math.sin(e);
      const fill = SLICE_COLORS[kind][i % 2];
      svg += '<path d="M' + c + ',' + c + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 0,1 ' + x2 + ',' + y2 + ' Z" fill="' + fill + '" stroke="#12161b" stroke-width="2"/>';
      const mid = s + a / 2, lx = c + r * 0.66 * Math.cos(mid), ly = c + r * 0.66 * Math.sin(mid);
      const deg = (mid * 180) / Math.PI + 90;
      svg += '<text x="' + lx + '" y="' + ly + '" fill="#12161b" font-family="Archivo, sans-serif" font-weight="900" font-size="15" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + deg + ' ' + lx + ' ' + ly + ')">' + (kind === 'pregunta' ? 'PREGUNTA' : 'RETO') + '</text>';
    });
    wheel.innerHTML = svg;
  })();

  function spinsDots() {
    return '<div class="spins" aria-label="Giro ' + Math.min(r3.spin + 1, R3.SPINS) + ' de ' + R3.SPINS + '">' +
      Array.from({ length: R3.SPINS }, (_, i) => '<i class="' + (i < r3.spin ? 'is-done' : i === r3.spin ? 'is-current' : '') + '"></i>').join('') + '</div>';
  }

  function startR3() {
    Object.assign(r3, { spin: 0, score: 0, log: [], questions: ui.shuffle(data.QUESTIONS), busy: false });
    $('r3-score').textContent = '0';
    $('r3-score').dataset.value = '0';
    show('r3');
    readyToSpin();
  }

  function readyToSpin() {
    panel.innerHTML =
      '<span class="eyebrow">Giro ' + (r3.spin + 1) + ' de ' + R3.SPINS + '</span>' + spinsDots() +
      '<h2 class="h2">¿Pregunta o reto?</h2>' +
      '<p class="muted" style="margin:8px 0 22px">Las preguntas y los retos valen ' + toPts(R3.PER) + ' puntos cada uno. La suerte no te quita puntos: tu respuesta sí.</p>' +
      '<button class="btn btn--primary btn--lg" type="button" id="btn-spin">Girar la ruleta</button>';
    $('btn-spin').addEventListener('click', spin);
    $('btn-spin').focus();
  }

  function spin() {
    if (r3.busy) return;
    r3.busy = true;
    const btn = $('btn-spin');
    btn.disabled = true;
    btn.textContent = 'Girando…';
    const idx = Math.floor(Math.random() * SLICES.length);
    const sliceDeg = 360 / SLICES.length;
    const target = (360 - (idx * sliceDeg + sliceDeg / 2)) % 360;
    const current = ((r3.rot % 360) + 360) % 360;
    const reduced = ui.reducedMotion();
    r3.rot += (reduced ? 0 : 360 * 5) + ((target - current + 360) % 360);
    wheel.style.transform = 'rotate(' + r3.rot + 'deg)';
    // Clics que se espacian como la desaceleración real de la ruleta.
    if (!reduced) for (let k = 1; k <= 26; k++) setTimeout(sfx.tick, (1 - Math.pow(1 - k / 26, 1 / 3)) * 3800);
    setTimeout(() => {
      r3.busy = false;
      if (SLICES[idx] === 'pregunta') askQuestion();
      else challenge();
    }, reduced ? 300 : 4100);
  }

  function askQuestion() {
    const q = r3.questions.pop();
    panel.innerHTML =
      '<span class="chip chip--green">Pregunta · Giro ' + (r3.spin + 1) + '</span>' +
      '<h2 class="h3" style="margin-top:14px;font-size:20px;line-height:1.35">' + ui.esc(q.q) + '</h2>' +
      '<div class="answer-opts">' + EJE_IDS.map((id, i) =>
        '<button type="button" class="answer-opt" data-eje="' + id + '"><img src="' + EJES[id].img + '" alt=""><span>' + (i + 1) + '. ' + ui.esc(EJES[id].label) + '</span></button>').join('') +
      '</div><div class="r-feedback" id="r3-feedback" hidden></div>';
    const opts = ui.$$('.answer-opt', panel);
    opts[0].focus();
    opts.forEach((o) => o.addEventListener('click', () => {
      const ok = o.dataset.eje === q.a;
      opts.forEach((x) => { x.disabled = true; if (x.dataset.eje === q.a) x.classList.add('is-right'); });
      if (!ok) o.classList.add('is-wrong');
      const pts = ok ? R3.PER : 0;
      r3.log.push({ kind: 'pregunta', ok });
      award(pts, o);
      ui.feedback($('r3-feedback'), ok ? 'ok' : 'bad', ok ? '¡Correcto! +' + toPts(pts) + ' pts' : 'Era ' + EJES[q.a].label, q.why);
      nextSpinButton();
    }));
  }

  function challenge() {
    const text = data.CHALLENGES[Math.floor(Math.random() * data.CHALLENGES.length)];
    let left = R3.CHALLENGE_S;
    panel.innerHTML =
      '<span class="chip chip--yellow">Reto en vivo · Giro ' + (r3.spin + 1) + '</span>' +
      '<h2 class="h3" style="margin-top:14px;font-size:21px;line-height:1.35">' + ui.esc(text) + '</h2>' +
      '<p class="challenge-timer" id="ch-timer" aria-live="off">' + left + '</p>' +
      '<p class="muted" style="margin-bottom:18px">Tienes ' + R3.CHALLENGE_S + ' segundos. Tu grupo es testigo 😉</p>' +
      '<div class="actions"><button class="btn btn--primary" type="button" id="ch-done">¡Lo cumplí!</button><button class="btn btn--ghost" type="button" id="ch-skip">No pude</button></div>' +
      '<div class="r-feedback" id="r3-feedback" hidden></div>';
    $('ch-done').focus();
    clearInterval(r3.timer);
    r3.timer = setInterval(() => {
      left -= 1;
      const t = $('ch-timer');
      if (t) t.textContent = String(Math.max(0, left));
      if (left <= 3 && left > 0) sfx.tick();
      if (left <= 0) clearInterval(r3.timer);
    }, 1000);
    const resolve = (ok) => {
      clearInterval(r3.timer);
      $('ch-done').disabled = true;
      $('ch-skip').disabled = true;
      r3.log.push({ kind: 'reto', ok });
      award(ok ? R3.PER : 0, $('ch-done'));
      ui.feedback($('r3-feedback'), ok ? 'ok' : 'info', ok ? '¡Reto cumplido! +' + toPts(R3.PER) + ' pts' : 'Será en la próxima', ok ? 'Participar en voz alta también es parte de la cultura de seguridad.' : 'Practicar estos retos con tu equipo refuerza lo aprendido.');
      nextSpinButton();
    };
    $('ch-done').addEventListener('click', () => resolve(true));
    $('ch-skip').addEventListener('click', () => resolve(false));
  }

  function award(pts, anchor) {
    if (pts > 0) {
      r3.score += pts;
      ui.animateNumber($('r3-score'), toPts(r3.score));
      ui.floatPoints(anchor, '+' + toPts(pts));
      sfx.correct();
    } else {
      sfx.wrong();
    }
  }

  function nextSpinButton() {
    r3.spin += 1;
    const last = r3.spin >= R3.SPINS;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--dark';
    b.style.marginTop = '18px';
    b.innerHTML = last ? 'Ver resumen de la etapa <span aria-hidden="true">→</span>' : 'Siguiente giro <span aria-hidden="true">→</span>';
    b.addEventListener('click', () => (last ? finishAll() : readyToSpin()));
    panel.appendChild(b);
    b.focus();
  }

  /* ========================================================
     ENTRE RONDAS Y CIERRE
     ======================================================== */
  function between(o) {
    $('bt-eyebrow').textContent = o.eyebrow;
    $('bt-title').textContent = o.title;
    $('bt-text').textContent = o.text;
    $('bt-stats').innerHTML = o.stats.map((s) => '<div class="stat"><div class="stat__value">' + ui.esc(s[0]) + '</div><div class="stat__label">' + ui.esc(s[1]) + '</div></div>').join('');
    const next = $('bt-next');
    next.innerHTML = ui.esc(o.next) + ' <span aria-hidden="true">→</span>';
    next.onclick = o.onNext;
    show('between');
    sfx.win();
  }

  let final = null;
  function finishAll() {
    results.r3 = { raw: r3.score, log: r3.log };
    const raw = results.r1.raw + results.r2.raw + results.r3.raw;
    const points = toPts(raw);
    const qOk = r3.log.filter((l) => l.ok).length;
    $('done-title').textContent = raw >= MAX_RAW * 0.8 ? '¡Experto en SST!' : raw >= MAX_RAW * 0.5 ? '¡Retos superados!' : 'Retos completados';
    $('done-rounds').innerHTML = [
      ['Ronda 1 · Cinta transportadora', results.r1.correct + ' de ' + results.r1.total + ' aciertos · racha máx. ' + results.r1.best, results.r1.raw, MAX.r1],
      ['Ronda 2 · Memorama', results.r2.pairs + ' parejas · ' + ui.plural(results.r2.misses, 'error', 'errores'), results.r2.raw, MAX.r2],
      ['Ronda 3 · Ruleta', qOk + ' de ' + R3.SPINS + ' giros superados', results.r3.raw, MAX.r3],
    ].map((r) => '<li><b>' + r[0] + '</b><span class="pts">' + toPts(r[2]) + '/' + toPts(r[3]) + '</span><small>' + ui.esc(r[1]) + '</small></li>').join('');
    final = { raw, max: MAX_RAW, detail: { r1: results.r1, r2: results.r2, r3: { raw: results.r3.raw, ok: qOk } } };
    show('done');
    ui.animateNumber($('done-points'), points, 900);
    sfx.win();
    if (raw >= MAX_RAW * 0.8) ui.confetti(null, 80);
  }

  $('btn-start').addEventListener('click', startR1);
  $('btn-continue').addEventListener('click', () => journey.next('sena', final));
})();
