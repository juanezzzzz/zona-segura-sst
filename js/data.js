/* ==========================================================
   ZONA SEGURA · Contenido pedagógico
   Todo el texto y los datos de los juegos viven aquí, separados
   de la lógica, para que se puedan revisar y ampliar fácilmente.
   ========================================================== */
(function () {
  'use strict';

  const ZS = (window.ZS = window.ZS || {});
  const base = document.documentElement.dataset.base || '';
  const IMG = base + 'assets/images/';
  const EPP = IMG + 'epps/';

  /* ---------- Los 3 ejes de la SST ---------- */
  const EJES = {
    mental: { id: 'mental', label: 'Mentalmente saludable', short: 'Mental', img: IMG + 'eje-mental.png', key: '1' },
    medicina: { id: 'medicina', label: 'Medicina laboral', short: 'Medicina', img: IMG + 'eje-medicina.png', key: '2' },
    higiene: { id: 'higiene', label: 'Higiene y seguridad industrial', short: 'Higiene', img: IMG + 'eje-higiene.png', key: '3' },
  };

  /* ---------- Ronda 1 · Cinta transportadora ---------- */
  const SITUATIONS = [
    { eje: 'mental', text: 'Durante la jornada, el equipo hace una pausa activa para relajarse y recuperar energía.', why: 'Las pausas activas fortalecen el bienestar físico y mental.' },
    { eje: 'mental', text: 'Talento Humano organiza una charla sobre el manejo del estrés.', why: 'Estas actividades promueven el bienestar emocional.' },
    { eje: 'mental', text: 'Un funcionario escucha y apoya a un compañero que se siente preocupado.', why: 'La empatía fortalece un ambiente laboral saludable.' },
    { eje: 'mental', text: 'El equipo resuelve un desacuerdo mediante el diálogo y el respeto.', why: 'La buena convivencia hace parte del cuidado de la salud mental.' },
    { eje: 'mental', text: 'El grupo participa en una actividad para fortalecer el trabajo en equipo.', why: 'El trabajo en equipo mejora la convivencia.' },
    { eje: 'medicina', text: 'Se realiza una jornada de vacunación para los funcionarios.', why: 'Las vacunas ayudan a prevenir enfermedades.' },
    { eje: 'medicina', text: 'Un funcionario recibe atención en enfermería por un malestar.', why: 'La atención en salud pertenece a Medicina Laboral.' },
    { eje: 'medicina', text: 'El jefe inmediato recuerda mantenerse hidratado durante la jornada.', why: 'La hidratación favorece el cuidado de la salud.' },
    { eje: 'medicina', text: 'Se lanza una campaña de hábitos de vida saludable.', why: 'Promueve la prevención y el autocuidado.' },
    { eje: 'medicina', text: 'Los aprendices asisten al examen médico periódico.', why: 'Los exámenes ocupacionales detectan a tiempo riesgos para la salud.' },
    { eje: 'higiene', text: 'Antes de entrar al taller, todos se ponen gafas de seguridad.', why: 'Los elementos de protección ayudan a prevenir accidentes.' },
    { eje: 'higiene', text: 'Un funcionario reporta un cable atravesado en el pasillo.', why: 'Reportar riesgos evita accidentes.' },
    { eje: 'higiene', text: 'Las rutas de evacuación permanecen despejadas.', why: 'Las rutas libres permiten una evacuación segura.' },
    { eje: 'higiene', text: 'Antes de usar una herramienta, el jefe de área explica las normas de seguridad.', why: 'Conocer las normas reduce el riesgo de accidentes.' },
    { eje: 'higiene', text: 'Se señaliza un piso mojado.', why: 'La señalización previene caídas.' },
    { eje: 'higiene', text: 'Cada persona mantiene limpio y ordenado su puesto de trabajo.', why: 'El orden contribuye a un ambiente seguro.' },
  ];

  /* ---------- Catálogo de EPP ---------- */
  const EPP_ITEMS = {
    casco: { name: 'Casco de seguridad', img: EPP + 'maquinaria/casco.png', why: 'Protege la cabeza de golpes e impactos al operar maquinaria pesada.' },
    gorro: { name: 'Gorro', img: EPP + 'cocina/gorro.png', why: 'Cubre el cabello para que no caiga en los alimentos.' },
    gorra: { name: 'Gorra', img: EPP + 'ganaderia/gorra.png', why: 'Protege la cabeza del sol en trabajos al aire libre.' },
    careta: { name: 'Careta de soldadura', img: EPP + 'soldadura/careta.png', why: 'Protege el rostro de chispas, luz ultravioleta y calor al soldar.' },
    gafas: { name: 'Gafas de seguridad', img: EPP + 'ganaderia/gafas.png', why: 'Protegen los ojos de partículas, chispas o salpicaduras.' },
    gafas_lab: { name: 'Gafas de laboratorio', img: EPP + 'variados/gafas_laboratorio.png', why: 'Protegen de salpicaduras químicas en el laboratorio.' },
    tapabocas: { name: 'Tapabocas', img: EPP + 'cocina/tapabocas.png', why: 'Evita contaminar los alimentos con gotas de saliva.' },
    auditiva: { name: 'Protección auditiva', img: EPP + 'soldadura/proteccion_auditiva.png', why: 'Reduce el daño por exposición a ruido excesivo.' },
    antigases: { name: 'Máscara antigases', img: EPP + 'variados/mascara_antigases.png', why: 'Filtra gases y vapores químicos específicos; se usa según el riesgo.' },
    guantes: { name: 'Guantes de vaqueta', img: EPP + 'ganaderia/guantes.png', why: 'Protegen las manos al manipular herramientas, cuerdas o animales.' },
    guantes_soldador: { name: 'Guantes de soldador', img: EPP + 'soldadura/guantes.png', why: 'Largos y resistentes: protegen manos y antebrazos del calor y las chispas.' },
    guantes_nitrilo: { name: 'Guantes de nitrilo', img: EPP + 'cocina/guantes_nitrilo.png', why: 'Finos e impermeables, ideales para manipular alimentos.' },
    guantes_caucho: { name: 'Guantes de caucho', img: EPP + 'variados/guantes_caucho.png', why: 'Resistentes a químicos suaves; usados en limpieza y labores húmedas.' },
    chaleco: { name: 'Chaleco reflectivo', img: EPP + 'maquinaria/chaleco.png', why: 'Hace visible a la persona en zonas de tránsito o maniobras con maquinaria.' },
    delantal_cuero: { name: 'Delantal de cuero', img: EPP + 'soldadura/delantal.png', why: 'Protege el torso de chispas, salpicaduras calientes y cortes.' },
    delantal: { name: 'Delantal de cocina', img: EPP + 'cocina/delantal.png', why: 'Protege la ropa y evita la contaminación cruzada de los alimentos.' },
    impermeable: { name: 'Impermeable', img: EPP + 'variados/impermeable.png', why: 'Protege de la lluvia, pero no de golpes ni químicos.' },
    chaleco_pescador: { name: 'Chaleco de pescador', img: EPP + 'variados/chaleco_pescador.png', why: 'Tiene bolsillos, pero no reemplaza al chaleco reflectivo.' },
    chaleco_brigadista: { name: 'Chaleco de brigadista', img: EPP + 'variados/chaleco_brigadista.png', why: 'Identifica a la brigada de emergencias; no es un EPP de planta.' },
    bata: { name: 'Bata blanca', img: EPP + 'variados/bata_blanca.png', why: 'Común en laboratorios o áreas clínicas.' },
    botas: { name: 'Botas de seguridad', img: EPP + 'ganaderia/botas.png', why: 'Puntera reforzada: protegen de golpes, pisadas y objetos punzantes.' },
    zapato: { name: 'Zapato cerrado antideslizante', img: EPP + 'cocina/zapato.png', why: 'Evita resbalones y quemaduras por derrames en la cocina.' },
    botas_caucho: { name: 'Botas de caucho', img: EPP + 'variados/botas_caucho.png', why: 'Impermeables para barro y humedad, pero sin puntera de seguridad.' },
  };

  /* ---------- Etapa EPP · zonas del cuerpo y áreas ---------- */
  const BODY_ZONES = [
    { id: 'cabeza', label: 'Cabeza', options: ['casco', 'gorro', 'gorra', 'careta'] },
    { id: 'rostro', label: 'Ojos, oídos y boca', options: ['gafas', 'gafas_lab', 'tapabocas', 'auditiva', 'antigases'] },
    { id: 'manos', label: 'Manos', options: ['guantes', 'guantes_soldador', 'guantes_nitrilo', 'guantes_caucho'] },
    { id: 'torso', label: 'Torso', options: ['chaleco', 'delantal_cuero', 'delantal', 'impermeable', 'chaleco_pescador', 'chaleco_brigadista', 'bata'] },
    { id: 'pies', label: 'Pies', options: ['botas', 'zapato', 'botas_caucho'] },
  ];

  // `answer[zona] = null` significa que esa zona no necesita EPP adicional.
  const EPP_AREAS = [
    {
      id: 'ganaderia', name: 'Ganadería',
      brief: 'Trabaja al aire libre, bajo el sol, manejando animales y cuerdas en potrero.',
      img: EPP + 'ganaderia/personaje.png', dressed: EPP + 'ganaderia/vestido.png',
      answer: { cabeza: 'gorra', rostro: 'gafas', manos: 'guantes', torso: null, pies: 'botas' },
      tip: 'En ganadería: gorra contra el sol, gafas, guantes de vaqueta y botas de seguridad. Su overol ya protege el torso.',
    },
    {
      id: 'cocina', name: 'Cocina',
      brief: 'Prepara alimentos para el comedor: debe cuidar la inocuidad y evitar resbalones.',
      img: EPP + 'cocina/personaje.png', dressed: EPP + 'cocina/vestido.png',
      answer: { cabeza: 'gorro', rostro: 'tapabocas', manos: 'guantes_nitrilo', torso: 'delantal', pies: 'zapato' },
      tip: 'En cocina: gorro, tapabocas, guantes de nitrilo, delantal limpio y zapato cerrado antideslizante.',
    },
    {
      id: 'soldadura', name: 'Soldadura',
      brief: 'Suelda estructuras metálicas en un taller ruidoso, con chispas y mucho calor.',
      img: EPP + 'soldadura/personaje.png', dressed: EPP + 'soldadura/vestido.png',
      answer: { cabeza: 'careta', rostro: 'auditiva', manos: 'guantes_soldador', torso: 'delantal_cuero', pies: 'botas' },
      tip: 'En soldadura: careta, protección auditiva, guantes largos de soldador, delantal de cuero y botas de seguridad.',
    },
    {
      id: 'maquinaria', name: 'Operación de maquinaria',
      brief: 'Opera maquinaria pesada en una obra con tránsito de vehículos y objetos en altura.',
      img: EPP + 'soldadura/personaje.png', dressed: EPP + 'maquinaria/vestido.png',
      answer: { cabeza: 'casco', rostro: 'gafas', manos: 'guantes', torso: 'chaleco', pies: 'botas' },
      tip: 'Al operar maquinaria: casco, gafas, guantes, chaleco reflectivo y botas de seguridad.',
    },
  ];

  /* ---------- Ronda 2 · Memorama ---------- */
  const MEMO_CONCEPTS = [
    { eje: 'mental', text: 'Pausa activa', why: 'Las pausas activas favorecen el bienestar físico y emocional.' },
    { eje: 'mental', text: 'Empatía', why: 'Escuchar y apoyar a un compañero fortalece la convivencia.' },
    { eje: 'mental', text: 'Manejo del estrés', why: 'Atender el estrés cuida el bienestar psicológico.' },
    { eje: 'medicina', text: 'Vacunación', why: 'Previene enfermedades mediante una intervención médica.' },
    { eje: 'medicina', text: 'Hidratación', why: 'Mantenerse hidratado favorece la salud durante la jornada.' },
    { eje: 'medicina', text: 'Enfermería', why: 'Atender un malestar corresponde al cuidado de la salud.' },
    { eje: 'higiene', text: 'Ruta de evacuación', why: 'Mantenerla despejada permite evacuar con seguridad.' },
    { eje: 'higiene', text: 'Señalización', why: 'Señalizar un riesgo ayuda a prevenir accidentes.' },
    { eje: 'higiene', text: 'Orden y aseo', why: 'Un puesto ordenado evita tropiezos y golpes.' },
  ];
  const MEMO_EPP = ['casco', 'gafas', 'guantes_soldador', 'auditiva', 'chaleco', 'careta', 'botas', 'antigases', 'guantes_nitrilo'];

  /* ---------- Ronda 3 · Ruleta ---------- */
  const OPTIONS = ['mental', 'medicina', 'higiene'];
  const QUESTIONS = [
    { q: 'Un funcionario participa en una charla sobre manejo del estrés. ¿A qué eje pertenece?', a: 'mental', why: 'El manejo del estrés fortalece el bienestar emocional.' },
    { q: 'Se realiza una jornada de vacunación en el SENA. ¿A qué eje pertenece?', a: 'medicina', why: 'La vacunación ayuda a prevenir enfermedades.' },
    { q: 'Antes de entrar al taller, todos usan casco y gafas. ¿A qué eje pertenece?', a: 'higiene', why: 'Los elementos de protección previenen accidentes.' },
    { q: 'Un funcionario acude a enfermería por un malestar. ¿A qué eje pertenece?', a: 'medicina', why: 'La atención en salud corresponde a Medicina Laboral.' },
    { q: 'El grupo resuelve un conflicto mediante el diálogo. ¿A qué eje pertenece?', a: 'mental', why: 'La convivencia y el respeto fortalecen la salud mental.' },
    { q: 'Se señaliza un piso mojado para evitar caídas. ¿A qué eje pertenece?', a: 'higiene', why: 'La señalización ayuda a prevenir accidentes.' },
    { q: 'Los funcionarios reciben recomendaciones para mantenerse hidratados. ¿A qué eje pertenece?', a: 'medicina', why: 'La hidratación favorece la salud.' },
    { q: 'Se realiza una pausa activa durante la jornada. ¿A qué eje pertenece?', a: 'mental', why: 'Las pausas activas favorecen el bienestar.' },
    { q: 'Las rutas de evacuación se mantienen libres de obstáculos. ¿A qué eje pertenece?', a: 'higiene', why: 'Las rutas despejadas permiten una evacuación segura.' },
    { q: 'Talento Humano realiza una actividad de trabajo en equipo. ¿A qué eje pertenece?', a: 'mental', why: 'El trabajo en equipo fortalece la convivencia.' },
  ];
  const CHALLENGES = [
    'Haz 3 pausas activas sencillas con tu equipo.',
    'Menciona en voz alta los tres ejes del SG-SST.',
    'Muestra cómo se usa correctamente un casco de seguridad.',
    'Representa cómo reportarías un riesgo en el SENA.',
    'Haz un saludo creativo relacionado con la seguridad.',
    'Encuentra una señal de seguridad cerca de ti.',
    'Mantén el equilibrio en un pie durante 10 segundos.',
    'Di una acción que ayude a cuidar la salud mental de un compañero.',
    'Explica por qué es importante hidratarse durante la jornada.',
    'Nombra 5 elementos de protección personal sin repetir.',
  ];

  /* ---------- Bienestar · Vocal Hero ---------- */
  const VOCAL_EXERCISES = [
    { id: 'a', group: 'Vocales', name: 'Vocal A', sound: 'AAAA', duration: 5, tip: 'Boca bien abierta, tono firme y constante.' },
    { id: 'o', group: 'Vocales', name: 'Vocal O', sound: 'OOOO', duration: 6, tip: 'Labios redondeados, garganta relajada.' },
    { id: 'm', group: 'Resonancia', name: 'Resonancia con M', sound: 'MMMM', duration: 6, tip: 'Labios juntos y relajados; siente la vibración en la cara.' },
    { id: 's', group: 'Respiración', name: 'Inhala y suelta con S', sound: 'SSSS', duration: 6, inhale: 4, tip: 'Primero inhala por la nariz. Luego suelta el aire despacio con una S.' },
    { id: 'brr', group: 'Vibración', name: 'Vibración de labios', sound: 'BRRR', duration: 6, tip: 'Labios sueltos, deja que vibren con el aire.' },
    { id: 'pa', group: 'Articulación', name: 'PA · TA · KA', sequence: ['PA', 'TA', 'KA'], duration: 4.5, tip: 'Articula con energía, apoyando desde el abdomen.' },
  ];

  /* ---------- Bienestar · Respiración guiada ---------- */
  const BREATHING = {
    name: 'Respiración cuadrada 4-4-6-2',
    cycles: 3,
    phases: [
      { key: 'inhale', label: 'Inhala', hint: 'Lentamente por la nariz', duration: 4, from: 0.45, to: 1, tone: 392 },
      { key: 'hold', label: 'Sostén', hint: 'Mantén el aire, hombros sueltos', duration: 4, from: 1, to: 1, tone: 440 },
      { key: 'exhale', label: 'Exhala', hint: 'Suave y largo por la boca', duration: 6, from: 1, to: 0.45, tone: 330 },
      { key: 'rest', label: 'Descansa', hint: 'Pausa breve antes de volver a empezar', duration: 2, from: 0.45, to: 0.45, tone: 0 },
    ],
  };

  ZS.data = { EJES, SITUATIONS, EPP_ITEMS, BODY_ZONES, EPP_AREAS, MEMO_CONCEPTS, MEMO_EPP, OPTIONS, QUESTIONS, CHALLENGES, VOCAL_EXERCISES, BREATHING };
})();
