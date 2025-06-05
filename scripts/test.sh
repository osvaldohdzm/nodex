#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"

current_branch=$(git branch --show-current)

# Validar rama actual
if [[ "$current_branch" == "$DEVELOP_BRANCH" ]]; then
  echo "⚠️ Estás en la rama '$DEVELOP_BRANCH' (modo prueba)."

  # Guardar cambios si hay
  if ! git diff-index --quiet HEAD --; then
    read -rp "Tienes cambios sin commitear. Mensaje para commit (enter para 'WIP: Guardando cambios en $current_branch'): " msg
    msg=${msg:-"WIP: Guardando cambios en $current_branch"}
    git add .
    git commit -m "$msg"
    echo "✅ Cambios commiteados con mensaje: $msg"
  fi

  git push origin "$current_branch"

  # Ejecutar pruebas opcionalmente
  read -rp "¿Ejecutar pruebas en '$current_branch'? (s/n): " run_tests_confirm
  if [[ "$run_tests_confirm" == "s" ]]; then
    echo "🧪 Ejecutando pruebas..."
    if ! ./scripts/start.sh; then
      echo "❌ Pruebas fallaron. Abortando."
      exit 1
    fi
    echo "✅ Pruebas pasaron."
  fi

  echo "🏁 Proceso terminado para rama '$current_branch'."
  exit 0
fi

# Validar que la rama actual sea feature/*, hotfix/* o release/*
if ! [[ "$current_branch" =~ ^feature/.*$ || "$current_branch" =~ ^hotfix/.*$ || "$current_branch" =~ ^release/.*$ ]]; then
  echo "❌ Error: Este script debe ejecutarse desde una rama 'feature/*', 'hotfix/*' o 'release/*' (o 'dev')."
  echo "   Rama actual: '$current_branch'"
  exit 1
fi

test_branch="test/$current_branch"

echo "🏁 Preparando rama de pruebas: $test_branch"

stash_created=false

# Guardar cambios sin commit en stash
if ! git diff-index --quiet HEAD --; then
  echo "💾 Guardando cambios sin commitear en stash temporal..."
  git stash push -m "stash temporal para test en $current_branch"
  stash_created=true
fi

# Crear y cambiar a rama test/<branch> si no existe
if git show-ref --verify --quiet refs/heads/"$test_branch"; then
  echo "ℹ️ La rama $test_branch ya existe."
else
  echo "➕ Creando rama local $test_branch desde $current_branch"
  git checkout -b "$test_branch" "$current_branch"
fi

git checkout "$test_branch"

# Aplicar stash si se creó
if [ "$stash_created" = true ]; then
  echo "📥 Aplicando stash de cambios en $test_branch..."
  git stash pop

  read -rp "Mensaje para commit de cambios aplicados en $test_branch (enter para 'WIP: Cambios aplicados en test branch'): " commit_msg
  commit_msg=${commit_msg:-"WIP: Cambios aplicados en test branch"}

  git add .
  git commit -m "$commit_msg"
  echo "✅ Cambios guardados en commit: $commit_msg"
fi

git push origin "$test_branch"

# Ejecutar pruebas antes de continuar
read -rp "¿Ejecutar pruebas para '$test_branch' antes de continuar? (s/n): " run_tests_confirm
if [[ "$run_tests_confirm" == "s" ]]; then
  echo "🧪 Ejecutando pruebas..."
  if ! ./scripts/start.sh; then
    echo "❌ Pruebas fallaron. Abortando."
    exit 1
  fi
  echo "✅ Pruebas pasaron."
fi

# Actualizar rama test con últimos cambios de dev
echo "🔄 Actualizando '$test_branch' con '$DEVELOP_BRANCH'..."
git fetch origin "$DEVELOP_BRANCH"

read -rp "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$test_branch'? (r/m, recomendado r): " update_method
case "$update_method" in
  r)
    if ! git rebase "origin/$DEVELOP_BRANCH"; then
      echo "❌ Falló rebase. Resuelve conflictos y luego:"
      echo "   git rebase --continue"
      echo "   O para abortar:"
      echo "   git rebase --abort"
      exit 1
    fi
    git push origin "$test_branch" --force-with-lease
    ;;
  m)
    if ! git merge "origin/$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $test_branch"; then
      echo "❌ Conflictos en merge. Resuélvelos, haz commit y vuelve a ejecutar."
      exit 1
    fi
    git push origin "$test_branch"
    ;;
  *)
    echo "Opción inválida. Abortando."
    exit 1
    ;;
esac

# Cambiar a la rama original base
echo "🔀 Integrando '$test_branch' en rama base '$current_branch'..."

git checkout "$current_branch"

git pull origin "$current_branch"

git merge "$test_branch" -m "Integración desde $test_branch"

git push origin "$current_branch"

# Preguntar si eliminar rama test local y remoto
read -rp "¿Eliminar la rama test '$test_branch' local y remotamente? (s/n): " delete_test_branch
if [[ "$delete_test_branch" == "s" ]]; then
  git branch -d "$test_branch"
  git push origin --delete "$test_branch"
  echo "✅ Rama '$test_branch' eliminada."
fi

echo "🎉 Integración completada exitosamente."
