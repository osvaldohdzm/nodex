#!/bin/bash
set -euo pipefail

echo "🧹 Limpiando contenedores..."
./scripts/clean_containters.sh 

# Obtener rama actual
current_branch=$(git branch --show-current)

if [[ -z "$current_branch" ]]; then
  echo "❌ No estás en ninguna rama. Operación abortada."
  exit 1
fi

# Extraer nombre del feature para test
if [[ "$current_branch" =~ ^(feature|hotfix)/(.+)$ ]]; then
  feature_id="${BASH_REMATCH[2]}"
elif [[ "$current_branch" =~ ^test/([^/]+)/test[0-9]{2}$ ]]; then
  feature_id="${BASH_REMATCH[1]}"
else
  echo "❌ Rama no válida. Usa 'feature/*', 'hotfix/*' o ramas 'test/xxx/testNN'."
  exit 1
fi

# Buscar ramas previas de test
test_prefix="test/${feature_id}/test"
existing_tests=$(git branch --list "${test_prefix}[0-9][0-9]" | sed 's/.*test\([0-9][0-9]\)$/\1/' | sort -n)
last_index=$(echo "$existing_tests" | tail -n 1 || echo "00")
next_index=$(printf "%02d" $((10#$last_index + 1)))
test_branch="test/${feature_id}/test${next_index}"

echo "💾 Guardando cambios en '$current_branch'..."

if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios para hacer commit."
else
  git add .
  read -p "Mensaje del commit (deja vacío para 'WIP: Save changes before test'): " commit_message
  commit_message=${commit_message:-"WIP: Save changes before test on $current_branch"}
  git commit -m "$commit_message"
fi

echo "🧪 Creando rama de prueba '$test_branch'..."
git checkout -b "$test_branch"

echo "🚀 Ejecutando pruebas..."
if ./scripts/start.sh; then
  echo "✅ Pruebas completadas con éxito en '$test_branch'."
else
  echo "❌ Pruebas fallidas en '$test_branch'."
  exit 1
fi

echo "📌 Estás en '$test_branch'. Puedes volver con:"
echo "   git checkout $current_branch"
