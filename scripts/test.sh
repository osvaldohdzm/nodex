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

# Para ramas feature/*, hotfix/*, release/* solo
if ! [[ "$current_branch" =~ ^feature/.*$ || "$current_branch" =~ ^hotfix/.*$ || "$current_branch" =~ ^release/.*$ ]]; then
  echo "❌ Error: Este script debe ejecutarse desde una rama 'feature/*', 'hotfix/*', 'release/*' o 'dev' para pruebas."
  echo "   Rama actual: '$current_branch'"
  exit 1
fi

echo "🏁 Iniciando finalización de rama: $current_branch"

# Guardar cambios pendientes si existen
echo "💾 Verificando cambios pendientes en '$current_branch'..."
if ! git diff-index --quiet HEAD --; then
  read -rp "Tienes cambios sin commitear. Mensaje para commit (enter para 'WIP: Finalizando $current_branch'): " msg
  msg=${msg:-"WIP: Finalizando $current_branch"}
  git add .
  git commit -m "$msg"
  echo "✅ Cambios commiteados con mensaje: $msg"
fi

git push origin "$current_branch"

# Ejecutar pruebas antes de continuar
read -rp "¿Ejecutar pruebas para '$current_branch' antes de continuar? (s/n): " run_tests_confirm
if [[ "$run_tests_confirm" == "s" ]]; then
  echo "🧪 Ejecutando pruebas..."
  if ! ./scripts/run-tests.sh; then
    echo "❌ Pruebas fallaron. Abortando."
    exit 1
  fi
  echo "✅ Pruebas pasaron."
fi

# Actualizar rama actual con últimos cambios de dev
echo "🔄 Actualizando '$current_branch' con '$DEVELOP_BRANCH'..."
git fetch origin "$DEVELOP_BRANCH"

read -rp "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$current_branch'? (r/m, recomendado r): " update_method
case "$update_method" in
  r)
    if ! git rebase "origin/$DEVELOP_BRANCH"; then
      echo "❌ Falló rebase. Resuelve conflictos y luego:"
      echo "   git rebase --continue"
      echo "   O para abortar:"
      echo "   git rebase --abort"
      exit 1
    fi
    git push origin "$current_branch" --force-with-lease
    ;;
  m)
    if ! git merge "origin/$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $current_branch"; then
      echo "❌ Conflictos en merge. Resuélvelos, haz commit y vuelve a ejecutar."
      exit 1
    fi
    git push origin "$current_branch"
    ;;
  *)
    echo "Opción inválida. Abortando."
    exit 1
    ;;
esac

echo "✅ Rama '$current_branch' actualizada."

# Cambiar a dev y actualizarla
echo "🔄 Cambiando a '$DEVELOP_BRANCH' y actualizándola..."
git checkout "$DEVELOP_BRANCH"
git pull origin "$DEVELOP_BRANCH"

# Obtener último mensaje de commit de la rama actual
last_commit_msg=$(git log -1 --pretty=format:%s "$current_branch")

# Probar merge sin commit para detectar conflictos
echo "🔎 Probando merge para detectar conflictos..."
if ! git merge --no-commit --no-ff "$current_branch"; then
  echo "❌ Conflictos detectados en merge de prueba. Abortando."
  git merge --abort
  echo "Resuelve manualmente los conflictos en '$DEVELOP_BRANCH'."
  exit 1
else
  git reset --hard HEAD
fi

# Realizar merge final con mensaje personalizado
merge_msg="Merge $current_branch

Último commit en $current_branch:
$last_commit_msg"

echo "🔗 Fusionando '$current_branch' en '$DEVELOP_BRANCH'..."
git merge --no-ff "$current_branch" -m "$merge_msg"

# Push de develop
echo "⏫ Haciendo push de '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# Preguntar para eliminar rama local y remota
read -rp "¿Eliminar rama '$current_branch' local y remotamente? (s/n): " delete_confirm
if [[ "$delete_confirm" == "s" ]]; then
  echo "🗑️ Eliminando rama '$current_branch' localmente y remotamente..."
  git branch -d "$current_branch"
  git push origin --delete "$current_branch"
  echo "✅ Rama '$current_branch' eliminada."
else
  echo "ℹ️ Rama '$current_branch' no eliminada."
fi

echo "🎉 Rama '$current_branch' integrada exitosamente en '$DEVELOP_BRANCH'."
