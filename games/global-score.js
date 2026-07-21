/* ============================================
   ZONA SEGURA · Sistema de puntos globales
   ============================================
   Cada módulo aporta hasta 250 pts normalizados
   (de su puntaje crudo máximo). El total va de
   0 a 1000 (4 módulos × 250).

   Uso:
     - Cargar este script con `defer` antes del script
       del módulo correspondiente.
     - Al terminar el juego, llamar:
         GlobalScore.record('epp', state.score);
       El slug coincide con la clave en MODULES.
     - El badge se monta solo en el header.
   ============================================ */

(() => {
  'use strict';

  const STORAGE_KEY = 'zona-segura-global';
  const PER_MODULE_MAX = 250; // cada módulo aporta 0..250 al global

  // Configuración por módulo. `maxRaw` = puntaje crudo máximo esperado
  // (recalculado en Fase 3 a partir de la lógica real de cada juego):
  //   - epp:         4 áreas × 6 zonas × 10 pts                       = 240
  //   - vocal:       10 ejercicios × (10 + 20 bonus) + 50 bonus final = 350
  //   - respiracion: 5 ciclos × 10 + 20 bonus + 50 bonus sin pausa    = 120
  //   - sena:        6 situaciones (racha perfecta) + 15 ruleta       = 135
  const MODULES = {
    sena:        { maxRaw: 135, label: 'Zona Segura SENA', href: 'zona-segura-sena/index.html', color: '#39A900' },
    epp:         { maxRaw: 240, label: 'Viste al Trabajador', href: 'epp.html', color: '#C9701A' },
    vocal:       { maxRaw: 350, label: 'Vocal Hero',         href: 'vocal-hero.html', color: '#0B7FD6' },
    respiracion: { maxRaw: 120, label: 'Respiración Guiada', href: 'respiracion-guiada.html', color: '#5BA3C7' },
  };

  // ---------- Estado ----------
  function emptyState() {
    const modules = {};
    Object.keys(MODULES).forEach((k) => { modules[k] = { best: 0, last: 0 }; });
    return { modules, total: 0, updated: 0 };
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      // Asegurar forma
      const base = emptyState();
      if (parsed && parsed.modules) {
        Object.keys(MODULES).forEach((k) => {
          if (parsed.modules[k] && typeof parsed.modules[k].best === 'number') {
            base.modules[k] = {
              best: Math.max(0, Math.min(PER_MODULE_MAX, Math.round(parsed.modules[k].best))),
              last: Math.max(0, Math.min(PER_MODULE_MAX, Math.round(parsed.modules[k].last || 0))),
            };
          }
        });
        base.total = Object.values(base.modules).reduce((acc, m) => acc + m.best, 0);
        base.updated = Number(parsed.updated) || 0;
      }
      return base;
    } catch (e) {
      return emptyState();
    }
  }

  function write(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // localStorage no disponible (modo privado, sin espacio, etc.)
    }
  }

  // ---------- API pública ----------
  function normalize(slug, rawScore) {
    const cfg = MODULES[slug];
    if (!cfg) return 0;
    if (typeof rawScore !== 'number' || rawScore <= 0) return 0;
    const ratio = Math.min(1, rawScore / cfg.maxRaw);
    return Math.round(ratio * PER_MODULE_MAX);
  }

  function record(slug, rawScore) {
    const normalized = normalize(slug, rawScore);
    if (normalized <= 0) return { normalized: 0, total: read().total, isNewBest: false };

    const state = read();
    const prev = state.modules[slug].best;
    const isNewBest = normalized > prev;
    state.modules[slug] = { best: isNewBest ? normalized : prev, last: normalized };
    state.total = Object.values(state.modules).reduce((acc, m) => acc + m.best, 0);
    state.updated = Date.now();
    write(state);
    return { normalized, total: state.total, isNewBest };
  }

  function get() {
    return read();
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  }

  // ---------- UI: badge en el header ----------
  function mountBadge() {
    const state = read();

    // EPP, Vocal Hero, Respiración → header.site-header > .site-header__inner
    // SENA → header.welcome__header
    const header =
      document.querySelector('header.site-header .site-header__inner') ||
      document.querySelector('header.welcome__header');

    if (header) injectBadge(header, state);

    // Sección del home (si existe)
    renderHomeSection(state);
  }

  function injectBadge(host, state) {
    // Idempotente: si ya hay un badge, solo actualizamos el número
    let badge = host.querySelector('.global-badge');
    if (!badge) {
      // Durante el recorrido (cualquier etapa que no sea "resultados") el
      // badge NO debe ser una salida al menú principal (Fase 4, Paso 4):
      // se muestra como elemento informativo (<span>), sin href ni navegación.
      const stage = document.body.getAttribute('data-progress-stage');
      const isLockedJourney = !!stage && stage !== 'resultados';

      badge = document.createElement(isLockedJourney ? 'span' : 'a');
      badge.className = 'global-badge' + (isLockedJourney ? ' global-badge--locked' : '');
      badge.title = isLockedJourney
        ? 'Tu puntaje global (disponible al terminar el recorrido)'
        : 'Tu puntaje global';
      if (!isLockedJourney) {
        // href: ir al home (subir niveles según la profundidad)
        const depth = (location.pathname.match(/\/games\//) || location.pathname.match(/\/games\/[^/]+\//)) ? '../index.html' : 'index.html';
        badge.href = depth;
      }
      badge.innerHTML =
        '<span class="global-badge__icon" aria-hidden="true">⭐</span>' +
        '<span class="global-badge__label">Global</span>' +
        '<span class="global-badge__value">0</span>' +
        '<span class="global-badge__max">/1000</span>';
      // Insertar antes del botón "🏠 Home" si existe, o al final
      const homeBtn = host.querySelector('a.btn[href$="index.html"]');
      if (homeBtn && homeBtn !== badge) {
        host.insertBefore(badge, homeBtn);
      } else {
        host.appendChild(badge);
      }
    }
    animateValue(badge.querySelector('.global-badge__value'), state.total, 250);
  }

  function animateValue(el, target, duration = 350) {
    if (!el) return;
    const start = Number(el.textContent) || 0;
    if (start === target) { el.textContent = String(target); return; }
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const val = Math.round(start + (target - start) * eased);
      el.textContent = String(val);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = String(target);
    }
    requestAnimationFrame(step);
  }

  // ---------- UI: mini-sección en el home ----------
  function renderHomeSection(state) {
    const section = document.querySelector('.global-progress');
    if (!section) return;

    const totalEl = section.querySelector('.global-progress__value');
    if (totalEl) {
      // Animar de 0 al total (en el home, casi siempre va a 0 al cargar)
      animateValue(totalEl, state.total, 600);
    }

    const barsHost = section.querySelector('.global-progress__bars');
    if (barsHost) {
      barsHost.innerHTML = '';
      Object.keys(MODULES).forEach((slug) => {
        const cfg = MODULES[slug];
        const m = state.modules[slug] || { best: 0, last: 0 };
        const pct = Math.round((m.best / PER_MODULE_MAX) * 100);

        const row = document.createElement('a');
        row.className = 'gbar';
        row.href = cfg.href;
        row.style.setProperty('--gbar-color', cfg.color);

        row.innerHTML =
          '<span class="gbar__head">' +
            '<span class="gbar__label">' + cfg.label + '</span>' +
            '<span class="gbar__value">' + m.best + '/' + PER_MODULE_MAX + '</span>' +
          '</span>' +
          '<span class="gbar__track">' +
            '<span class="gbar__fill" style="width: 0%"></span>' +
          '</span>';

        barsHost.appendChild(row);

        // Animar la barra de 0 a su valor real tras un tick (CSS transition)
        requestAnimationFrame(() => {
          const fill = row.querySelector('.gbar__fill');
          if (fill) fill.style.width = pct + '%';
        });
      });
    }
  }

  // ---------- Bootstrap ----------
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountBadge);
    } else {
      mountBadge();
    }
  }

  init();

  // Exponer
  window.GlobalScore = {
    STORAGE_KEY,
    MODULES,
    PER_MODULE_MAX,
    record,
    get,
    reset,
    mountBadge,
  };
})();
