#!/bin/bash
set -euo pipefail

# 🧼 Limpia contenedores
echo "🧹 Limpiando contenedores..."
./scripts/clean_containters.sh 

# 💾 Guarda cambios en la rama actual
current_branch=$(git branch --show-current)

if [[ -z "$current_branch" ]]; then
  echo "❌ No estás en ninguna rama. Operación abortada."
  exit 1
fi

if [[ "$current_branch" == test/* ]]; then
  echo "⚠️ Ya estás en una rama de prueba ($current_branch). Operación no necesaria."
  exit 1
fi

echo "💾 Guardando cambios en '$current_branch'..."

# Verificar si hay cambios
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios para hacer commit."
else
  git add .
  read -p "Mensaje del commit (deja vacío para 'WIP: Save changes before test'): " commit_message
  commit_message=${commit_message:-"WIP: Save changes before test on $current_branch"}
  git commit -m "$commit_message"
fi

# 🧪 Crear rama de prueba
test_branch="test/${current_branch//\//-}-$(date +%s)"  # ej. test/feature-grafo-1717512259

echo "🧪 Creando rama temporal de prueba '$test_branch'..."
git checkout -b "$test_branch"

# Ejecutar pruebas
echo "🚀 Ejecutando pruebas..."
if ./scripts/start.sh; then
  echo "✅ Pruebas completadas con éxito en '$test_branch'."
else
  echo "❌ Pruebas fallidas en '$test_branch'. Revisa el log."
  exit 1
fi

echo "📌 Estás en la rama de pruebas '$test_branch'. Puedes continuar aquí o regresar a '$current_branch' luego con:"
echo "   git checkout $current_branch"
