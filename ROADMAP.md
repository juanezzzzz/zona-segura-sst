# Hoja de ruta · Front-end y experiencia de usuario

Ruta de desarrollo de Zona Segura, ordenada por impacto. Cada fase se puede entregar por separado.

---

## ✅ Fase 0 · Rediseño integral (hecho)

**Diagnóstico del proyecto anterior**

| Problema | Tipo |
|---|---|
| Tres lenguajes visuales distintos (landing oscura, EPP verde claro, Vocal/Respiración con degradado azul) | Visual |
| Encabezado de Vocal Hero y Respiración sin estilos: logo flotando, «Global0/1000» sin espacio | Visual |
| Selector de EPP con tarjetas gigantes en móvil; contenido desbordando la tarjeta | Visual |
| Imágenes de EPP con «transparencia» falsa (cuadrícula pintada en el PNG) | Visual |
| Puntaje máximo alcanzable 750/1000 (solo se juega un módulo de bienestar) y el logro de 800 puntos era casi imposible | Lógica |
| EPP: el máximo declarado (240) no coincidía con el real (200) y el resumen decía «0/6 áreas» con 4 áreas | Lógica |
| Vocal Hero daba siempre el bono «sin interrupciones»; la fase de inhalación nunca se ejecutaba | Lógica |
| Respiración: mensajes y «calma estimada» calculados sobre 150 cuando el máximo era 120 | Lógica |
| Ruleta: caer en «penitencia» quitaba 15 puntos por pura suerte | Lógica |
| «Reiniciar» dentro del módulo SENA borraba el puntaje de las otras etapas | Lógica |
| Se podía saltar a cualquier etapa por URL; el registro decía «Etapa 1 de 4 · Viste al trabajador» | Flujo |
| Redirecciones automáticas con cuenta regresiva que sacaban al usuario sin aviso | UX |
| Nombres insertados con `innerHTML` (riesgo de inyección en ranking y carnet) | Seguridad |
| 5,8 MB de imágenes duplicadas y GSAP incluido solo para transiciones | Rendimiento |

**Lo que se hizo**

- [x] Sistema de diseño único (`css/app.css`): tokens, tipografía (Archivo / Public Sans / JetBrains Mono), botones, tarjetas, HUD, diálogos, avisos.
- [x] Barra superior del recorrido con stepper, puntaje animado y control de sonido.
- [x] Estado único (`ZS.store`) con guardia de etapas y escala de puntos coherente (300 + 300 + 400 = 1000).
- [x] Contenido separado de la lógica (`js/data.js`).
- [x] Registro con carnet en vivo, chips de rol y validación accesible.
- [x] EPP: puntos sobre el personaje, hoja inferior en móvil, opción «No necesita», corrección explicada por zona.
- [x] Vocal Hero: anillo de progreso, medidor con umbral visible, detección instantánea, inhalación guiada, «saltar» y diálogo de silencio.
- [x] Respiración: orbe por fases, línea de tiempo del ciclo, pausa sin `confirm()`, pausa automática al cambiar de pestaña.
- [x] Retos SST: cinta con arrastre/clic/teclado, memorama con vista previa, ruleta justa (pregunta o reto valen igual).
- [x] Resultados: medidor, niveles, logros alcanzables, ranking local y certificado imprimible.
- [x] Limpieza de imágenes, eliminación de duplicados y de dependencias.

## ✅ Fase 0.5 · Menos fricción (hecho)

- [x] **Saltar etapa** desde la barra superior (con confirmación, conserva los puntos ganados) y **Saltar ronda** en cada reto.
- [x] Al quedarse sin vidas se puede reintentar o seguir adelante; ya no hay bloqueos.
- [x] Recorrido más corto (~8 min): 3 oficios de EPP sorteados, 6 ejercicios vocales, 3 ciclos de respiración, 6 situaciones en la cinta, 4 parejas y 2 giros.
- [x] Cinta con más tiempo por situación (15 s a 9 s, antes 12 s a 7 s).
- [x] Inicio rediseñado: cuadrilla de trabajadores con EPP en el hero, paradas con ilustración propia, bloque «¿Se complica? Sáltalo.», podio del equipo y navegación fija con botón de inicio.

---

## Fase 1 · Calidad y confianza (corto plazo)

- [ ] **Pruebas automatizadas** con Playwright: recorrido completo, guardia de etapas, puntajes máximos por módulo y regresiones visuales (capturas de 390 px y 1366 px).
- [ ] **Auditoría de accesibilidad** con axe-core en CI y prueba manual con NVDA/TalkBack.
- [ ] **GitHub Actions**: validación de HTML, `node --check`, Lighthouse CI (meta ≥ 95 en Rendimiento, Accesibilidad y Buenas prácticas).
- [ ] Fotos de *tapabocas* y *bata blanca* con fondo transparente real (las únicas que quedaron con fondo).
- [ ] Ilustración propia para el operador de maquinaria (hoy reutiliza la del soldador).
- [ ] Autoalojar las fuentes (`woff2`) para que el juego funcione 100 % sin internet.

## Fase 2 · Modo stand / kiosco (mediano plazo)

- [ ] **PWA instalable y offline** (service worker + manifest) para ferias y ambientes de formación sin red.
- [ ] **Modo facilitador** protegido con PIN: reiniciar ranking, exportar resultados a CSV, elegir duración del recorrido.
- [ ] Reinicio automático tras inactividad en la pantalla de resultados.
- [ ] Pantalla de ranking a pantalla completa para proyectar en el stand.
- [ ] Música de fondo opcional (el archivo ya está en `assets/sounds/`) con control de volumen independiente.

## Fase 3 · Aprendizaje más profundo

- [ ] **Banco de contenido ampliado** por centro de formación (más oficios para EPP: salud, construcción, agroindustria, laboratorio).
- [ ] Dificultad adaptativa en la cinta según el desempeño.
- [ ] **Repaso final personalizado**: lista de las situaciones y EPP que el participante falló, con su explicación.
- [ ] Modo por equipos (dos participantes compiten en la cinta).
- [ ] Versión con lectura en voz alta de las situaciones (Web Speech API) para personas con baja visión o baja alfabetización.

## Fase 4 · Plataforma

- [ ] Editor visual de contenido (JSON) para instructores, sin tocar código.
- [ ] Sincronización opcional de resultados con una hoja de cálculo o un backend ligero, con consentimiento explícito.
- [ ] Internacionalización (español / inglés) con textos extraídos a archivos de idioma.
- [ ] Certificado con código QR verificable.

---

### Principios de UX que guían el proyecto

1. **Un solo camino claro**: el usuario siempre sabe en qué etapa está y qué sigue.
2. **El error enseña**: toda respuesta incorrecta muestra la correcta y el porqué.
3. **Puntaje honesto**: lo que se ve durante el juego es exactamente lo que suma al total; la suerte nunca resta.
4. **Sin sorpresas**: nada navega solo; los reinicios piden confirmación.
5. **Nadie se queda atascado**: todo reto difícil tiene una salida visible y sin castigo extra.
6. **Para todos**: teclado, lectores de pantalla, movimiento reducido y móvil desde el inicio.
