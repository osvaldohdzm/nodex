#!/bin/bash
set -euo pipefail

current_branch=$(git branch --show-current)

if [[ -z "$current_branch" ]]; then
  echo "❌ No estás en ninguna rama. Operación abortada."
  exit 1
fi

echo "💾 Guardando cambios en la rama '$current_branch'..."

if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios para hacer commit."
else
  git add .
  read -p "Mensaje del commit (deja vacío para mensaje por defecto 'WIP: Save changes'): " commit_message
  if [[ -z "$commit_message" ]]; then
    commit_message="WIP: Save changes on $current_branch"
  fi
  git commit -m "$commit_message"
fi

upstream=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)
if [[ -z "$upstream" ]]; then
  echo "🔁 Estableciendo upstream para '$current_branch' y haciendo push..."
  if ! git push --set-upstream origin "$current_branch"; then
    echo "❌ Error en git push. Verifica tus credenciales o conexión."
    exit 1
  fi
else
  echo "⏫ Haciendo push a '$upstream'..."
  if ! git push; then
    echo "❌ Error en git push. Verifica tus credenciales o conexión."
    exit 1
  fi
fi

echo "🌐 Sincronizando ramas locales con sus remotas..."

while read -r branch; do
  branch_name=$(echo "$branch" | awk '{print $1}')
  remote_name=$(git for-each-ref --format='%(upstream:short)' refs/heads/"$branch_name")

  if [[ -z "$remote_name" || "$branch_name" == "$current_branch" ]]; then
    continue
  fi

  echo "🔄 Cambiando a '$branch_name' para sincronizar con '$remote_name'..."
  git switch "$branch_name" >/dev/null
  git pull --ff-only
done < <(git branch --format='%(refname:short)')

git switch "$current_branch" >/dev/null

echo "✅ Todas las ramas locales con upstream han sido sincronizadas con sus ramas remotas."
