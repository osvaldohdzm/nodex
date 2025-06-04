#!/bin/bash
set -euo pipefail

current_branch=$(git symbolic-ref --short HEAD)

echo "Guardando cambios antes de eliminar la rama '$current_branch'"

read -rp "Mensaje del commit para guardar cambios (deja vacío para omitir commit): " msg
if [[ -n "$msg" ]]; then
  git add --all
  git commit -m "$msg"
fi

# Push con o sin upstream
if ! git rev-parse --abbrev-ref --symbolic-full-name "@{u}" &>/dev/null; then
  echo "🔁 Estableciendo upstream para '$current_branch'..."
  git push --set-upstream origin "$current_branch"
else
  git push
fi

read -rp "¿Seguro que deseas eliminar la rama '$current_branch'? (s/n): " confirm
if [[ "$confirm" != "s" ]]; then
  echo "Cancelado."
  exit 0
fi

# Cambiar a dev y hacer merge
git checkout dev
git pull origin dev
git merge --no-ff "$current_branch" -m "Merge desde '$current_branch' antes de eliminarla"
git push origin dev

# Eliminar rama local y remota
git branch -d "$current_branch"
git push origin --delete "$current_branch"

echo "✅ Rama '$current_branch' fusionada en 'dev' y eliminada con éxito."
