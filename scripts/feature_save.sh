#!/bin/bash
set -euo pipefail

current_branch=$(git branch --show-current)

if [[ "$current_branch" != test/* ]]; then
  echo "❌ Este script solo se debe usar en ramas 'test/*'."
  exit 1
fi

echo "📍 Estás en la rama de prueba '$current_branch'"

read -p "➡️ ¿A qué rama quieres llevar estos cambios? (ej: feature/grafo): " target_branch

# Verifica si la rama existe
if ! git show-ref --verify --quiet "refs/heads/$target_branch"; then
  echo "❌ La rama '$target_branch' no existe localmente. Aborta o créala primero."
  exit 1
fi

echo "📦 Haciendo squash merge de '$current_branch' → '$target_branch'..."
git switch "$target_branch"
git merge --squash "$current_branch"

echo "✅ Cambios listos para commit en '$target_branch'."
read -p "📝 Mensaje del commit (deja vacío para 'feat: cambios desde $current_branch'): " msg
msg=${msg:-"feat: cambios desde $current_branch"}
git commit -m "$msg"

read -p "🚀 ¿Quieres hacer push a origin/$target_branch? (s/n): " push_confirm
if [[ "$push_confirm" == "s" ]]; then
  git push
fi

read -p "🗑️ ¿Eliminar rama de prueba '$current_branch'? (s/n): " delete_confirm
if [[ "$delete_confirm" == "s" ]]; then
  git branch -d "$current_branch"
  git push origin --delete "$current_branch" || true
  echo "✅ Rama de prueba '$current_branch' eliminada."
fi
