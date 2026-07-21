#!/usr/bin/env python3
"""Recorta los estilos .epp2* del CSS del SENA (ronda 4 se movió)."""
from pathlib import Path

p = Path(r"C:\Users\Aprendiz Tarde\Desktop\zona segura\games\zona-segura-sena\css\styles.css")
src = p.read_text(encoding="utf-8").splitlines(keepends=True)

# Encontrar el inicio del bloque .epp2 (búsqueda de la primera línea .epp2 {)
start_idx = None
for i, line in enumerate(src):
    if line.strip().startswith(".epp2 {"):
        start_idx = i
        break

assert start_idx is not None, "No encontré inicio del bloque epp2"

# Recortar desde start_idx hasta el final (los estilos epp2 están al final del archivo)
nuevo = src[:start_idx]

# Añadir un comentario al final explicando el recorte
nuevo.append("\n")
nuevo.append("/* ============================================\n")
nuevo.append("   Los estilos de la ronda 4 (.epp2*) se movieron a un\n")
nuevo.append("   módulo independiente: games/epp.css\n")
nuevo.append("   ============================================ */\n")

p.write_text("".join(nuevo), encoding="utf-8")
print(f"Líneas: {len(src)} -> {len(nuevo)}")
print("OK")
