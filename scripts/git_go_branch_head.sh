#!/bin/bash
set -euo pipefail

echo "🧹 Limpiando archivos temporales y caches..."

# Limpieza fuerte de archivos temporales comunes
find . -type f \( -name '*.pyc' -o -name '*.pyo' -o -name '*.swp' -o -name '*.DS_Store' -o -name '*~' \) -exec rm -f {} + 2>/dev/null || true
find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

echo "📋 Listado de ramas locales disponibles:"
branches=($(git branch --format="%(refname:short)"))
for i in "${!branches[@]}"; do
  printf "%3d) %s\n" $((i+1)) "${branches[$i]}"
done

read -rp "👉 Ingresa el número de la rama a la que quieres cambiar: " branch_num

if ! [[ "$branch_num" =~ ^[0-9]+$ ]] || (( branch_num < 1 )) || (( branch_num > ${#branches[@]} )); then
  echo "❌ Número inválido. Abortando."
  exit 1
fi

branch="${branches[$((branch_num-1))]}"

echo "💥 Descargando todos los cambios locales (hard reset) en la rama '$branch'..."
git checkout "$branch"
git reset --hard HEAD

echo "✅ Operación completada. Rama '$branch' limpia y sincronizada."
