/* ============================================
   EPP - Viste al Trabajador
   Módulo independiente (extraído del SENA).
   ============================================ */

(() => {
  'use strict';

  // ==========================================
  // Catálogo de EPP
  // Cada EPP tiene:
  //   - id:          identificador interno
  //   - nombre:      etiqueta visible en el catálogo
  //   - emoji:       ícono decorativo
  //   - explicacion: texto didáctico (tooltip / feedback)
  //   - icon:        SVG del botón de catálogo (caja de la derecha)
  //   - img:         (opcional) imagen PNG del EPP real para colocarlo en el slot
  //
  // Los EPPs correctos se asignan por zona del cuerpo en EPP_AREAS.
  // El catálogo incluye también EPPs "incorrectos" (mezcla) para que
  // la persona pueda equivocarse al elegirlos. Los EPPs sin `.img` (PNG
  // real) no aparecen en el panel de equipamiento (ver SLOT_CATALOG).
  // ==========================================
  const ASSET_BASE = '../assets/images/epps';

  const EPP_ITEMS = [
    // ---------- CABEZA ----------
    {
      id: 'casco', nombre: 'Casco de seguridad', emoji: '🪖',
      explicacion: 'El casco protege la cabeza de golpes e impactos al operar maquinaria pesada.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 26C6 15 12 8 20 8C28 8 34 15 34 26H6Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 26H36" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M20 8V4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/maquinaria/casco.png`
    },
    {
      id: 'gorro', nombre: 'Gorro', emoji: '🧢',
      explicacion: 'Cubre el cabello para evitar que caiga en los alimentos o se enrede con máquinas.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 22C8 14 13 8 20 8C27 8 32 14 32 22H8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 22H34V26H6V22Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
      img: `${ASSET_BASE}/cocina/gorro.png`
    },
    {
      id: 'gorra', nombre: 'Gorra', emoji: '🧢',
      explicacion: 'Protege la cabeza del sol en trabajos al aire libre como la ganadería.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 22C8 14 13 8 20 8C27 8 32 14 32 22H8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 22H34V26H6V22Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M32 22H38" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/ganaderia/gorra.png`
    },
    // ---------- CARA / OJOS / OÍDOS / NARIZ ----------
    {
      id: 'gafas', nombre: 'Gafas de seguridad', emoji: '🥽',
      explicacion: 'Las gafas protegen los ojos de partículas, chispas o químicos.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="20" r="7" stroke="currentColor" stroke-width="2.2"/><circle cx="28" cy="20" r="7" stroke="currentColor" stroke-width="2.2"/><path d="M19 20H21" stroke="currentColor" stroke-width="2.2"/><path d="M5 17L2 14M35 17L38 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/ganaderia/gafas.png`
    },
    {
      id: 'tapones', nombre: 'Protección auditiva', emoji: '🎧',
      explicacion: 'Reduce el daño por exposición a ruido excesivo en máquinas.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 20C10 12 14 6 20 6C26 6 30 12 30 20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5" y="20" width="8" height="12" rx="4" stroke="currentColor" stroke-width="2.2"/><rect x="27" y="20" width="8" height="12" rx="4" stroke="currentColor" stroke-width="2.2"/></svg>',
      img: `${ASSET_BASE}/soldadura/proteccion_auditiva.png`
    },
    {
      id: 'careta_soldadura', nombre: 'Careta de soldadura', emoji: '🥷',
      explicacion: 'Protege todo el rostro de chispas, luz ultravioleta y calor al soldar.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10H32L34 16V30C34 32 32 34 30 34H10C8 34 6 32 6 30V16L8 10Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><rect x="11" y="17" width="18" height="9" rx="2" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="2"/><path d="M14 10V6H26V10" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
      img: `${ASSET_BASE}/soldadura/careta.png`
    },
    {
      id: 'tapabocas', nombre: 'Protección respiratoria', emoji: '😷',
      explicacion: 'Filtra el polvo, vapores u otros agentes suspendidos en el aire.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 17C7 14 9 12 12 12H28C31 12 33 14 33 17V21C33 25 27 29 20 29C13 29 7 25 7 21V17Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M7 19H33" stroke="currentColor" stroke-width="1.6"/><path d="M4 15L7 17M36 15L33 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/cocina/tapabocas.png`
    },
    {
      id: 'respirador', nombre: 'Respirador media cara', emoji: '😮‍💨',
      explicacion: 'Filtra vapores y partículas finas más peligrosas que un tapabocas simple.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 16C8 12 13 9 20 9C27 9 32 12 32 16V22C32 27 27 31 20 31C13 31 8 27 8 22V16Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="14.5" cy="19" r="3.6" stroke="currentColor" stroke-width="2"/><circle cx="25.5" cy="19" r="3.6" stroke="currentColor" stroke-width="2"/><path d="M5 15L8 17M35 15L32 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
    },
    {
      id: 'protector_facial', nombre: 'Protector facial', emoji: '🛡️',
      explicacion: 'Lámina transparente que cubre todo el rostro de partículas o salpicaduras.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12C9 9 13 7 20 7C27 7 31 9 31 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M11 12H29L27 29C26.5 31 24 33 20 33C16 33 13.5 31 13 29L11 12Z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>'
    },
    // ---------- MANOS ----------
    {
      id: 'guantes', nombre: 'Guantes de seguridad', emoji: '🧤',
      explicacion: 'Los guantes protegen las manos al manipular herramientas o materiales.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 18V9.5C13 8 14 7 15.3 7C16.6 7 17.6 8 17.6 9.5V17M17.6 17V7.5C17.6 6 18.6 5 19.9 5C21.2 5 22.2 6 22.2 7.5V17M22.2 17V8C22.2 6.5 23.2 5.5 24.5 5.5C25.8 5.5 26.8 6.5 26.8 8V19M26.8 17.5C26.8 16.2 27.8 15.3 29 15.3C30.3 15.3 31.2 16.3 31.2 17.6V27C31.2 32 27.5 35 22.5 35H19C15 35 12 32.5 10.5 28.5L8 21.5C7.5 20 8.3 18.4 9.8 18C11.2 17.6 12.7 18.4 13.1 19.8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
      img: `${ASSET_BASE}/ganaderia/guantes.png`
    },
    {
      id: 'guantes_soldador', nombre: 'Guantes de cuero', emoji: '🧤',
      explicacion: 'Guantes largos y resistentes que protegen manos y antebrazos del calor, chispas o superficies ásperas.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 20V8C12 6.5 13.2 5.3 14.7 5.3C16.2 5.3 17.4 6.5 17.4 8V17M17.4 17V6.3C17.4 4.8 18.6 3.6 20.1 3.6C21.6 3.6 22.8 4.8 22.8 6.3V17M22.8 17V7C22.8 5.5 24 4.3 25.5 4.3C27 4.3 28.2 5.5 28.2 7V19" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 19C9 17 10.7 15.7 12.4 16.3L28.2 18.5C30 18.8 31 20.3 31 22V26C31 32 26.5 36 20.5 36C15.5 36 11.5 33 9.5 27L7 20.5C6.5 19 7.4 17.4 9 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="7" y="27" width="27" height="7" rx="3" stroke="currentColor" stroke-width="2"/></svg>',
      img: `${ASSET_BASE}/soldadura/guantes.png`
    },
    {
      id: 'guantes_nitrilo', nombre: 'Guantes de nitrilo', emoji: '🧤',
      explicacion: 'Guantes finos e impermeables, ideales para manipular alimentos sin contaminarlos.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 18V9.5C13 8 14 7 15.3 7C16.6 7 17.6 8 17.6 9.5V17M17.6 17V7.5C17.6 6 18.6 5 19.9 5C21.2 5 22.2 6 22.2 7.5V17M22.2 17V8C22.2 6.5 23.2 5.5 24.5 5.5C25.8 5.5 26.8 6.5 26.8 8V19M26.8 17.5C26.8 16.2 27.8 15.3 29 15.3C30.3 15.3 31.2 16.3 31.2 17.6V27C31.2 32 27.5 35 22.5 35H19C15 35 12 32.5 10.5 28.5L8 21.5C7.5 20 8.3 18.4 9.8 18C11.2 17.6 12.7 18.4 13.1 19.8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
      img: `${ASSET_BASE}/cocina/guantes_nitrilo.png`
    },
    {
      id: 'guantes_carnaza', nombre: 'Guantes de carnaza', emoji: '🧤',
      explicacion: 'Guantes resistentes de cuero para manipular objetos ásperos, pesados o cortantes.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 18V9.5C13 8 14 7 15.3 7C16.6 7 17.6 8 17.6 9.5V17M17.6 17V7.5C17.6 6 18.6 5 19.9 5C21.2 5 22.2 6 22.2 7.5V17M22.2 17V8C22.2 6.5 23.2 5.5 24.5 5.5C25.8 5.5 26.8 6.5 26.8 8V19M26.8 17.5C26.8 16.2 27.8 15.3 29 15.3C30.3 15.3 31.2 16.3 31.2 17.6V27C31.2 32 27.5 35 22.5 35H19C15 35 12 32.5 10.5 28.5L8 21.5C7.5 20 8.3 18.4 9.8 18C11.2 17.6 12.7 18.4 13.1 19.8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11 24L29 22" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/></svg>'
    },
    // ---------- TORSO ----------
    {
      id: 'chaleco', nombre: 'Chaleco reflectivo', emoji: '🦺',
      explicacion: 'Aumenta la visibilidad de la persona en zonas de riesgo, tránsito o maniobras con maquinaria.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8L20 12L26 8L30 12V32H10V12L14 8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 20H26M14 25H26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/maquinaria/chaleco.png`
    },
    {
      id: 'chaqueta_cuero', nombre: 'Chaqueta de cuero', emoji: '🧥',
      explicacion: 'Cubre brazos y torso para evitar quemaduras por chispas o salpicaduras calientes.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6L20 10L26 6L32 11L28 16V34H12V16L8 11L14 6Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M20 10V34" stroke="currentColor" stroke-width="1.6"/><path d="M13 20H16M24 20H27" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    },
    {
      id: 'delantal_cuero', nombre: 'Delantal de cuero', emoji: '🥋',
      explicacion: 'Protege el torso y las piernas frente a salpicaduras, calor o cortes.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8H26V13L29 15V33C29 34 28 35 27 35H13C12 35 11 34 11 33V15L14 13V8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 8L8 5M26 8L32 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 22H25" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/soldadura/delantal.png`
    },
    {
      id: 'delantal_cocina', nombre: 'Delantal', emoji: '🥋',
      explicacion: 'Delantal limpio y liviano que protege la ropa y evita contaminación cruzada con los alimentos.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8H26V13L29 15V33C29 34 28 35 27 35H13C12 35 11 34 11 33V15L14 13V8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 8L8 5M26 8L32 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 22H25" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/cocina/delantal.png`
    },
    // ---------- PIES ----------
    {
      id: 'botas_seguridad', nombre: 'Botas de seguridad', emoji: '🥾',
      explicacion: 'Protegen los pies de golpes, objetos punzantes o superficies resbalosas.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 5H24V19L32 24C34 25 35 27 35 29V32H10C8 32 7 30.5 7 29V19L14 15V5Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 11H24" stroke="currentColor" stroke-width="1.6"/><path d="M7 29H35" stroke="currentColor" stroke-width="2"/></svg>',
      img: `${ASSET_BASE}/ganaderia/botas.png`
    },
    {
      id: 'zapato_cerrado', nombre: 'Zapato cerrado', emoji: '👞',
      explicacion: 'Calzado cerrado y antideslizante, ideal para cocinas: protege de caídas y derrames calientes.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 20C6 16 10 13 16 13H26L34 20V28C34 30 32 32 30 32H10C8 32 6 30 6 28V20Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 22H34" stroke="currentColor" stroke-width="1.6"/></svg>',
      img: `${ASSET_BASE}/cocina/zapato.png`
    },
    {
      id: 'botas_caucho', nombre: 'Botas de caucho', emoji: '🥾',
      explicacion: 'Impermeables, ideales para zonas húmedas o con barro, pero no reemplazan la puntera de seguridad.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 5H24V19L32 24C34 25 35 27 35 29V32H10C8 32 7 30.5 7 29V19L14 15V5Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M7 29H35" stroke="currentColor" stroke-width="2"/></svg>',
      img: `${ASSET_BASE}/variados/botas_caucho.png`
    },
    // ---------- VARIADOS (opciones extra / distractores) ----------
    {
      id: 'guantes_caucho', nombre: 'Guantes de caucho', emoji: '🧤',
      explicacion: 'Impermeables y resistentes a químicos suaves; muy usados en limpieza y labores húmedas.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 18V9.5C13 8 14 7 15.3 7C16.6 7 17.6 8 17.6 9.5V17M17.6 17V7.5C17.6 6 18.6 5 19.9 5C21.2 5 22.2 6 22.2 7.5V17M22.2 17V8C22.2 6.5 23.2 5.5 24.5 5.5C25.8 5.5 26.8 6.5 26.8 8V19M26.8 17.5C26.8 16.2 27.8 15.3 29 15.3C30.3 15.3 31.2 16.3 31.2 17.6V27C31.2 32 27.5 35 22.5 35H19C15 35 12 32.5 10.5 28.5L8 21.5C7.5 20 8.3 18.4 9.8 18C11.2 17.6 12.7 18.4 13.1 19.8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
      img: `${ASSET_BASE}/variados/guantes_caucho.png`
    },
    {
      id: 'impermeable', nombre: 'Impermeable', emoji: '🌧️',
      explicacion: 'Protege del agua y la lluvia, útil en labores a la intemperie, pero no protege de golpes ni químicos.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6L20 10L26 6L32 11L28 16V34H12V16L8 11L14 6Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
      img: `${ASSET_BASE}/variados/impermeable.png`
    },
    {
      id: 'gafas_laboratorio', nombre: 'Gafas de laboratorio', emoji: '🥽',
      explicacion: 'Protegen los ojos de salpicaduras químicas en entornos de laboratorio.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="20" r="7" stroke="currentColor" stroke-width="2.2"/><circle cx="28" cy="20" r="7" stroke="currentColor" stroke-width="2.2"/><path d="M19 20H21" stroke="currentColor" stroke-width="2.2"/></svg>',
      img: `${ASSET_BASE}/variados/gafas_laboratorio.png`
    },
    {
      id: 'chaleco_pescador', nombre: 'Chaleco de pescador', emoji: '🦺',
      explicacion: 'Chaleco con bolsillos para faenas al aire libre; no reemplaza el chaleco reflectivo en zonas de riesgo.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8L20 12L26 8L30 12V32H10V12L14 8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
      img: `${ASSET_BASE}/variados/chaleco_pescador.png`
    },
    {
      id: 'chaleco_brigadista', nombre: 'Chaleco de brigadista', emoji: '🦺',
      explicacion: 'Identifica a personal de emergencias o brigadas; no es un EPP reflectivo estándar de planta.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 8L20 12L26 8L30 12V32H10V12L14 8Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 20H26M14 25H26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      img: `${ASSET_BASE}/variados/chaleco_brigadista.png`
    },
    {
      id: 'bata_blanca', nombre: 'Bata blanca', emoji: '🥼',
      explicacion: 'Común en laboratorios o áreas clínicas; protege la ropa de salpicaduras leves.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 6L20 10L26 6L32 11L28 16V34H12V16L8 11L14 6Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M20 10V34" stroke="currentColor" stroke-width="1.6"/></svg>',
      img: `${ASSET_BASE}/variados/bata_blanca.png`
    },
    {
      id: 'mascara_antigases', nombre: 'Máscara antigases', emoji: '😷',
      explicacion: 'Filtra gases y vapores químicos específicos; se usa según el riesgo, no en cualquier labor.',
      icon: '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 16C8 12 13 9 20 9C27 9 32 12 32 16V22C32 27 27 31 20 31C13 31 8 27 8 22V16Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="14.5" cy="19" r="3.6" stroke="currentColor" stroke-width="2"/><circle cx="25.5" cy="19" r="3.6" stroke="currentColor" stroke-width="2"/></svg>',
      img: `${ASSET_BASE}/variados/mascara_antigases.png`
    },
  ];

  // ==========================================
  // Zonas del cuerpo (geometría para los overlays sobre el personaje).
  // Cada zona es un rectángulo (% del contenedor, aspect-ratio 3/4). Al
  // colocar un EPP en un slot del panel de equipamiento, su PNG se
  // posiciona sobre la zona correspondiente.
  //
  // El `aspect-ratio: 3/4` del contenedor hace que los % verticales se
  // correspondan con la altura del cuerpo. Los valores están calibrados
  // para los PNG de cada área (cocina/ganaderia frontales, soldadura trasera).
  // ==========================================
  const BODY_ZONES_BY_AREA = {
    // Vista frontal (cocinero)
    cocina: {
      cabeza:  { x: 50, y:  9, w: 26, h: 13 },
      cara:    { x: 50, y: 18, w: 22, h: 10 },
      manos:   { x: 80, y: 46, w: 22, h: 14 },
      torso:   { x: 50, y: 42, w: 46, h: 26 },
      pies:    { x: 50, y: 93, w: 36, h: 12 },
    },
    // Vista frontal (vaquero)
    ganaderia: {
      cabeza:  { x: 50, y: 10, w: 26, h: 13 },
      cara:    { x: 50, y: 19, w: 22, h: 10 },
      manos:   { x: 80, y: 48, w: 22, h: 14 },
      torso:   { x: 50, y: 44, w: 46, h: 26 },
      pies:    { x: 50, y: 93, w: 36, h: 12 },
    },
    // Vista posterior (soldador): no hay 'cara' visible, las orejas se
    // modelan con una zona más alta; la careta ocupa la cabeza.
    soldadura: {
      cabeza:  { x: 50, y: 10, w: 28, h: 14 },
      cara:    { x: 50, y: 20, w: 22, h: 10 },
      manos:   { x: 78, y: 49, w: 22, h: 14 },
      torso:   { x: 50, y: 45, w: 48, h: 26 },
      pies:    { x: 50, y: 94, w: 36, h: 12 },
    },
  };

  const EPP_AREAS = [
    {
      id: 'ganaderia', nombre: 'Ganadería', emoji: '🐄',
      imagen: `${ASSET_BASE}/ganaderia/personaje.png`,
      imagenVestido: `${ASSET_BASE}/ganaderia/vestido.png`,
      correctos: { cabeza: 'gorra', cara: 'gafas', manos: 'guantes', torso: null, pies: 'botas_seguridad' },
    },
    {
      id: 'cocina', nombre: 'Cocina', emoji: '🍳',
      imagen: `${ASSET_BASE}/cocina/personaje.png`,
      imagenVestido: `${ASSET_BASE}/cocina/vestido.png`,
      correctos: { cabeza: 'gorro', cara: 'tapabocas', manos: 'guantes_nitrilo', torso: 'delantal_cocina', pies: 'zapato_cerrado' },
    },
    {
      id: 'soldadura', nombre: 'Soldadura', emoji: '🔥',
      imagen: `${ASSET_BASE}/soldadura/personaje.png`,
      imagenVestido: `${ASSET_BASE}/soldadura/vestido.png`,
      correctos: { cabeza: 'careta_soldadura', cara: 'tapones', manos: 'guantes_soldador', torso: 'delantal_cuero', pies: 'botas_seguridad' },
    },
    {
      id: 'maquinaria', nombre: 'Operador de maquinaria', emoji: '🏗️',
      // Se reutiliza el personaje base de soldadura: mismo estilo de
      // ilustración que la foto "vestido" de maquinaria que ya tenemos.
      imagen: `${ASSET_BASE}/soldadura/personaje.png`,
      imagenVestido: `${ASSET_BASE}/maquinaria/vestido.png`,
      correctos: { cabeza: 'casco', cara: 'gafas', manos: 'guantes', torso: 'chaleco', pies: 'botas_seguridad' },
    },
  ];

  // ==========================================
  // Slots fijos del cuerpo (panel de equipamiento)
  // Cada slot corresponde a una zona del cuerpo. El usuario hace click
  // en un slot → se abre un picker con los EPPs disponibles para esa zona
  // (filtrados a los que tienen imagen PNG).
  // ==========================================
  const BODY_SLOTS = [
    { id: 'cabeza',  nombre: 'Cabeza' },
    { id: 'cara',    nombre: 'Rostro' },
    { id: 'manos',   nombre: 'Manos' },
    { id: 'torso',   nombre: 'Torso' },
    { id: 'pies',    nombre: 'Pies' },
  ];

  // Catálogo de EPPs por slot, ordenado por id. Solo se incluyen los EPPs
  // que tienen imagen PNG real (los demás quedan fuera del flujo).
  // Se agregan EPPs "variados" como distractores extra: son válidos en
  // otros contextos, pero nunca son la respuesta correcta en estas áreas.
  const SLOT_CATALOG = {
    cabeza:  ['gorro', 'gorra', 'careta_soldadura', 'casco'],
    cara:    ['gafas', 'tapabocas', 'tapones', 'gafas_laboratorio', 'mascara_antigases'],
    manos:   ['guantes', 'guantes_nitrilo', 'guantes_soldador', 'guantes_caucho'],
    torso:   ['delantal_cocina', 'delantal_cuero', 'chaleco', 'impermeable', 'chaleco_pescador', 'chaleco_brigadista', 'bata_blanca'],
    pies:    ['botas_seguridad', 'zapato_cerrado', 'botas_caucho'],
  };

  // Helper: lista plana de EPPs con imagen, derivada del catálogo.
  const EPP_ITEMS_WITH_IMG = EPP_ITEMS.filter((it) => it.img);

  // ==========================================
  // Audio simple (síntesis WebAudio para feedback)
  // ==========================================
  const SoundFX = (() => {
    let ctx = null;
    function ensure() {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { ctx = null; }
      }
      return ctx;
    }
    function beep(freq, duration = 0.12, type = 'sine', gain = 0.18) {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(c.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      o.stop(c.currentTime + duration + 0.02);
    }
    return {
      flip:   () => beep(660, 0.07, 'square', 0.12),
      correct:() => { beep(523, 0.10, 'triangle', 0.18); setTimeout(() => beep(784, 0.14, 'triangle', 0.18), 90); },
      wrong:  () => { beep(220, 0.10, 'sawtooth', 0.20); setTimeout(() => beep(165, 0.16, 'sawtooth', 0.20), 110); },
      perfect:() => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.20), i * 110)); },
    };
  })();

  // Confeti simple sin dependencias
  function confetti(target) {
    if (!target) return;
    const colors = ['#39A900', '#FFB800', '#5BA3C7', '#E4572E', '#C9701A'];
    const rect = target.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
    document.body.appendChild(layer);
    for (let i = 0; i < 28; i++) {
      const piece = document.createElement('span');
      const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.8;
      const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 30;
      piece.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:10px;height:14px;background:${colors[i % colors.length]};border-radius:2px;`;
      layer.appendChild(piece);
      const dx = (Math.random() - 0.5) * 360;
      const dy = 220 + Math.random() * 280;
      const rot = (Math.random() - 0.5) * 720;
      const dur = 900 + Math.random() * 600;
      piece.animate(
        [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' }
      );
    }
    setTimeout(() => layer.remove(), 1600);
  }

  // ==========================================
  // Estado del juego
  // ==========================================
  const ROUND4_LIVES = 5;
  const state = {
    areaId: null,
    progress: {},
    lives: ROUND4_LIVES,
    score: 0,
    correctPicks: 0,
    wrongPicks: 0,
    pickerSlotId: null, // slot actualmente abierto en el picker
  };

  // ==========================================
  // Referencias al DOM
  // ==========================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const elStart    = $('#epp-screen-start');
  const elExercise = $('#epp-screen-exercise');
  const elComplete = $('#epp-screen-complete');

  const elAreaList       = $('#round4-area-list');
  const elAreaName       = $('#round4-area-name');
  const elCharacter      = $('#round4-character');
  const elCharacterImg   = $('#round4-character-img');
  const elOverlays       = $('#round4-overlays');
  const elEquipmentGrid  = $('#round4-equipment-grid');
  const elCheckBtn       = $('#round4-check-btn');
  const elResetBtn       = $('#round4-reset-btn');
  const elFeedback       = $('#round4-feedback');
  const elFeedbackTitle  = $('#round4-feedback-title');
  const elFeedbackText   = $('#round4-feedback-text');
  const elScore          = $('#round4-score');
  const elLives          = $$('#round4-lives .life-heart');
  const elProgressFill   = $('#round4-progress-fill');
  const elProgressCount  = $('#round4-progress-count');
  const elBadgesRow      = $('#round4-badges-row');

  const elFinalScore  = $('#epp-final-score');
  const elFinalCorrect= $('#epp-final-correct');
  const elFinalAreas  = $('#epp-final-areas');

  // ==========================================
  // Navegación entre pantallas
  // ==========================================
  function showScreen(name) {
    [elStart, elExercise, elComplete].forEach((el) => {
      if (!el) return;
      el.classList.toggle('hidden', el.id !== `epp-screen-${name}`);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================
  // Lógica del juego
  // ==========================================
  function eppById(id) { return EPP_ITEMS.find((it) => it.id === id) || null; }

  function renderLives(losingIndex = null) {
    elLives.forEach((el, i) => {
      const alive = i < state.lives;
      el.classList.toggle('is-lost', !alive);
      if (losingIndex !== null && i === losingIndex) {
        el.animate(
          [{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }],
          { duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
        );
      }
    });
  }

  function loseLife() {
    const losingIndex = state.lives - 1;
    state.lives = Math.max(0, state.lives - 1);
    renderLives(losingIndex);
  }

  function startGame() {
    state.progress = {};
    EPP_AREAS.forEach((area) => {
      state.progress[area.id] = { placed: {}, checked: false, correctCount: 0, wrongCount: 0 };
    });
    state.lives = ROUND4_LIVES;
    state.score = 0;
    state.correctPicks = 0;
    state.wrongPicks = 0;
    state.pickerSlotId = null;

    elScore.textContent = '0';
    renderLives();
    renderAreaList();
    renderBadges();
    selectArea(EPP_AREAS[0].id);
    showScreen('exercise');
  }

  function renderAreaList() {
    elAreaList.innerHTML = '';
    EPP_AREAS.forEach((area) => {
      const done = state.progress[area.id].checked;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `epp2__pill${area.id === state.areaId ? ' is-active' : ''}${done ? ' is-done' : ''}`;
      btn.innerHTML = `<span aria-hidden="true">${area.emoji}</span><span>${area.nombre}</span>${done ? '<span class="epp2__pill-check">✔</span>' : ''}`;
      btn.addEventListener('click', () => selectArea(area.id));
      elAreaList.appendChild(btn);
    });
  }

  function renderBadges() {
    elBadgesRow.innerHTML = '';
    EPP_AREAS.forEach((area) => {
      const earned = state.progress[area.id].checked && state.progress[area.id].wrongCount === 0;
      const span = document.createElement('span');
      span.className = `epp2__badge${earned ? ' is-earned' : ''}`;
      span.title = area.nombre;
      span.textContent = area.emoji;
      elBadgesRow.appendChild(span);
    });
  }

  function selectArea(areaId) {
    state.areaId = areaId;
    state.pickerSlotId = null;
    elFeedback.hidden = true;
    closePicker();

    const area = EPP_AREAS.find((a) => a.id === areaId);
    elAreaName.textContent = area.nombre;

    const checked = state.progress[areaId].checked;
    setCharacterImage(area, checked);

    renderEquipmentGrid(area);
    renderOverlays(area);
    renderAreaList();

    elCheckBtn.disabled = checked;
    elResetBtn.disabled = false;
  }

  // Cambia la foto del personaje en el escenario: la base (sin EPP) o la
  // foto del compañero ya equipado (imagenVestido), según corresponda.
  // Una sola imagen ocupa el escenario a la vez; nunca se muestran ambas.
  function setCharacterImage(area, showVestido) {
    const targetSrc = (showVestido && area.imagenVestido) ? area.imagenVestido : area.imagen;
    const img = new Image();
    img.onload = () => {
      elCharacterImg.src = targetSrc;
      elCharacterImg.hidden = false;
      elCharacterImg.classList.remove('epp2__character-img--swap');
      // Reinicia la animación de swap (forzar reflow).
      void elCharacterImg.offsetWidth;
      elCharacterImg.classList.add('epp2__character-img--swap');
    };
    img.onerror = () => {
      elCharacterImg.hidden = true;
    };
    img.src = targetSrc;
  }

  // Resuelve la geometría de una zona del cuerpo para el área actual.
  function zoneGeometry(area, zoneId) {
    return (BODY_ZONES_BY_AREA[area.id] || {})[zoneId] || null;
  }

  // El EPP seleccionado ahora solo se muestra en su cuadro dentro de la
  // grilla de equipamiento (ver renderEquipmentGrid). Ya no se dibuja
  // como overlay encima del personaje.
  function renderOverlays() {
    elOverlays.innerHTML = '';
  }

  // Renderiza el panel de equipamiento: un slot fijo por zona del cuerpo.
  function renderEquipmentGrid(area) {
    elEquipmentGrid.innerHTML = '';
    const progress = state.progress[area.id];

    BODY_SLOTS.forEach((slot) => {
      const itemId = progress.placed[slot.id];
      const item = itemId ? eppById(itemId) : null;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'epp2__slot';
      btn.dataset.slot = slot.id;
      btn.setAttribute('aria-label', `Slot: ${slot.nombre}${item ? `, ${item.nombre}` : ', vacío'}`);

      if (state.pickerSlotId === slot.id) btn.classList.add('is-active');
      if (item) btn.classList.add('is-filled');

      // Estado de feedback tras Comprobar
      if (progress.checked) {
        const correcto = area.correctos[slot.id] || null;
        if (correcto === null && !itemId) {
          // Slot vacío que debe quedar vacío (correcto)
          btn.classList.add('is-correct');
        } else if (itemId === correcto) {
          btn.classList.add('is-correct');
        } else {
          btn.classList.add('is-wrong');
        }
      }

      if (item && item.img) {
        btn.innerHTML = `<img src="${item.img}" alt="" class="epp2__slot-thumb" /><span class="epp2__slot-name">${item.nombre}</span>`;
      } else {
        btn.innerHTML = `<span class="epp2__slot-empty" aria-hidden="true">+</span><span class="epp2__slot-name">${slot.nombre}</span>`;
      }

      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        handleSlotClick(area, slot, itemId);
      });
      elEquipmentGrid.appendChild(btn);
    });
  }

  function handleSlotClick(area, slot, currentItemId) {
    const progress = state.progress[area.id];
    if (progress.checked) return;

    // Si el picker de este slot ya está abierto, ciérralo.
    if (state.pickerSlotId === slot.id) {
      closePicker();
      return;
    }
    // Si el slot ya tiene un EPP colocado, lo retiramos al hacer click
    // (UX equivalente al flujo anterior: click para quitar).
    if (currentItemId) {
      progress.placed[slot.id] = null;
      SoundFX.flip();
      closePicker();
      renderEquipmentGrid(area);
      renderOverlays(area);
      return;
    }
    // Slot vacío: abrir picker.
    openPicker(area, slot);
  }

  // Abre el picker bajo el slot indicado.
  function openPicker(area, slot) {
    closePicker();
    state.pickerSlotId = slot.id;
    const slotEl = elEquipmentGrid.querySelector(`[data-slot="${slot.id}"]`);
    if (!slotEl) return;
    slotEl.classList.add('is-active');

    const picker = document.createElement('div');
    picker.className = 'epp2__picker';
    picker.setAttribute('role', 'menu');

    const title = document.createElement('p');
    title.className = 'epp2__picker-title';
    title.textContent = `Elegir EPP para ${slot.nombre}`;
    picker.appendChild(title);

    const ids = SLOT_CATALOG[slot.id] || [];
    const items = ids.map(eppById).filter(Boolean);
    if (items.length === 0) {
      const empty = document.createElement('button');
      empty.type = 'button';
      empty.className = 'epp2__picker-item is-empty';
      empty.textContent = 'No hay EPPs disponibles para esta zona';
      empty.disabled = true;
      picker.appendChild(empty);
    } else {
      items.forEach((item) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'epp2__picker-item';
        opt.setAttribute('role', 'menuitem');
        opt.innerHTML = `<img src="${item.img}" alt="" /><span>${item.nombre}</span>`;
        opt.addEventListener('click', (ev) => {
          ev.stopPropagation();
          placeEpp(area, slot, item);
        });
        picker.appendChild(opt);
      });
    }

    slotEl.appendChild(picker);

    // Backdrop para cerrar al hacer click fuera.
    const backdrop = document.createElement('div');
    backdrop.className = 'epp2__picker-backdrop';
    backdrop.addEventListener('click', closePicker);
    document.body.appendChild(backdrop);
  }

  function closePicker() {
    if (state.pickerSlotId) {
      const slotEl = elEquipmentGrid.querySelector(`[data-slot="${state.pickerSlotId}"]`);
      if (slotEl) {
        slotEl.classList.remove('is-active');
        const picker = slotEl.querySelector('.epp2__picker');
        if (picker) picker.remove();
      }
    }
    const backdrops = document.querySelectorAll('.epp2__picker-backdrop');
    backdrops.forEach((b) => b.remove());
    state.pickerSlotId = null;
  }

  function placeEpp(area, slot, item) {
    const progress = state.progress[area.id];
    if (progress.checked) return;
    progress.placed[slot.id] = item.id;
    SoundFX.flip();
    closePicker();
    renderEquipmentGrid(area);
    renderOverlays(area);
  }

  function checkArea() {
    const area = EPP_AREAS.find((a) => a.id === state.areaId);
    const progress = state.progress[area.id];
    if (progress.checked) return;
    closePicker();

    let correct = 0;
    let wrong = 0;

    BODY_SLOTS.forEach((slot) => {
      const correcto = area.correctos[slot.id] || null;
      const placedId = progress.placed[slot.id] || null;
      if (placedId === correcto) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    progress.checked = true;
    progress.correctCount = correct;
    progress.wrongCount = wrong;

    const earned = correct * 10;
    state.score += earned;
    state.correctPicks += correct;
    state.wrongPicks += wrong;
    elScore.textContent = String(state.score);

    for (let i = 0; i < wrong; i += 1) loseLife();

    renderOverlays(area);
    renderEquipmentGrid(area);
    renderAreaList();
    renderBadges();
    updateProgress();

    elFeedback.hidden = false;

    // El personaje base desaparece y en su lugar aparece la foto del
    // compañero ya equipado correctamente (si el área tiene esa foto).
    setCharacterImage(area, true);

    if (wrong === 0) {
      elFeedback.classList.remove('is-wrong');
      elFeedbackTitle.textContent = `¡Correcto, así era! · ${area.nombre}`;
      elFeedbackText.textContent = 'Vestiste a tu compañero exactamente con el EPP que necesitaba para esa labor.';
      SoundFX.correct();
      confetti(elCharacter);
    } else {
      elFeedback.classList.add('is-wrong');
      elFeedbackTitle.textContent = `Así era correctamente · ${area.nombre}`;
      const areaHint = {
        ganaderia: 'En ganadería se usan botas de seguridad, gafas, gorra y guantes. No hace falta delantal ni careta.',
        cocina: 'En cocina: gorro, tapabocas, guantes de nitrilo, delantal limpio y zapato cerrado antideslizante.',
        soldadura: 'En soldadura la prioridad es proteger rostro (careta), manos (guantes largos) y cuerpo (delantal de cuero).',
        maquinaria: 'Al operar maquinaria: casco, gafas, guantes, chaleco reflectivo y botas de seguridad.',
      }[area.id] || '';
      elFeedbackText.textContent = `${correct} de ${BODY_SLOTS.length} zonas correctas. ${areaHint}`;
      SoundFX.wrong();
    }

    elCheckBtn.disabled = true;

    const allChecked = EPP_AREAS.every((a) => state.progress[a.id].checked);
    if (allChecked) {
      setTimeout(finishGame, 1400);
    }
  }

  function resetArea() {
    const area = EPP_AREAS.find((a) => a.id === state.areaId);
    const progress = state.progress[area.id];
    if (progress.checked) return;
    progress.placed = {};
    state.pickerSlotId = null;
    elFeedback.hidden = true;
    closePicker();
    renderOverlays(area);
    renderEquipmentGrid(area);
  }

  function updateProgress() {
    const total = EPP_AREAS.length;
    const done = EPP_AREAS.filter((a) => state.progress[a.id].checked).length;
    elProgressFill.style.width = `${(done / total) * 100}%`;
    elProgressCount.textContent = `${done}/${total}`;
  }

  function finishGame() {
    showScreen('complete');

    const totalAreas = EPP_AREAS.length;
    const perfectAreas = EPP_AREAS.filter((a) => state.progress[a.id].checked && state.progress[a.id].wrongCount === 0).length;

    elFinalScore.textContent = String(state.score);
    elFinalCorrect.textContent = String(state.correctPicks);
    elFinalAreas.textContent = `${totalAreas}/${totalAreas}`;

    // Suma al sistema de puntos globales (normalizado a 250 máx por módulo).
    if (window.GlobalScore) GlobalScore.record('epp', state.score);

    if (state.wrongPicks === 0) {
      SoundFX.perfect();
      confetti(document.body);
    } else {
      SoundFX.correct();
    }
  }

  // ==========================================
  // Bootstrap
  // ==========================================
  function init() {
    // Botón "Comenzar" en pantalla de inicio
    const startBtn = $('#epp-btn-start');
    if (startBtn) startBtn.addEventListener('click', startGame);

    // Botón "Repetir" en pantalla de completado
    const replayBtn = $('#epp-btn-replay');
    if (replayBtn) replayBtn.addEventListener('click', startGame);

    // Botones del juego
    elCheckBtn.addEventListener('click', checkArea);
    elResetBtn.addEventListener('click', resetArea);

    // Cerrar picker con Escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && state.pickerSlotId) closePicker();
    });

    // Mostrar pantalla de inicio al cargar
    showScreen('start');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
