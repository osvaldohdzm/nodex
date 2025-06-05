#!/bin/bash
set -euo pipefail

# 🧼 Limpia contenedores
echo "🧹 Limpiando contenedores..."
./scripts/clean_containters.sh 

# Obtener rama actual
current_branch=$(git branch --show-current)

if [[ -z "$current_branch" ]]; then
  echo "❌ No estás en ninguna rama. Operación abortada."
  exit 1
fi

# Validar que la rama actual sea feature/* o hotfix/*
if [[ ! "$current_branch" =~ ^(feature|hotfix)/ ]]; then
  echo "❌ Solo puedes iniciar pruebas desde ramas 'feature/*' o 'hotfix/*'. Estás en '$current_branch'."
  exit 1
fi

# Verificar si ya existe alguna rama test para esta rama base y enumerarla
base_branch_name="${current_branch//\//-}"
existing_tests=($(git branch --list "test/${base_branch_name}-*"))
count=${#existing_tests[@]}

# Crear nuevo índice para la rama test, con 3 dígitos
new_index=$(printf "%02d" $((count + 1)))
test_branch="test/${base_branch_name}-${new_index}"

echo "💾 Guardando cambios en '$current_branch'..."

# Verificar si hay cambios sin commit
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios para hacer commit."
else
  git add .
  read -p "Mensaje del commit (deja vacío para 'WIP: Save changes before test'): " commit_message
  commit_message=${commit_message:-"WIP: Save changes before test on $current_branch"}
  git commit -m "$commit_message"
fi

# Crear rama test nueva
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
