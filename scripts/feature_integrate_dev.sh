#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"

select_feature_branch() {
  echo "🔍 No estás en una rama 'feature/*'. Listando ramas 'feature/*' disponibles (locales y remotas)..."

  # Obtener ramas locales feature/*
  mapfile -t local_features < <(git branch --list 'feature/*' --sort=-committerdate | sed 's/^[* ]*//')

  # Obtener ramas remotas feature/* (quitando prefijo origin/)
  mapfile -t remote_features < <(git branch -r --list 'origin/feature/*' --sort=-committerdate | sed 's|origin/||' | sed 's/^[ *]*//')

  # Combinar locales y remotas sin duplicados
  feature_branches=("${local_features[@]}")

  for remote_branch in "${remote_features[@]}"; do
    if [[ ! " ${feature_branches[*]} " =~ " ${remote_branch} " ]]; then
      feature_branches+=("$remote_branch")
    fi
  done

  if [[ ${#feature_branches[@]} -eq 0 ]]; then
    echo "❌ No hay ramas 'feature/*' disponibles para seleccionar."
    exit 1
  elif [[ ${#feature_branches[@]} -eq 1 ]]; then
    echo "✅ Sólo hay una rama feature disponible: ${feature_branches[0]}"
    echo "${feature_branches[0]}"
  else
    echo "Selecciona la rama feature por número:"
    for i in "${!feature_branches[@]}"; do
      echo "  $((i+1))) ${feature_branches[i]}"
    done

    while true; do
      read -rp "Número de la rama feature a usar: " selection
      if [[ "$selection" =~ ^[0-9]+$ ]] && (( selection >= 1 && selection <= ${#feature_branches[@]} )); then
        selected_branch="${feature_branches[selection-1]}"
        echo "✅ Has seleccionado: $selected_branch"
        echo "$selected_branch"
        break
      else
        echo "❌ Selección inválida. Por favor, ingresa un número válido."
      fi
    done
  fi
}


current_branch=$(git branch --show-current)

if [[ "$current_branch" == feature/* ]]; then
  feature_branch="$current_branch"
else
  feature_branch=$(select_feature_branch)
fi

echo "🏁 Finalizando la feature: $feature_branch"

# 1. Guardar cualquier cambio pendiente
echo "💾 Verificando cambios pendientes en '$feature_branch'..."
if ! git diff-index --quiet HEAD --; then
  read -rp "Tienes cambios sin commitear. Mensaje para el commit (o deja vacío para 'WIP: Finalizing feature'): " msg
  if [[ -z "$msg" ]]; then
    msg="WIP: Finalizing feature $feature_branch"
  fi
  git add .
  git commit -m "$msg"
fi
git push origin "$feature_branch" # Asegurar que el remoto está actualizado

# 2. Opcional: Ejecutar pruebas antes de fusionar (si no se hizo en pre-commit)
read -rp "¿Ejecutar pruebas para '$feature_branch' antes de continuar? (s/n): " run_tests_confirm
if [[ "$run_tests_confirm" == "s" ]]; then
  echo "🧪 Ejecutando pruebas..."
  # ./scripts/run-tests.sh || { echo "❌ Pruebas fallidas. Abortando."; exit 1; }
  echo "✅ (Placeholder) Pruebas pasaron." # Reemplaza con tu script de pruebas real
fi

# 3. Actualizar la rama feature con los últimos cambios de develop (rebase es preferido)
echo "🔄 Actualizando '$feature_branch' con los últimos cambios de '$DEVELOP_BRANCH'..."
git fetch origin "$DEVELOP_BRANCH"
read -rp "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$feature_branch' desde '$DEVELOP_BRANCH'? (r/m, recomendado r): " update_method
if [[ "$update_method" == "r" ]]; then
  if ! git rebase "origin/$DEVELOP_BRANCH"; then
    echo "❌ Falló el rebase. Por favor, resuelve los conflictos y luego ejecuta:"
    echo "   git rebase --continue"
    echo "   O para abortar:"
    echo "   git rebase --abort"
    exit 1
  fi
  echo "⏫ Forzando push de la rama rebaseada (necesario después de rebase)..."
  git push origin "$feature_branch" --force-with-lease
elif [[ "$update_method" == "m" ]]; then
  if ! git merge "origin/$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $feature_branch"; then
    echo "❌ Conflictos detectados durante el merge."
    echo "Por favor resuelve los conflictos y haz commit antes de continuar."
    exit 1
  fi
  git push origin "$feature_branch"
else
  echo "Opción inválida. Abortando."
  exit 1
fi
echo "✅ Rama '$feature_branch' actualizada y pusheada."

# 4. Cambiar a la rama de desarrollo y actualizarla
echo "🔄 Cambiando a '$DEVELOP_BRANCH' y actualizándola..."
git checkout "$DEVELOP_BRANCH"
git pull origin "$DEVELOP_BRANCH"

# 5. Obtener el último mensaje de commit de la rama feature
last_commit_msg=$(git log -1 --pretty=format:%s "$feature_branch")

# 6. Probar merge para detectar conflictos sin afectar el estado actual
echo "🔎 Probando merge para detectar conflictos..."
if ! git merge --no-commit --no-ff "$feature_branch"; then
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
merge_msg="Merge feature: $feature_branch

Último commit en $feature_branch:
$last_commit_msg"

echo "🔗 Fusionando '$feature_branch' en '$DEVELOP_BRANCH' con mensaje:"
echo "-----------------------------------"
echo "$merge_msg"
echo "-----------------------------------"

if ! git merge --no-ff "$feature_branch" -m "$merge_msg"; then
  echo "❌ Error inesperado durante merge."
  exit 1
fi

# 8. Pushear develop
echo "⏫ Haciendo push de '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# 9. Eliminar la rama feature local y remotamente
read -rp "¿Eliminar la rama '$feature_branch' local y remotamente? (s/n): " delete_confirm
if [[ "$delete_confirm" == "s" ]]; then
  echo "🗑️ Eliminando rama '$feature_branch' localmente..."
  git branch -d "$feature_branch"
  echo "🗑️ Eliminando rama '$feature_branch' remotamente..."
  git push origin --delete "$feature_branch"
  echo "✅ Rama '$feature_branch' eliminada."
else
  echo "ℹ️ Rama '$feature_branch' no eliminada."
fi

echo "🎉 Feature '$feature_branch' integrada exitosamente en '$DEVELOP_BRANCH'."
