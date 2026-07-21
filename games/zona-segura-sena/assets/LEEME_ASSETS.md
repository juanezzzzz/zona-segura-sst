# Cómo agregar imágenes y sonidos reales al juego

El juego funciona perfectamente sin estos archivos (usa iconos SVG propios y sonido
sintetizado), así que puedes ir agregándolos de a poco sin romper nada. Cuando pongas
un archivo con el nombre exacto de abajo, el juego lo detecta y lo usa automáticamente.

---

## 🎵 Sonido

### Música de fondo (opcional)
- **Dónde:** `assets/sounds/background-music.mp3`
- **Qué buscar:** algo instrumental, alegre, en loop, sin voces (para no chocar con quien
  guía a los participantes). Duración no importa, el juego la repite en bucle.
- **Dónde conseguirlo gratis:** [Mixkit — Music](https://mixkit.co/free-stock-music/) o
  [Free Music Archive](https://freemusicarchive.org/) (verifica la licencia de cada pista,
  Mixkit no pide atribución).
- Si no pones el archivo, el juego simplemente no reproduce música de fondo — nada se rompe.

### Efectos de sonido (clic, acierto, error, giro, insignia)
- **Ya están resueltos** con sonido sintetizado (`js/sound.js`, Web Audio API) — no necesitas
  archivos para esto. Si más adelante quieres reemplazarlos por sonidos grabados reales
  (ej. de [Mixkit — SFX](https://mixkit.co/free-sound-effects/) o
  [Freesound.org](https://freesound.org/)), dime y te preparo el código para usar archivos
  en vez del sintetizador.

---

## 🖼️ Ilustraciones

Recomendado: **[unDraw](https://undraw.co/illustrations)** — SVG gratis, sin atribución
obligatoria, y puedes recolorear cada ilustración al verde institucional (`#39A900`) desde
la misma página antes de descargarla (tiene un selector de color).

Búsquedas sugeridas en unDraw: "safety first", "medicine", "team work", "well being",
"factory", "warehouse", "in thought" (para el eje mental).

Freepik es la alternativa si buscas algo más ilustrado/detallado, pero su plan gratis exige
atribución visible ("Designed by Freepik") — si la usas, avísame para agregar el crédito en
alguna esquina discreta del juego.

### Nombres de archivo esperados

| Dónde aparece | Archivo esperado | Tamaño sugerido |
|---|---|---|
| Fondo decorativo de la pantalla de bienvenida | `assets/images/welcome-illustration.svg` | ancho libre, se ajusta solo |
| Pantalla de cierre general (celebración) | `assets/images/final-illustration.svg` | ancho libre, se ajusta solo |

Si no pones estos archivos, esas pantallas se ven igual que ahora (con las formas verdes
decorativas que ya existen) — no aparece ningún ícono roto.

---

## Resumen rápido

1. Descarga tus ilustraciones/música.
2. Ponlas en `assets/images/` o `assets/sounds/` con el nombre EXACTO de la tabla de arriba.
3. Recarga el juego — no hay que tocar código.
