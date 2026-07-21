#!/usr/bin/env python3
"""Elimina el bloque de la ronda 4 (EPP) del main.js del SENA.
Ronda 4 se movió al módulo independiente games/epp.html."""
from pathlib import Path

p = Path(r"C:\Users\Aprendiz Tarde\Desktop\zona segura\games\zona-segura-sena\js\main.js")
src = p.read_text(encoding="utf-8")

# 1) Eliminar todo el bloque "RONDA 4 — VISTE A TU COMPAÑERO ..."
marcadores = [
    "// ==========================================================\n// RONDA 4",
    "// ==========================================================\n// PANTALLA DE CIERRE GENERAL",
]
i = src.find(marcadores[0])
j = src.find(marcadores[1], i)
assert i != -1 and j != -1, f"No encontré marcadores round4: i={i} j={j}"
bloque = src[i:j]
reemplazo_round4 = (
    "// ==========================================================\n"
    "// (Ronda 4 — \"Viste a tu Compañero\" se movió a un módulo\n"
    "// independiente: games/epp.html + epp.js + epp.css.\n"
    "// EPP_ITEMS sigue aquí porque el memorama (ronda 2) lo usa.)\n"
    "// ==========================================================\n\n"
)
src2 = src[:i] + reemplazo_round4 + src[j:]

# 2) Eliminar la rama screen-round4 dentro de la extensión de goToScreen
src2 = src2.replace(
    "  if (screenId === 'screen-round4') {\n    startRound4();\n  }\n",
    ""
)

# 3) Cambiar el botón round3-next-btn para ir directo a la pantalla final
src2 = src2.replace(
    "document.getElementById('round3-next-btn').addEventListener('click', () => {\n"
    "  // (Ronda 4 se movió a un módulo aparte: games/epp.html)\n"
    "  goToScreen('screen-final');\n"
    "});",
    "document.getElementById('round3-next-btn').addEventListener('click', () => {\n"
    "  // (Ronda 4 se juega en el módulo aparte games/epp.html)\n"
    "  goToScreen('screen-final');\n"
    "});"
)

p.write_text(src2, encoding="utf-8")
print(f"Líneas: {src.count(chr(10))} -> {src2.count(chr(10))}")
print(f"Bytes:  {len(src)} -> {len(src2)}")
print("OK")
