#!/bin/bash
set -euo pipefail

echo "🧹 Limpiando contenedores..."
./scripts/clean_containters.sh 

echo "💾 Guardando cambios en Git..."

current_branch=$(git branch --show-current)

if [[ -z "$current_branch" ]]; then
  echo "❌ No estás en ninguna rama. Operación abortada."
  exit 1
fi

# Verificar si hay cambios para commitear
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios para hacer commit."
else
  git add .
  read -p "Mensaje del commit (deja vacío para mensaje por defecto 'WIP: Save changes before test'): " commit_message
  if [[ -z "$commit_message" ]]; then
    commit_message="WIP: Save changes before test on $current_branch"
  fi
  git commit -m "$commit_message"
fi

echo "🧪 Ejecutando pruebas..."
if ./scripts/start.sh; then
  echo "✅ Pruebas completadas con éxito."
else
  echo "❌ Pruebas fallidas. Revisa el log."
  exit 1
fi
