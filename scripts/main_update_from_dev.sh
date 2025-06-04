#!/bin/bash
set -euo pipefail

MAIN_BRANCH="main"   # O "master"
DEVELOP_BRANCH="dev"

echo "🔄 Actualizando la rama '$MAIN_BRANCH' con los cambios de '$DEVELOP_BRANCH'..."

# 1. Asegurar que estamos en la rama principal y está actualizada
echo "Cambiando a '$MAIN_BRANCH' y actualizando..."
git checkout "$MAIN_BRANCH"
git pull origin "$MAIN_BRANCH"

# 2. Asegurar que la rama de desarrollo está actualizada localmente (para el merge)
echo "Actualizando '$DEVELOP_BRANCH' localmente desde el origen..."
git fetch origin "$DEVELOP_BRANCH:$DEVELOP_BRANCH" # Actualiza la copia local de dev sin cambiar de rama

# 3. Fusionar develop en main
echo "Fusionando '$DEVELOP_BRANCH' en '$MAIN_BRANCH'..."
git merge --no-ff "$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $MAIN_BRANCH"
# Considera añadir la opción de ejecutar pruebas en main después del merge si son rápidas

# 4. Pushear main
echo "Haciendo push de '$MAIN_BRANCH'..."
git push origin "$MAIN_BRANCH"

# 5. Opcional: Crear una etiqueta (tag) para la "release"
read -p "¿Deseas crear una etiqueta para esta actualización de '$MAIN_BRANCH'? (s/n): " tag_confirm
if [[ "$tag_confirm" == "s" ]]; then
  latest_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
  read -p "Nombre de la nueva etiqueta (sugerencia basada en la última: $latest_tag -> ej. vX.Y.Z): " new_tag
  if [[ -n "$new_tag" ]]; then
    git tag -a "$new_tag" -m "Release $new_tag"
    git push origin "$new_tag"
    echo "✅ Etiqueta '$new_tag' creada y pusheada."
  else
    echo "ℹ️ No se creó ninguna etiqueta."
  fi
fi

echo "✅ Rama '$MAIN_BRANCH' actualizada con éxito desde '$DEVELOP_BRANCH'."
echo "👀 Considera cambiar de nuevo a '$DEVELOP_BRANCH' para continuar el desarrollo: git checkout $DEVELOP_BRANCH"