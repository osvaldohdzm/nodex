#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"
MAIN_BRANCH="main" # O "master", según tu configuración

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
  # ./scripts/run-tests.sh || { echo "❌ Pruebas fallidas. Abortando."; exit 1; } # Descomenta si tienes el script
  echo "✅ (Placeholder) Pruebas pasaron." # Reemplaza con tu script de pruebas real
fi

# 3. Actualizar la rama feature con los últimos cambios de develop (rebase es preferido)
echo "🔄 Actualizando '$current_branch' con los últimos cambios de '$DEVELOP_BRANCH'..."
git fetch origin "$DEVELOP_BRANCH"
read -p "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$current_branch' desde '$DEVELOP_BRANCH'? (r/m, recomendado r): " update_method
if [[ "$update_method" == "r" ]]; then
  git rebase "origin/$DEVELOP_BRANCH" || {
    echo "❌ Falló el rebase. Por favor, resuelve los conflictos y luego ejecuta 'git rebase --continue'."
    echo "   Si quieres abortar el rebase: 'git rebase --abort'."
    exit 1
  }
  echo "⏫ Forzando push de la rama rebaseada (necesario después de rebase)..."
  git push origin "$current_branch" --force-with-lease # Más seguro que --force
elif [[ "$update_method" == "m" ]]; then
  git merge "origin/$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $current_branch"
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

# 5. Fusionar la rama feature en develop
echo "🔗 Fusionando '$current_branch' en '$DEVELOP_BRANCH'..."
# --no-ff crea un commit de merge, manteniendo la historia de la feature.
# Puedes añadir una opción para hacer squash si prefieres: git merge --squash "$current_branch"
git merge --no-ff "$current_branch" -m "Merge feature: $current_branch"


# 6. Pushear develop
echo "⏫ Haciendo push de '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# 7. Eliminar la rama feature local y remotamente
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