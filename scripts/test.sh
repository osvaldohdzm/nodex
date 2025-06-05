#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"

# Función para listar ramas "padre" (sin /test al final) en local y remoto,
# ordenadas por fecha de commit y luego combinadas manteniendo el orden de locales primero.
list_parent_branches() {
  local pattern="$1"
  local -a local_branches remote_branches combined_branches

  # Obtener ramas locales que coincidan con el patrón y que NO terminen en /test
  # Se usa '|| true' para que el script no falle si 'git branch' o 'grep' no encuentran coincidencias (debido a set -e y pipefail)
  mapfile -t local_branches < <(git branch --list "$pattern" --sort=-committerdate | sed 's/^[* ]*//' | grep -v '/test$' || true)

  # Obtener ramas remotas
  mapfile -t remote_branches < <(git branch -r --list "origin/$pattern" --sort=-committerdate | sed 's|origin/||' | grep -v '/test$' || true)

  # Combinar y asegurar unicidad, preservando el orden de las locales primero, luego las remotas no listadas.
  # awk '!seen[$0]++' filtra duplicados manteniendo el orden de aparición.
  if [[ ${#local_branches[@]} -gt 0 || ${#remote_branches[@]} -gt 0 ]]; then
    mapfile -t combined_branches < <(printf '%s\n' "${local_branches[@]}" "${remote_branches[@]}" | awk '!seen[$0]++')
    printf '%s\n' "${combined_branches[@]}"
  fi
}

# Función para seleccionar una rama de una lista
select_branch() {
  local -a branches=("${@}") # Capturar todos los argumentos en un array
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
    local selection
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

# --- Inicio del Script ---

# Detectar rama actual
current_branch=$(git branch --show-current)
feature_branch=""

if [[ -z "$current_branch" ]]; then
    echo "❌ No se pudo detectar la rama actual. Asegúrate de estar en un repositorio Git." >&2
    exit 1
fi

if [[ "$current_branch" =~ /test$ ]]; then
  # Rama hija test detectada
  base_branch="${current_branch%/test}"
  >&2 echo "📂 Rama hija 'test' detectada: $current_branch"
  >&2 echo "➡️ Rama base identificada: $base_branch"
  feature_branch="$current_branch" # La "feature" a finalizar es la rama /test misma
else
  # No es rama test, verificar si es rama padre tipo feature/*, hotfix/* o la rama de desarrollo
  if [[ "$current_branch" == "$DEVELOP_BRANCH" || "$current_branch" =~ ^(feature|hotfix)/ ]]; then
    feature_branch="$current_branch"
    >&2 echo "➡️ Usando la rama actual como rama feature: $feature_branch"
  else
    # No es rama padre reconocida, listar ramas padre para elegir
    >&2 echo "🔍 No estás en una rama '$DEVELOP_BRANCH', 'feature/*' o 'hotfix/*' conocida."
    >&2 echo "Listando ramas padres disponibles para seleccionar..."
    declare -a branches_to_choose_from

    # Leer ramas de los patrones especificados en el array
    # Usar un subshell para `list_parent_branches` y `readarray` para capturar la salida
    mapfile -t branches_to_choose_from < <(list_parent_branches "feature/*"; list_parent_branches "hotfix/*"; list_parent_branches "$DEVELOP_BRANCH")

    # Eliminar duplicados finales si los hubiera (aunque list_parent_branches ya lo hace internamente)
    # y asegurar que awk no falle si branches_to_choose_from está vacía.
    if [[ ${#branches_to_choose_from[@]} -gt 0 ]]; then
        mapfile -t unique_branches < <(printf '%s\n' "${branches_to_choose_from[@]}" | awk '!seen[$0]++')
    else
        unique_branches=()
    fi

    feature_branch=$(select_branch "${unique_branches[@]}") # select_branch saldrá si no hay ramas
  fi
fi

echo "🏁 Iniciando el proceso de finalización para la rama: $feature_branch"

# Guardar cambios pendientes
echo "💾 Verificando cambios pendientes en '$feature_branch'..."
if ! git diff-index --quiet HEAD --; then
  read -rp "Tienes cambios sin commitear en '$feature_branch'. Mensaje para el commit (o deja vacío para 'WIP: Finalizando $feature_branch'): " msg
  if [[ -z "$msg" ]]; then
    msg="WIP: Finalizando $feature_branch"
  fi
  git add .
  git commit -m "$msg"
  echo "✅ Cambios commiteados."
fi
echo "⏫ Haciendo push de los cambios en '$feature_branch'..."
git push origin "$feature_branch"

# Preguntar por ejecutar pruebas
read -rp "¿Ejecutar pruebas para '$feature_branch' antes de continuar? (s/N): " run_tests_confirm
if [[ "$(echo "$run_tests_confirm" | tr '[:upper:]' '[:lower:]')" == "s" ]]; then
  echo "🧪 Ejecutando pruebas..."
  # Aquí iría tu script de pruebas, por ejemplo:
  # if ./scripts/run-tests.sh; then
  #   echo "✅ Pruebas pasaron."
  # else
  #   echo "❌ Pruebas fallidas. Abortando." >&2; exit 1;
  # fi
  echo "✅ (Placeholder) Pruebas simuladas pasaron." # Placeholder
else
  echo "ℹ️ Pruebas omitidas."
fi

# No actualizar la rama feature si es la misma DEVELOP_BRANCH
if [[ "$feature_branch" == "$DEVELOP_BRANCH" ]]; then
  echo "ℹ️ La rama feature es '$DEVELOP_BRANCH'. No se requiere actualización contra sí misma."
else
  echo "🔄 Actualizando '$feature_branch' con los últimos cambios de '$DEVELOP_BRANCH'..."
  git fetch origin "$DEVELOP_BRANCH"

  update_method_choice=""
  while true; do
    read -rp "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$feature_branch' con '$DEVELOP_BRANCH'? (Recomendado 'r', presiona Enter para 'r'): " update_method_input
    update_method_choice=${update_method_input:-r} # Default a 'r' si está vacío
    update_method_choice=$(echo "$update_method_choice" | tr '[:upper:]' '[:lower:]')

    if [[ "$update_method_choice" == "r" ]] || [[ "$update_method_choice" == "m" ]]; then
      break
    else
      echo "❌ Selección inválida. Ingresa 'r' o 'm'." >&2
    fi
  done

  if [[ "$update_method_choice" == "r" ]]; then
    echo "🔄 Intentando rebase de '$feature_branch' sobre 'origin/$DEVELOP_BRANCH'..."
    if ! git rebase "origin/$DEVELOP_BRANCH"; then
      echo "❌ Falló el rebase. Resuelve los conflictos manualmente y luego ejecuta:" >&2
      echo "   git rebase --continue" >&2
      echo "   O para abortar el rebase:" >&2
      echo "   git rebase --abort" >&2
      exit 1
    fi
    echo "⏫ Forzando push de la rama '$feature_branch' rebaseada (con --force-with-lease)..."
    git push origin "$feature_branch" --force-with-lease
  else # merge
    echo "🔄 Intentando merge de 'origin/$DEVELOP_BRANCH' en '$feature_branch'..."
    if ! git merge "origin/$DEVELOP_BRANCH" -m "Merge branch '$DEVELOP_BRANCH' into $feature_branch"; then
      echo "❌ Conflictos detectados durante el merge. Resuélvelos, haz commit de la resolución y luego vuelve a ejecutar el script o continúa manualmente." >&2
      exit 1
    fi
    git push origin "$feature_branch"
  fi
  echo "✅ Rama '$feature_branch' actualizada y pusheada."
fi

# Cambiar a develop y actualizar
echo "🔄 Cambiando a la rama '$DEVELOP_BRANCH' y actualizándola..."
if ! git checkout "$DEVELOP_BRANCH"; then
    echo "❌ No se pudo cambiar a la rama '$DEVELOP_BRANCH'. ¿Existe localmente?" >&2
    # Intentar crearla si existe en remoto
    if git show-ref --verify --quiet "refs/remotes/origin/$DEVELOP_BRANCH"; then
        echo "ℹ️ Intentando crear la rama '$DEVELOP_BRANCH' traqueando 'origin/$DEVELOP_BRANCH'..."
        if ! git checkout -b "$DEVELOP_BRANCH" "origin/$DEVELOP_BRANCH"; then
            echo "❌ Falló al crear la rama '$DEVELOP_BRANCH'." >&2
            exit 1
        fi
    else
        echo "❌ La rama '$DEVELOP_BRANCH' no existe localmente ni en 'origin'." >&2
        exit 1
    fi
fi
git pull origin "$DEVELOP_BRANCH"

# Si la feature_branch es DEVELOP_BRANCH, el merge es innecesario.
if [[ "$feature_branch" == "$DEVELOP_BRANCH" ]]; then
  echo "ℹ️ La rama feature es '$DEVELOP_BRANCH'. No se realizará merge sobre sí misma."
  echo "🎉 Proceso completado para '$DEVELOP_BRANCH'."
  exit 0
fi

# Obtener último commit de la feature para el mensaje de merge
last_commit_msg=$(git log -1 --pretty=format:%s "$feature_branch")

# Merge de prueba para detectar conflictos ANTES del merge final
echo "🔎 Realizando un merge de prueba de '$feature_branch' en '$DEVELOP_BRANCH' para detectar conflictos..."
if ! git merge --no-commit --no-ff "$feature_branch"; then
  echo "❌ Conflictos detectados durante el merge de prueba. Abortando merge." >&2
  git merge --abort
  echo "👉 Por favor, resuelve los conflictos en '$feature_branch' contra '$DEVELOP_BRANCH' (o viceversa)," >&2
  echo "   o asegúrate que '$DEVELOP_BRANCH' esté actualizada y sin conflictos con '$feature_branch'." >&2
  echo "   Luego, puedes intentar el merge manualmente o volver a ejecutar el script." >&2
  exit 1
else
  echo "✅ No se detectaron conflictos. Deshaciendo merge de prueba..."
  git reset --hard HEAD # Deshace el merge de prueba (ya que estaba --no-commit)
  # Es importante que develop esté limpia antes de este reset. `git pull` debería haberlo asegurado.
fi

# Merge final con mensaje personalizado
merge_msg="Merge feature: $feature_branch

Incorpora la funcionalidad/corrección de la rama '$feature_branch'.
Último commit en $feature_branch: $last_commit_msg"

echo "🔗 Fusionando '$feature_branch' en '$DEVELOP_BRANCH' con --no-ff..."
if ! git merge --no-ff "$feature_branch" -m "$merge_msg"; then
  echo "❌ Error inesperado durante el merge final de '$feature_branch' en '$DEVELOP_BRANCH'. Revisa los conflictos." >&2
  # No salir automáticamente, el usuario podría estar en medio de una resolución de conflictos.
  exit 1
fi
echo "✅ Merge de '$feature_branch' en '$DEVELOP_BRANCH' completado."

# Push develop
echo "⏫ Haciendo push de la rama '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# Preguntar si eliminar ramas (NUNCA para DEVELOP_BRANCH)
if [[ "$feature_branch" == "$DEVELOP_BRANCH" ]]; then
  echo "ℹ️ La rama de desarrollo '$DEVELOP_BRANCH' nunca se elimina mediante este script."
else
  read -rp "¿Eliminar la rama '$feature_branch' local y remotamente? (s/N): " delete_confirm
  if [[ "$(echo "$delete_confirm" | tr '[:upper:]' '[:lower:]')" == "s" ]]; then
    echo "🗑️ Intentando eliminar rama '$feature_branch' localmente..."
    if git branch -d "$feature_branch"; then
      echo "✅ Rama '$feature_branch' eliminada localmente."
    else
      echo "⚠️ No se pudo eliminar '$feature_branch' localmente (puede que no esté completamente fusionada o que haya cambios sin fusionar)." >&2
      read -rp "¿Forzar eliminación local (git branch -D '$feature_branch')? (s/N): " force_delete_local_confirm
      if [[ "$(echo "$force_delete_local_confirm" | tr '[:upper:]' '[:lower:]')" == "s" ]]; then
        if git branch -D "$feature_branch"; then
          echo "🗑️ Rama '$feature_branch' eliminada localmente con -D."
        else
          echo "❌ Falló la eliminación forzada de '$feature_branch' localmente." >&2
        fi
      else
        echo "ℹ️ Rama '$feature_branch' no eliminada localmente."
      fi
    fi

    # Solo intentar eliminar remotamente si existe y se confirmó
    if git show-ref --verify --quiet "refs/remotes/origin/$feature_branch"; then
      echo "🗑️ Intentando eliminar rama '$feature_branch' remotamente..."
      if git push origin --delete "$feature_branch"; then
        echo "✅ Rama '$feature_branch' eliminada remotamente."
      else
        echo "❌ No se pudo eliminar '$feature_branch' remotamente. Puede que ya no exista o haya un problema de permisos." >&2
      fi
    else
      echo "ℹ️ Rama '$feature_branch' no encontrada en el remoto 'origin' (puede que ya haya sido eliminada)."
    fi
  else
    echo "ℹ️ Rama '$feature_branch' no eliminada según tu elección."
  fi
fi

echo "🎉 ¡Éxito! La feature '$feature_branch' ha sido integrada en '$DEVELOP_BRANCH'."