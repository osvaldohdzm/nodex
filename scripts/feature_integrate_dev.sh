#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"

current_branch=$(git branch --show-current)

if [[ ! "$current_branch" == feature/* ]]; then
  echo "❌ Este script debe ejecutarse desde una rama 'feature/*'."
  echo "   Rama actual: $current_branch"
  exit 1
fi

echo "🏁 Finalizando la feature: $current_branch"

# 1. Guardar cualquier cambio pendiente
echo "💾 Verificando cambios pendientes en '$current_branch'..."
if ! git diff-index --quiet HEAD --; then
  read -p "Tienes cambios sin commitear. Mensaje para el commit (o deja vacío para 'WIP: Finalizing feature'): " msg
  if [[ -z "$msg" ]]; then
    msg="WIP: Finalizing feature $current_branch"
  fi
  git add .
  git commit -m "$msg"
fi
git push origin "$current_branch" # Asegurar que el remoto está actualizado

# 2. Opcional: Ejecutar pruebas antes de fusionar (si no se hizo en pre-commit)
read -p "¿Ejecutar pruebas para '$current_branch' antes de continuar? (s/n): " run_tests_confirm
if [[ "$run_tests_confirm" == "s" ]]; then
  echo "🧪 Ejecutando pruebas..."
  # ./scripts/run-tests.sh || { echo "❌ Pruebas fallidas. Abortando."; exit 1; }
  echo "✅ (Placeholder) Pruebas pasaron." # Reemplaza con tu script de pruebas real
fi

# 3. Actualizar la rama feature con los últimos cambios de develop (rebase es preferido)
echo "🔄 Actualizando '$current_branch' con los últimos cambios de '$DEVELOP_BRANCH'..."
git fetch origin "$DEVELOP_BRANCH"
read -p "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$current_branch' desde '$DEVELOP_BRANCH'? (r/m, recomendado r): " update_method
if [[ "$update_method" == "r" ]]; then
  if ! git rebase "origin/$DEVELOP_BRANCH"; then
    echo "❌ Falló el rebase. Por favor, resuelve los conflictos y luego ejecuta:"
    echo "   git rebase --continue"
    echo "   O para abortar:"
    echo "   git rebase --abort"
    exit 1
  fi
  echo "⏫ Forzando push de la rama rebaseada (necesario después de rebase)..."
  git push origin "$current_branch" --force-with-lease
elif [[ "$update_method" == "m" ]]; then
  if ! git merge "origin/$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $current_branch"; then
    echo "❌ Conflictos detectados durante el merge."
    echo "Por favor resuelve los conflictos y haz commit antes de continuar."
    exit 1
  fi
  git push origin "$current_branch"
else
  echo "Opción inválida. Abortando."
  exit 1
fi
echo "✅ Rama '$current_branch' actualizada y pusheada."

# 4. Cambiar a la rama de desarrollo y actualizarla
echo "🔄 Cambiando a '$DEVELOP_BRANCH' y actualizándola..."
git checkout "$DEVELOP_BRANCH"
git pull origin "$DEVELOP_BRANCH"

# 5. Obtener el último mensaje de commit de la rama feature
last_commit_msg=$(git log -1 --pretty=format:%s "$current_branch")

# 6. Probar merge para detectar conflictos sin afectar el estado actual
echo "🔎 Probando merge para detectar conflictos..."
if ! git merge --no-commit --no-ff "$current_branch"; then
  echo "❌ Conflictos detectados durante el merge de prueba. Abortando merge automático."
  git merge --abort
  echo "Por favor resuelve los conflictos en '$DEVELOP_BRANCH' manualmente."
  echo "Luego haz 'git add <archivos_resueltos>' y 'git commit',"
  echo "y vuelve a ejecutar este script o realiza el push manualmente."
  exit 1
else
  git reset --hard HEAD  # Deshacer merge de prueba para mantener el estado limpio
fi

# 7. Fusionar la rama feature en develop con mensaje personalizado
merge_msg="Merge feature: $current_branch

Último commit en $current_branch:
$last_commit_msg"

echo "🔗 Fusionando '$current_branch' en '$DEVELOP_BRANCH' con mensaje:"
echo "-----------------------------------"
echo "$merge_msg"
echo "-----------------------------------"

if ! git merge --no-ff "$current_branch" -m "$merge_msg"; then
  echo "❌ Error inesperado durante merge."
  exit 1
fi

# 8. Pushear develop
echo "⏫ Haciendo push de '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# 9. Eliminar la rama feature local y remotamente
read -p "¿Eliminar la rama '$current_branch' local y remotamente? (s/n): " delete_confirm
if [[ "$delete_confirm" == "s" ]]; then
  echo "🗑️ Eliminando rama '$current_branch' localmente..."
  git branch -d "$current_branch"
  echo "🗑️ Eliminando rama '$current_branch' remotamente..."
  git push origin --delete "$current_branch"
  echo "✅ Rama '$current_branch' eliminada."
else
  echo "ℹ️ Rama '$current_branch' no eliminada."
fi

echo "🎉 Feature '$current_branch' integrada exitosamente en '$DEVELOP_BRANCH'."
