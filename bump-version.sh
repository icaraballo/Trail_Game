#!/usr/bin/env bash
# Sube el build del juego en los 3 sitios donde vive el número:
#   - js/save.js        → const GAME_BUILD=NN
#   - index.html         → <title>Trail Game · vNN</title>
#   - index.html         → las 11 query strings ?v=NN de cache-busting de los <script>
#
# Uso: ./bump-version.sh <nuevo-build>
# Ejemplo: ./bump-version.sh 65
#
# Filosofía: el juego no tiene paso de build. Este script es una herramienta
# de desarrollo que se ejecuta a mano cuando toca subir de versión — no se
# invoca desde el propio juego ni cambia cómo se sirve/abre index.html.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Uso: $0 <nuevo-build>" >&2
  exit 1
fi

NEW="$1"
if ! [[ "$NEW" =~ ^[0-9]+$ ]]; then
  echo "Error: el build debe ser un número entero (recibido: '$NEW')" >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAVE_JS="$DIR/js/save.js"
INDEX_HTML="$DIR/index.html"

for f in "$SAVE_JS" "$INDEX_HTML"; do
  if [ ! -f "$f" ]; then
    echo "Error: no encuentro $f (¿ejecutas el script desde la raíz del repo?)" >&2
    exit 1
  fi
done

OLD="$(grep -oE 'const GAME_BUILD=[0-9]+' "$SAVE_JS" | grep -oE '[0-9]+' || true)"
if [ -z "$OLD" ]; then
  echo "Error: no se encontró 'const GAME_BUILD=NN' en $SAVE_JS" >&2
  exit 1
fi

if [ "$NEW" = "$OLD" ]; then
  echo "El build ya es v$OLD. Nada que hacer." >&2
  exit 1
fi

if [ "$NEW" -lt "$OLD" ]; then
  read -r -p "Aviso: el build actual es v$OLD y vas a poner v$NEW (menor). ¿Continuar? [y/N] " REPLY
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 1
  fi
fi

# 1) js/save.js — const GAME_BUILD=NN
sed -i.bak -E "s/const GAME_BUILD=[0-9]+/const GAME_BUILD=$NEW/" "$SAVE_JS"

# 2) index.html — <title>
sed -i.bak -E "s/(<title>Trail Game · v)[0-9]+(<\/title>)/\1$NEW\2/" "$INDEX_HTML"

# 3) index.html — 11 query strings ?v=NN de los scripts js/*.js
# T53 (v92): el patrón era [a-zA-Z]+ y render-core.js lleva guion — sin el
# guion aquí, los tres ficheros de render se quedaban sin actualizar y en
# silencio: el script decía "OK" y el navegador servía caché vieja.
sed -i.bak -E "s/(js\/[a-zA-Z-]+\.js\?v=)[0-9]+/\1$NEW/g" "$INDEX_HTML"

rm -f "$SAVE_JS.bak" "$INDEX_HTML.bak"

echo "Build actualizado: v$OLD -> v$NEW"
echo
echo "Sitios modificados:"
echo "  - js/save.js            (GAME_BUILD)"
echo "  - index.html <title>"
echo "  - index.html (11 query strings ?v= de los <script>)"
echo
echo "Verifica con: ./check-version.sh"
