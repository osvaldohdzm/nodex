#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"

# Función para listar ramas "padre" (sin /test al final) en local y remoto, ordenadas por fecha
list_parent_branches() {
  local pattern="$1" # ej: feature/*, hotfix/*, dev

  # Obtener ramas locales que coincidan con el patrón y que NO terminen en /test
  mapfile -t local_branches < <(git branch --list "$pattern" --sort=-committerdate | sed 's/^[* ]*//' | grep -v '/test$')

  # Obtener ramas remotas
  mapfile -t remote_branches < <(git branch -r --list "origin/$pattern" --sort=-committerdate | sed 's|origin/||' | grep -v '/test$')

  # Combinar sin duplicados
  branches=("${local_branches[@]}")
  for r in "${remote_branches[@]}"; do
    if [[ ! " ${branches[*]} " =~ " $r " ]]; then
      branches+=("$r")
    fi
  done

  echo "${branches[@]}"
}

select_branch() {
  local branches=("$@")
  if [[ ${#branches[@]} -eq 0 ]]; then
    echo "❌ No hay ramas disponibles para seleccionar." >&2
    exit 1
  elif [[ ${#branches[@]} -eq 1 ]]; then
    echo "${branches[0]}"
  else
    echo "Selecciona la rama por número:" >&2
    for i in "${!branches[@]}"; do
      echo "  $((i+1))) ${branches[i]}" >&2
    done
    while true; do
      read -rp "Número de la rama a usar: " selection
      if [[ "$selection" =~ ^[0-9]+$ ]] && (( selection >= 1 && selection <= ${#branches[@]} )); then
        echo "${branches[selection-1]}"
        break
      else
        echo "❌ Selección inválida. Intenta de nuevo." >&2
      fi
    done
  fi
}

# Detectar rama actual
current_branch=$(git branch --show-current)

if [[ "$current_branch" =~ /test$ ]]; then
  # Rama hija test detectada
  base_branch="${current_branch%/test}"
  >&2 echo "📂 Rama hija 'test' detectada: $current_branch"
  >&2 echo "📂 Rama base identificada: $base_branch"
  feature_branch="$current_branch"
else
  # No es rama test, verificar si es rama padre tipo feature/*, hotfix/* o dev
  if [[ "$current_branch" =~ ^(feature|hotfix|dev)/?.* ]]; then
    feature_branch="$current_branch"
  else
    # No es rama padre reconocida, listar ramas padre para elegir
    >&2 echo "🔍 No estás en una rama padre conocida. Listando ramas padres disponibles..."
    branches_to_choose=()
    # Puedes agregar más patrones si quieres manejar más tipos de ramas padre
    for pattern in "feature/*" "hotfix/*" "dev"; do
      readarray -t list < <(list_parent_branches "$pattern")
      branches_to_choose+=("${list[@]}")
    done
    # Remover duplicados
    mapfile -t unique_branches < <(printf '%s\n' "${branches_to_choose[@]}" | sort -u)

    feature_branch=$(select_branch "${unique_branches[@]}")
  fi
fi

echo "🏁 Finalizando la feature en rama: $feature_branch"

# Guardar cambios pendientes
echo "💾 Verificando cambios pendientes en '$feature_branch'..."
if ! git diff-index --quiet HEAD --; then
  read -rp "Tienes cambios sin commitear. Mensaje para el commit (o deja vacío para 'WIP: Finalizing feature'): " msg
  if [[ -z "$msg" ]]; then
    msg="WIP: Finalizing feature $feature_branch"
  fi
  git add .
  git commit -m "$msg"
fi
git push origin "$feature_branch"

# Preguntar por ejecutar pruebas
read -rp "¿Ejecutar pruebas para '$feature_branch' antes de continuar? (s/n): " run_tests_confirm
if [[ "$run_tests_confirm" == "s" ]]; then
  echo "🧪 Ejecutando pruebas..."
  # ./scripts/run-tests.sh || { echo "❌ Pruebas fallidas. Abortando."; exit 1; }
  echo "✅ (Placeholder) Pruebas pasaron."
fi

# Actualizar rama feature con develop (rebase o merge)
echo "🔄 Actualizando '$feature_branch' con '$DEVELOP_BRANCH'..."
git fetch origin "$DEVELOP_BRANCH"
read -rp "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$feature_branch'? (r/m, recomendado r): " update_method
if [[ "$update_method" == "r" ]]; then
  if ! git rebase "origin/$DEVELOP_BRANCH"; then
    echo "❌ Falló el rebase. Resuelve conflictos y luego ejecuta:"
    echo "   git rebase --continue"
    echo "   O para abortar:"
    echo "   git rebase --abort"
    exit 1
  fi
  echo "⏫ Forzando push de la rama rebaseada..."
  git push origin "$feature_branch" --force-with-lease
elif [[ "$update_method" == "m" ]]; then
  if ! git merge "origin/$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $feature_branch"; then
    echo "❌ Conflictos detectados durante merge. Resuélvelos y haz commit."
    exit 1
  fi
  git push origin "$feature_branch"
else
  echo "Opción inválida. Abortando."
  exit 1
fi
echo "✅ Rama '$feature_branch' actualizada."

# Cambiar a develop y actualizar
echo "🔄 Cambiando a '$DEVELOP_BRANCH' y actualizándola..."
git checkout "$DEVELOP_BRANCH"
git pull origin "$DEVELOP_BRANCH"

# Obtener último commit de la feature
last_commit_msg=$(git log -1 --pretty=format:%s "$feature_branch")

# Merge de prueba para detectar conflictos
echo "🔎 Probando merge para detectar conflictos..."
if ! git merge --no-commit --no-ff "$feature_branch"; then
  echo "❌ Conflictos detectados durante merge de prueba. Abortando."
  git merge --abort
  echo "Por favor resuelve los conflictos en '$DEVELOP_BRANCH' manualmente y vuelve a ejecutar este script."
  exit 1
else
  git reset --hard HEAD # Deshacer merge de prueba
fi

# Merge final con mensaje personalizado
merge_msg="Merge feature: $feature_branch

Último commit en $feature_branch:
$last_commit_msg"

echo "🔗 Fusionando '$feature_branch' en '$DEVELOP_BRANCH'..."
if ! git merge --no-ff "$feature_branch" -m "$merge_msg"; then
  echo "❌ Error inesperado durante merge."
  exit 1
fi

# Push develop
echo "⏫ Haciendo push de '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# Preguntar si eliminar ramas
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
