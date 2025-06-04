#!/bin/bash
set -e

if [[ -z "$1" ]]; then
  echo "Uso: $0 <nombre-de-la-rama>"
  exit 1
fi

branch="$1"

echo "🚀 Actualizando archivos de $branch con versiones de main para archivos comunes..."

# Cambiar a la rama target
git checkout "$branch"

# Hacer stash si hay cambios locales para permitir cambiar de rama
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Cambios locales detectados, haciendo stash temporal..."
  git stash push -m "stash temporal para actualizar main"
  stash_done=true
else
  stash_done=false
fi

# Cambiar a main y actualizar
git checkout main
git pull origin main

# Volver a la rama feature
git checkout "$branch"

# Reaplicar stash si lo hicimos antes
if [ "$stash_done" = true ]; then
  echo "♻️  Reaplicando stash..."
  git stash pop || echo "⚠️  Conflictos al reaplicar stash, resuélvelos manualmente"
fi

# Obtener lista de archivos en main
files_in_main=$(git ls-tree -r --name-only main)

# Iterar y reemplazar archivos que existan en ambas ramas
echo "$files_in_main" | while read -r file; do
  if [[ -f "$file" ]]; then
    git checkout main -- "$file"
    echo "Actualizado: $file"
  fi
done

git add .
git commit -m "Actualizar archivos existentes con versiones de main"

echo "✅ Rama $branch actualizada con versiones de archivos de main, archivos propios se mantienen."
