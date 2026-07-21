/* ============================================
   VOCAL HERO - Catálogo de ejercicios
   Cada ejercicio define los datos necesarios
   para mostrar la UI y ejecutar la mecánica.
   ============================================ */

const EXERCISES = [
  /* ============================================
     NIVEL 1 - Vocales sostenidas
     ============================================ */
  {
    id: 'vowel-a',
    level: 1,
    levelName: 'Vocales sostenidas',
    name: 'Vocal A',
    icon: '🅰️',
    instruction: 'Mantén la vocal AAAAA durante 5 segundos con tono firme.',
    sound: 'AAAAA',
    duration: 5,
    inhaleFirst: false,
    sequence: null,
  },
  {
    id: 'vowel-e',
    level: 1,
    levelName: 'Vocales sostenidas',
    name: 'Vocal E',
    icon: '🅴',
    instruction: 'Sostén EEEEE con la boca semiabierta, sintiendo la vibración en los dientes.',
    sound: 'EEEEE',
    duration: 5,
    inhaleFirst: false,
    sequence: null,
  },
  {
    id: 'vowel-i',
    level: 1,
    levelName: 'Vocales sostenidas',
    name: 'Vocal I',
    icon: '🅸',
    instruction: 'Pronuncia IIIII con energía y mantén el sonido estable.',
    sound: 'IIIII',
    duration: 6,
    inhaleFirst: false,
    sequence: null,
  },
  {
    id: 'vowel-o',
    level: 1,
    levelName: 'Vocales sostenidas',
    name: 'Vocal O',
    icon: '🅾️',
    instruction: 'Forma la O con los labios redondeados y emite OOOOO.',
    sound: 'OOOOO',
    duration: 6,
    inhaleFirst: false,
    sequence: null,
  },
  {
    id: 'vowel-u',
    level: 1,
    levelName: 'Vocales sostenidas',
    name: 'Vocal U',
    icon: '🆄',
    instruction: 'Pronuncia UUUUU con los labios proyectados hacia afuera.',
    sound: 'UUUUU',
    duration: 7,
    inhaleFirst: false,
    sequence: null,
  },

  /* ============================================
     NIVEL 2 - Resonancia
     ============================================ */
  {
    id: 'resonance-m',
    level: 2,
    levelName: 'Resonancia',
    name: 'Resonancia con M',
    icon: '🎵',
    instruction: 'Emite MMMMMM haciendo vibrar los labios suavemente, sintiendo la resonancia en la cara.',
    sound: 'MMMMMM',
    duration: 6,
    inhaleFirst: false,
    sequence: null,
  },

  /* ============================================
     NIVEL 3 - Respiración
     ============================================ */
  {
    id: 'breath-s',
    level: 3,
    levelName: 'Respiración',
    name: 'Inhalar y exhalar con S',
    icon: '🌬️',
    instruction: 'Inhala profundamente durante 4 segundos. Luego exhala lentamente emitiendo SSSSSS.',
    sound: 'SSSSSS',
    duration: 6,           // duración de la exhalación
    inhaleFirst: true,     // fase previa de inhalación (4s)
    inhaleDuration: 4,
    sequence: null,
  },

  /* ============================================
     NIVEL 4 - Vibración de labios
     ============================================ */
  {
    id: 'lip-trill',
    level: 4,
    levelName: 'Vibración de labios',
    name: 'Vibración de labios',
    icon: '💨',
    instruction: 'Relaja los labios y emite BRRRRRRRRR haciendo que vibren suavemente.',
    sound: 'BRRRRRRRRR',
    duration: 6,
    inhaleFirst: false,
    sequence: null,
  },

  /* ============================================
     NIVEL 5 - Articulación (secuencias)
     ============================================ */
  {
    id: 'articulation-m',
    level: 5,
    levelName: 'Articulación',
    name: 'MA - ME - MI - MO - MU',
    icon: '👄',
    instruction: 'Pronuncia cada sílaba al ritmo indicado, abriendo bien la boca en cada una.',
    sound: null,           // se compone desde la secuencia
    duration: 5,          // 5 sílabas × 1s c/u
    inhaleFirst: false,
    sequence: ['MA', 'ME', 'MI', 'MO', 'MU'],
    syllableDuration: 1,
  },
  {
    id: 'articulation-ptk',
    level: 5,
    levelName: 'Articulación',
    name: 'PA - TA - KA',
    icon: '🗯️',
    instruction: 'Articula con energía las sílabas PA, TA, KA, sintiendo el apoyo del diafragma.',
    sound: null,
    duration: 4.5,         // 3 sílabas × 1.5s c/u
    inhaleFirst: false,
    sequence: ['PA', 'TA', 'KA'],
    syllableDuration: 1.5,
  },
];

/* ============================================
   Constantes del sistema de puntuación
   ============================================ */
const SCORING = {
  PER_EXERCISE: 10,
  NO_INTERRUPTION_BONUS: 20,
  ALL_COMPLETED_BONUS: 50,
};

/**
 * Mensajes motivacionales según rango de puntuación.
 */
const MOTIVATIONAL_MESSAGES = [
  { min: 0,   max: 49,  title: '¡Buen comienzo!',         message: 'Has dado el primer paso. Sigue practicando y verás grandes mejoras en tu voz.' },
  { min: 50,  max: 99,  title: '¡Excelente trabajo!',     message: 'Tu constancia se nota. ¡Vuelve mañana para seguir fortaleciendo tu voz!' },
  { min: 100, max: 199, title: '¡Increíble rutina!',      message: 'Has cuidado tu voz con una rutina completa. ¡Eres un Vocal Hero!' },
  { min: 200, max: Infinity, title: '¡Maestría vocal!',   message: 'Rendimiento excepcional. Tu voz te lo agradecerá.' },
];

/**
 * Devuelve el mensaje motivacional correspondiente a la puntuación.
 * @param {number} score
 * @returns {{title: string, message: string}}
 */
function getMotivationalMessage(score) {
  return MOTIVATIONAL_MESSAGES.find(m => score >= m.min && score <= m.max) || MOTIVATIONAL_MESSAGES[0];
}

// Exponer en window para uso desde otros scripts
window.VocalHeroData = {
  EXERCISES,
  SCORING,
  getMotivationalMessage,
};
