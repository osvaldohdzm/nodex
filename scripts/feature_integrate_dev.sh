#!/bin/bash
set -euo pipefail

current_branch=$(git branch --show-current)

if [[ "$current_branch" != test/* ]]; then
  echo "❌ Este script solo se debe usar en ramas 'test/*'."
  exit 1
fi

echo "📍 Estás en la rama de prueba '$current_branch'"

# Buscar ramas feature locales
mapfile -t feature_branches < <(git branch --list 'feature/*' --format='%(refname:short)')

if [[ ${#feature_branches[@]} -eq 0 ]]; then
  echo "❌ No hay ramas 'feature/*' locales para seleccionar."
  exit 1
fi

echo "📂 Selecciona la rama feature a la que quieres llevar los cambios:"
for i in "${!feature_branches[@]}"; do
  echo "  [$i] ${feature_branches[$i]}"
done

read -p "Número de rama destino: " selection

if ! [[ "$selection" =~ ^[0-9]+$ ]] || (( selection < 0 || selection >= ${#feature_branches[@]} )); then
  echo "❌ Selección inválida."
  exit 1
fi

target_branch="${feature_branches[$selection]}"
echo "➡️ Guardando cambios en '$target_branch'..."

# Stash cambios sin stage para poder cambiar de rama
stash_needed=false
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️ Cambios sin guardar detectados. Guardando en stash temporal para cambiar de rama..."
  git stash push -u -m "stash temporal antes de cambiar a $target_branch"
  stash_needed=true
fi

# Cambiar a la rama feature
git switch "$target_branch"

# Si hubo stash, recuperarlo
if $stash_needed; then
  echo "♻️ Recuperando cambios desde stash..."
  git stash pop || echo "❗ Conflictos al aplicar stash. Resuélvelos manualmente."
fi

# Verificar si la rama test ya está integrada
if git merge-base --is-ancestor "$current_branch" "$target_branch"; then
  echo "✅ La rama '$target_branch' ya contiene los cambios de '$current_branch'. No hay nada que hacer."
else
  # Hacer squash merge de la rama test
  git merge --squash "$current_branch"

  # Agregar todos los cambios al área para commit
  git add -A

  # Solo hacer commit si hay cambios
  if ! git diff --cached --quiet; then
    default_msg="feat: cambios desde $current_branch"
    read -p "📝 Mensaje del commit (deja vacío para '$default_msg'): " msg
    msg=${msg:-$default_msg}
    git commit -m "$msg"
    echo "✅ Cambios guardados en '$target_branch' (localmente)."
  else
    echo "ℹ️ No hay cambios para guardar (squash resultó vacío)."
  fi
fi

# Confirmar eliminación de la rama test
read -p "🗑️ ¿Eliminar rama de prueba '$current_branch' localmente y remotamente? (s/n): " delete_confirm
if [[ "$delete_confirm" == "s" ]]; then
  git branch -d "$current_branch"
  echo "✅ Rama de prueba '$current_branch' eliminada localmente."
else
  echo "❎ No se eliminó la rama de prueba."
fi
