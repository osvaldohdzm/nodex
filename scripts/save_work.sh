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
  git commit -m "$commit_message"
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

echo "🌐 Sincronizando ramas locales con sus remotas..."

# Obtener ramas locales con seguimiento remoto
while read -r branch; do
  branch_name=$(echo "$branch" | awk '{print $1}')
  remote_name=$(git for-each-ref --format='%(upstream:short)' refs/heads/"$branch_name")

  # Saltar si no hay upstream o es la rama actual
  if [[ -z "$remote_name" || "$branch_name" == "$current_branch" ]]; then
    continue
  fi

  echo "🔄 Cambiando a '$branch_name' para sincronizar con '$remote_name'..."
  git switch "$branch_name" >/dev/null
  git pull --ff-only

done < <(git branch --format='%(refname:short)')

# Volver a la rama original
git switch "$current_branch" >/dev/null

echo "✅ Todas las ramas locales con upstream han sido sincronizadas con sus ramas remotas."
