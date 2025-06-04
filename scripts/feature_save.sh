#!/bin/bash
set -e

current_branch=$(git branch --show-current)

echo "Guardando cambios antes de cerrar la rama '$current_branch'"

read -p "Mensaje del commit para guardar cambios (deja vacío para omitir commit): " msg

if [[ -n "$msg" ]]; then
  git add .
  git commit -m "$msg"
fi

# Push con configuración upstream
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)
if [[ -z "$upstream" ]]; then
  echo "🔁 Estableciendo upstream para '$current_branch'..."
  git push --set-upstream origin "$current_branch"
else
  git push
fi

# Confirmar eliminación
read -p "¿Seguro que deseas eliminar la rama '$current_branch'? (s/n): " confirm
if [[ "$confirm" != "s" ]]; then
  echo "Cancelado."
  exit 0
fi

git checkout dev
git pull origin dev

git branch -d "$current_branch"
git push origin --delete "$current_branch"

echo "✅ Rama '$current_branch' cerrada y eliminada."
