/* ============================================
   RESPIRACIÓN GUIADA - Patrones de respiración
   Define las fases (escala objetivo, duración, mensaje)
   y los mensajes motivacionales por puntuación.
   ============================================ */

/**
 * Técnica Box 4-4-6-2.
 * Variación calmante de la técnica box clásica 4-4-4-4.
 *
 * El círculo se anima con `transform: scale()`:
 *   - scale = 1.0  →  círculo en su tamaño máximo (inhalación completa)
 *   - scale = 0.3  →  círculo pequeño (exhalación completa / pausa)
 *
 * El campo `easing` define la curva de animación de cada fase
 * (sensación física de la respiración).
 */
const BOX_4_4_6_2 = {
  id: 'box-4-4-6-2',
  name: 'Box 4-4-6-2',
  description: 'Inhala, sostén, exhala y descansa. Cinco ciclos para reducir el estrés.',
  cycles: 5,
  totalDurationSec: (4 + 4 + 6 + 2) * 5,  // 80s
  phases: [
    {
      key: 'inhale',
      label: 'Inhala',
      hint: 'Inhala lentamente por la nariz',
      duration: 4,
      fromScale: 0.3,
      toScale: 1.0,
      easing: 'easeOut',     // arranca rápido, frena al final (sensación de llenado)
    },
    {
      key: 'hold',
      label: 'Sostén',
      hint: 'Mantén el aire en los pulmones',
      duration: 4,
      fromScale: 1.0,
      toScale: 1.0,
      easing: 'linear',       // estática
    },
    {
      key: 'exhale',
      label: 'Exhala',
      hint: 'Exhala suavemente por la boca',
      duration: 6,
      fromScale: 1.0,
      toScale: 0.3,
      easing: 'easeIn',       // frena al principio, acelera al final (sensación de vaciado)
    },
    {
      key: 'rest',
      label: 'Descansa',
      hint: 'Permanece en pausa antes de la siguiente inhalación',
      duration: 2,
      fromScale: 0.3,
      toScale: 0.3,
      easing: 'linear',
    },
  ],
};

/* ============================================
   Constantes del sistema de puntuación
   ============================================ */
const SCORING = {
  PER_CYCLE: 10,
  ALL_CYCLES_BONUS: 20,
  NO_PAUSE_BONUS: 50,
};

/* ============================================
   Mensajes motivacionales según puntuación
   ============================================ */
const MOTIVATIONAL_MESSAGES = [
  {
    min: 0,   max: 29,
    title: 'Empezaste a respirar',
    message: 'Cada ciclo cuenta. Vuelve mañana para sentir más calma.',
  },
  {
    min: 30,  max: 79,
    title: '¡Buen ritmo!',
    message: 'Tu cuerpo y mente te lo agradecen. Sigue practicando.',
  },
  {
    min: 80,  max: 149,
    title: '¡Excelente sesión!',
    message: 'Completaste la rutina. La respiración es tu aliada para el bienestar.',
  },
  {
    min: 150, max: Infinity,
    title: '¡Maestría en calma!',
    message: 'Sesión perfecta. Tu capacidad de enfocarte es admirable.',
  },
];

/**
 * Devuelve el mensaje motivacional para la puntuación dada.
 * @param {number} score
 * @returns {{title: string, message: string}}
 */
function getMotivationalMessage(score) {
  return MOTIVATIONAL_MESSAGES.find(m => score >= m.min && score <= m.max) || MOTIVATIONAL_MESSAGES[0];
}

/**
 * Calcula la "calma estimada" como porcentaje 0-100.
 * Fórmula: combina puntuación (70%) + completitud de ciclos (30%).
 * @param {number} score
 * @param {number} completedCycles
 * @param {number} totalCycles
 * @returns {number} 0-100
 */
function calcCalmPercent(score, completedCycles, totalCycles) {
  const scorePct = Math.min(100, (score / 150) * 100);
  const cyclesPct = totalCycles > 0 ? (completedCycles / totalCycles) * 100 : 0;
  return Math.round(scorePct * 0.7 + cyclesPct * 0.3);
}

// Exponer en window
window.RespiracionData = {
  PATTERNS: {
    BOX_4_4_6_2,
  },
  SCORING,
  getMotivationalMessage,
  calcCalmPercent,
};
