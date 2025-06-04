#!/bin/bash
set -euo pipefail

current_branch=$(git branch --show-current)

if [[ -z "$current_branch" ]]; then
  echo "❌ No estás en ninguna rama. Operación abortada."
  exit 1
fi

echo "💾 Guardando cambios en la rama '$current_branch'..."

# Verificar si hay cambios para commitear
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios para hacer commit."
else
  git add .
  read -p "Mensaje del commit (deja vacío para mensaje por defecto 'WIP: Save changes'): " commit_message
  if [[ -z "$commit_message" ]]; then
    commit_message="WIP: Save changes on $current_branch"
  fi
  git commit -m "$commit_message" # Tu hook pre-commit (si está configurado) se ejecutará aquí
fi

# Push con configuración upstream si no existe
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)
if [[ -z "$upstream" ]]; then
  echo "🔁 Estableciendo upstream para '$current_branch' y haciendo push..."
  git push --set-upstream origin "$current_branch"
else
  echo "⏫ Haciendo push a '$upstream'..."
  git push
fi

echo "✅ Cambios guardados y enviados a remoto en '$current_branch'."