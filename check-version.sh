#!/usr/bin/env bash
# Comprueba que el número de build coincide en los 3 sitios donde vive:
#   - js/save.js  (const GAME_BUILD=NN, fuente de verdad)
#   - index.html  (<title>)
#   - index.html  (11 query strings ?v=NN de los <script src="js/*.js?v=...">)
#
# Uso: ./check-version.sh
# Sale con código 0 si todo coincide, 1 si hay algún sitio desincronizado.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAVE_JS="$DIR/js/save.js"
INDEX_HTML="$DIR/index.html"

for f in "$SAVE_JS" "$INDEX_HTML"; do
  if [ ! -f "$f" ]; then
    echo "Error: no encuentro $f (¿ejecutas el script desde la raíz del repo?)" >&2
    exit 1
  fi
done

FAIL=0

BUILD="$(grep -oE 'const GAME_BUILD=[0-9]+' "$SAVE_JS" | grep -oE '[0-9]+' || true)"
if [ -z "$BUILD" ]; then
  echo "FALLO: no se encontró 'const GAME_BUILD=NN' en js/save.js"
  exit 1
fi
echo "Build de referencia (js/save.js): v$BUILD"

TITLE_BUILD="$(grep -oE '<title>Trail Game · v[0-9]+</title>' "$INDEX_HTML" | grep -oE '[0-9]+' || true)"
if [ "$TITLE_BUILD" != "$BUILD" ]; then
  echo "FALLO  <title> de index.html dice v${TITLE_BUILD:-"(no encontrado)"}, debería ser v$BUILD"
  FAIL=1
else
  echo "OK     <title> coincide (v$BUILD)"
fi

# DS10 (v95): la lista estaba escrita a mano mientras bump-version.sh usa una
# regex, así que un .js nuevo se actualizaba pero no se comprobaba. Sale de index.html.
SCRIPTS=($(grep -oE 'js/[a-zA-Z-]+\.js\?v=' "$INDEX_HTML" | sed -E 's#^js/##; s#\.js\?v=$##'))
if [ "${#SCRIPTS[@]}" -eq 0 ]; then
  echo "FALLO: no se encontró ningún <script src=\"js/*.js?v=...\"> en index.html"
  exit 1
fi
for name in "${SCRIPTS[@]}"; do
  V="$(grep -oE "js/${name}\.js\?v=[0-9]+" "$INDEX_HTML" | grep -oE '[0-9]+' || true)"
  if [ -z "$V" ]; then
    echo "FALLO  no se encontró <script src=\"js/${name}.js?v=...\"> en index.html"
    FAIL=1
  elif [ "$V" != "$BUILD" ]; then
    echo "FALLO  js/${name}.js?v=$V no coincide (debería ser v$BUILD)"
    FAIL=1
  else
    echo "OK     js/${name}.js?v=$BUILD"
  fi
done

echo
if [ "$FAIL" -eq 1 ]; then
  echo "FALLO: hay sitios desincronizados. Corrige a mano o ejecuta ./bump-version.sh $BUILD"
  exit 1
fi

echo "OK: los 3 sitios coinciden en v$BUILD"
