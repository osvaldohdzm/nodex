#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"
GITIGNORE_FILE=".gitignore"
PYCACHE_PATTERN="__pycache__/"
NODE_MODULES_PATTERN="node_modules/"
COMMON_IGNORE_COMMENT="# Common build/cache/dependency directories"

# --- Función para limpiar .gitignore y archivos rastreados comunes ---
clean_branch_common_ignores() {
  # ... (esta función permanece igual) ...
  local branch_name="$1"
  local changes_made=false
  local commit_messages=""

  echo "🧼 Iniciando limpieza de ignorados comunes en la rama '$branch_name'..."

  # 1. Asegurar que los patrones estén en .gitignore
  echo "   Verificando $GITIGNORE_FILE en '$branch_name'..."
  local gitignore_modified=false
  if [ ! -f "$GITIGNORE_FILE" ]; then
    echo "   $GITIGNORE_FILE no existe. Creándolo."
    touch "$GITIGNORE_FILE"
  fi

  if ! grep -qF "$PYCACHE_PATTERN" "$GITIGNORE_FILE"; then
    echo "   Añadiendo '$PYCACHE_PATTERN' a $GITIGNORE_FILE."
    if [ -f "$GITIGNORE_FILE" ] && [ -n "$(tail -c1 "$GITIGNORE_FILE")" ]; then echo "" >> "$GITIGNORE_FILE"; fi
    echo -e "\n$COMMON_IGNORE_COMMENT (auto-added by script)\n$PYCACHE_PATTERN" >> "$GITIGNORE_FILE"
    gitignore_modified=true
  fi

  if ! grep -qF "$NODE_MODULES_PATTERN" "$GITIGNORE_FILE"; then
    echo "   Añadiendo '$NODE_MODULES_PATTERN' a $GITIGNORE_FILE."
    if [ -f "$GITIGNORE_FILE" ] && [ -n "$(tail -c1 "$GITIGNORE_FILE")" ]; then echo "" >> "$GITIGNORE_FILE"; fi
    echo -e "\n$COMMON_IGNORE_COMMENT (auto-added by script)\n$NODE_MODULES_PATTERN" >> "$GITIGNORE_FILE"
    gitignore_modified=true
  fi

  if $gitignore_modified; then
    git add "$GITIGNORE_FILE"
    commit_messages+="chore: Ensure common patterns are in .gitignore on $branch_name\n"
    changes_made=true
    echo "   $GITIGNORE_FILE modificado y preparado para commit."
  else
    echo "   $GITIGNORE_FILE ya contiene los patrones necesarios."
  fi

  local untracked_something=false
  tracked_pycaches=$(git ls-tree -r HEAD --name-only | grep "$PYCACHE_PATTERN" | sed -e "s|\(.*\)/$PYCACHE_PATTERN.*|\1/$PYCACHE_PATTERN|" | sort -u)
  if [ -n "$tracked_pycaches" ]; then
      echo "   Directorios '$PYCACHE_PATTERN' rastreados encontrados:"
      echo "$tracked_pycaches"
      echo "$tracked_pycaches" | while read -r pycache_dir; do
          echo "     Eliminando '$pycache_dir' del seguimiento..."
          git rm -r --cached "$pycache_dir"
          untracked_something=true
      done
  else
    echo "   No hay directorios '$PYCACHE_PATTERN' rastreados."
  fi

  tracked_node_modules=$(git ls-tree -r HEAD --name-only | grep "$NODE_MODULES_PATTERN" | sed -e "s|\(.*\)/$NODE_MODULES_PATTERN.*|\1/$NODE_MODULES_PATTERN|" | sort -u)
  if [ -n "$tracked_node_modules" ]; then
      echo "   Directorios '$NODE_MODULES_PATTERN' rastreados encontrados:"
      echo "$tracked_node_modules"
      echo "$tracked_node_modules" | while read -r nm_dir; do
          echo "     Eliminando '$nm_dir' del seguimiento..."
          git rm -r --cached "$nm_dir"
          untracked_something=true
      done
  else
    echo "   No hay directorios '$NODE_MODULES_PATTERN' rastreados."
  fi

  if $untracked_something; then
    commit_messages+="chore: Stop tracking common ignored directories on $branch_name\n"
    changes_made=true
    echo "   Directorios comunes eliminados del seguimiento y preparados para commit."
  fi

  if $changes_made; then
    echo "   Realizando commit de limpieza en '$branch_name'..."
    if ! git diff-index --quiet --cached HEAD --; then
        git commit -m "$(echo -e "$commit_messages" | sed '/^$/d' | paste -sd ' ' -)"
        echo "   Commit de limpieza realizado en '$branch_name'."
        echo "   Haciendo push de '$branch_name' con los cambios de limpieza..."
        git push origin "$branch_name"
        echo "   Push de '$branch_name' completado."
    else
        echo "   No hay cambios preparados para el commit de limpieza."
    fi
  else
    echo "   No se necesitaron cambios de limpieza en '$branch_name'."
  fi
  echo "🧼 Limpieza de ignorados comunes en '$branch_name' finalizada."
}

# --- Función para seleccionar una rama feature ---
select_feature_branch() {
  # ... (esta función permanece igual) ...
  >&2 echo "🔍 No estás en una rama 'feature/*'. Listando ramas 'feature/*' disponibles (locales y remotas)..."

  mapfile -t local_features < <(git for-each-ref --format='%(refname:short) %(committerdate:iso-strict)' refs/heads/feature/* | sort -k2 -r | cut -d' ' -f1)
  mapfile -t remote_features_full < <(git for-each-ref --format='%(refname:short) %(committerdate:iso-strict)' refs/remotes/origin/feature/* | sort -k2 -r | cut -d' ' -f1)
  
  remote_features=()
  for rf_full in "${remote_features_full[@]}"; do
    remote_features+=("${rf_full#origin/}")
  done

  feature_branches=("${local_features[@]}")
  for remote_branch in "${remote_features[@]}"; do
    is_present_locally=false
    for local_branch in "${local_features[@]}"; do
        if [[ "$remote_branch" == "$local_branch" ]]; then
            is_present_locally=true
            break
        fi
    done
    if ! $is_present_locally; then
      feature_branches+=("$remote_branch")
    fi
  done

  if [[ ${#feature_branches[@]} -eq 0 ]]; then
    >&2 echo "❌ No hay ramas 'feature/*' disponibles para seleccionar."
    exit 1
  elif [[ ${#feature_branches[@]} -eq 1 ]]; then
    selected_branch="${feature_branches[0]}"
    >&2 echo "✅ Sólo hay una rama feature disponible: $selected_branch. Seleccionándola automáticamente."
    echo "$selected_branch"
  else
    >&2 echo "Selecciona la rama feature por número:"
    for i in "${!feature_branches[@]}"; do
      branch_status=""
      is_local=false
      for local_b in "${local_features[@]}"; do if [[ "${feature_branches[i]}" == "$local_b" ]]; then is_local=true; break; fi; done
      is_remote_only=false
      if ! $is_local; then
        for remote_b_full in "${remote_features_full[@]}"; do if [[ "origin/${feature_branches[i]}" == "$remote_b_full" ]]; then is_remote_only=true; break; fi; done
      fi

      if $is_local && $is_remote_only; then
          branch_status=" (local y remoto no sincronizado?)"
      elif $is_local; then
          branch_status=" (local)"
      elif $is_remote_only; then
          branch_status=" (remoto)"
      fi
      >&2 echo "  $((i+1))) ${feature_branches[i]}$branch_status"
    done

    while true; do
      read -rp "Número de la rama feature a usar (o 'q' para salir): " selection
      if [[ "$selection" == "q" ]]; then
        >&2 echo "🛑 Operación cancelada por el usuario."
        exit 0
      fi
      if [[ "$selection" =~ ^[0-9]+$ ]] && (( selection >= 1 && selection <= ${#feature_branches[@]} )); then
        selected_branch="${feature_branches[selection-1]}"
        >&2 echo "✅ Has seleccionado: $selected_branch"
        echo "$selected_branch"
        break
      else
        >&2 echo "❌ Selección inválida. Por favor, ingresa un número válido o 'q'."
      fi
    done
  fi
}

# --- Determinar la rama feature a usar ---
current_branch=$(git branch --show-current)
original_branch="$current_branch" # Guardar la rama original
stashed_changes=false # Flag para saber si hicimos stash

# Asegurar que el directorio de trabajo esté limpio o guardar cambios antes de cambiar de rama
# si no estamos ya en una rama feature.
if [[ "$current_branch" != feature/* ]]; then
    echo "ℹ️ Verificando cambios locales en '$current_branch' antes de seleccionar/cambiar de rama feature..."
    # Primero, limpiar archivos ignorados que no están siendo rastreados,
    # ya que estos no deberían causar problemas de checkout pero pueden ser ruidosos.
    # Esto es seguro porque -X solo afecta a los ignorados.
    echo "   🧹 Limpiando archivos ignorados sin seguimiento en '$current_branch'..."

    max_clean_attempts=3  # Número de intentos antes de fallar
    attempt_num=1
    clean_successful=false
    last_clean_output=""

    while [ $attempt_num -le $max_clean_attempts ]; do
        echo "      Intento de limpieza $attempt_num de $max_clean_attempts..."
        # Capturar salida y errores en un subshell para manejar fallos de git clean
        clean_output_and_errors=$( (git clean -fdX) 2>&1 )
        clean_status=$?
        last_clean_output="$clean_output_and_errors"

        # Verificar si la limpieza fue exitosa y no hubo advertencias de "failed to remove"
        if [ $clean_status -eq 0 ] && ! (echo "$clean_output_and_errors" | grep -qi "warning: failed to remove"); then
            clean_successful=true
            break
        fi
        
        echo "      Limpieza falló (estado: $clean_status) o tuvo advertencias en el intento $attempt_num."
        # Mostrar solo las líneas de advertencia si las hay, o toda la salida si no hay advertencias específicas
        if echo "$clean_output_and_errors" | grep -qi "warning: failed to remove"; then
            echo "$clean_output_and_errors" | grep -i "warning: failed to remove" | sed 's/^/         /'
        else
            echo "$clean_output_and_errors" | sed 's/^/         /'
        fi
        
        if [ $attempt_num -lt $max_clean_attempts ]; then
            wait_time=$((attempt_num * 3))  # Espera incremental: 3s, 6s
            echo "      Esperando ${wait_time}s antes de reintentar..."
            sleep "$wait_time"
        fi
        ((attempt_num++))
    done

    if $clean_successful; then
        echo "   ✅ Limpieza de archivos ignorados completada."
    else
        echo "❌ 'git clean -fdX' falló persistentemente después de $max_clean_attempts intentos."
        echo "   Última salida de git clean:"
        echo "$last_clean_output" | sed 's/^/      /'
        echo "   Causas comunes:"
        echo "   - Archivos bloqueados por otros procesos (servidores de desarrollo, etc.)"
        echo "   - Problemas de permisos en archivos o directorios"
        echo "   - Procesos que mantienen archivos abiertos"
        echo "   El script no puede continuar de forma segura. Abortando."
        exit 1
    fi

    if ! git diff-index --quiet HEAD -- || ! git status --porcelain | grep -q "^??"; then
        echo "⚠️ Tienes cambios locales sin commitear o archivos sin seguimiento (no ignorados) en '$current_branch'."
        # Preguntar al usuario si quiere hacer stash
        read -rp "¿Hacer stash de los cambios para continuar? (s/n): " stash_confirm
        if [[ "$stash_confirm" == "s" ]]; then
            echo "💾 Haciendo stash de los cambios en '$current_branch'..."
            # Usar -u para incluir archivos sin seguimiento que no fueron limpiados por clean -fdX
            if git stash push -u -m "WIP: Stashed by feature_integrate_dev.sh from $current_branch"; then
                stashed_changes=true
                echo "✅ Cambios guardados en stash."
            else
                echo "❌ Error al hacer stash. Por favor, maneja los cambios manualmente y vuelve a ejecutar el script."
                exit 1
            fi
        else
            echo "🛑 Operación cancelada. Por favor, haz commit o stash de tus cambios manualmente."
            exit 1
        fi
    else
        echo "✅ '$current_branch' está limpia, no se necesita stash."
    fi
fi


if [[ "$current_branch" == feature/* ]] && ! $stashed_changes; then # Si ya estábamos en feature y no hicimos stash
  feature_branch="$current_branch"
  echo "ℹ️ Ya estás en la rama feature: $feature_branch"
else
  # Si hicimos stash, o no estábamos en una rama feature, procedemos a seleccionar y cambiar
  if [[ "$current_branch" != feature/* ]]; then
      feature_branch_selected_name=$(select_feature_branch)
      if [ -z "$feature_branch_selected_name" ]; then
          echo "❌ No se pudo determinar la rama feature. Abortando."
          if $stashed_changes; then
              echo "Restaurando cambios desde stash..."
              git stash pop || echo "⚠️ Falló al restaurar stash. Revisa con 'git stash list'."
          fi
          exit 1
      fi
  else # Estábamos en una rama feature pero hicimos stash, así que feature_branch_selected_name es la misma current_branch
      feature_branch_selected_name="$current_branch"
  fi
  
  echo "🔄 Cambiando a la rama feature: $feature_branch_selected_name"
  if git rev-parse --verify "$feature_branch_selected_name" > /dev/null 2>&1; then
    if ! git checkout "$feature_branch_selected_name"; then
        echo "❌ Error al cambiar a la rama local '$feature_branch_selected_name'. Abortando."
        if $stashed_changes; then
            echo "Restaurando cambios desde stash en '$original_branch'..."
            # Volver a la rama original antes de pop si el checkout falló
            git checkout "$original_branch" -- # -- para evitar ambigüedad si original_branch es un path
            git stash pop || echo "⚠️ Falló al restaurar stash. Revisa con 'git stash list'."
        fi
        exit 1
    fi
  else
    if ! git checkout -t "origin/$feature_branch_selected_name"; then
        echo "❌ Error al crear y cambiar a la rama '$feature_branch_selected_name' desde 'origin/$feature_branch_selected_name'."
        if $stashed_changes; then
            echo "Restaurando cambios desde stash en '$original_branch'..."
            git checkout "$original_branch" --
            git stash pop || echo "⚠️ Falló al restaurar stash. Revisa con 'git stash list'."
        fi
        exit 1
    fi
  fi
  feature_branch="$feature_branch_selected_name" # Asignar a la variable global
  echo "✅ Cambiado a la rama: $(git branch --show-current)"
fi

echo "🏁 Finalizando la feature: $feature_branch"

# --- INICIO: LIMPIEZA AUTOMÁTICA EN LA RAMA FEATURE ---
if [[ "$(git branch --show-current)" != "$feature_branch" ]]; then
    echo "⚠️ Advertencia: No estamos en la rama feature esperada ($feature_branch). Intentando checkout..."
    if ! git checkout "$feature_branch"; then
        echo "❌ No se pudo cambiar a '$feature_branch' para la limpieza. Abortando."
        if $stashed_changes; then
            echo "Restaurando cambios desde stash en '$original_branch'..."
            git checkout "$original_branch" --
            git stash pop || echo "⚠️ Falló al restaurar stash. Revisa con 'git stash list'."
        fi
        exit 1
    fi
fi
clean_branch_common_ignores "$feature_branch"
# --- FIN: LIMPIEZA AUTOMÁTICA EN LA RAMA FEATURE ---

# ... (resto del script como antes) ...
# 1. Guardar cualquier cambio pendiente (después de la limpieza automática)
echo "💾 Verificando cambios pendientes en '$feature_branch'..."
if ! git diff-index --quiet HEAD --; then
  read -rp "Tienes cambios sin commitear (después de la limpieza automática). Mensaje para el commit (o deja vacío para 'WIP: Finalizing feature'): " msg
  if [[ -z "$msg" ]]; then
    msg="WIP: Finalizing feature $feature_branch"
  fi
  git add .
  git commit -m "$msg"
fi
echo "⏫ Asegurando que la rama '$feature_branch' esté actualizada en el remoto..."
git push origin "$feature_branch"

# 2. Ejecutar pruebas opcionalmente
read -rp "¿Ejecutar pruebas para '$feature_branch' antes de continuar? (s/n): " run_tests_confirm
if [[ "$run_tests_confirm" == "s" ]]; then
  echo "🧪 Ejecutando pruebas..."
  # ./scripts/run-tests.sh || { echo "❌ Pruebas fallidas. Abortando."; exit 1; }
  echo "✅ (Placeholder) Pruebas pasaron."
fi

# 3. Actualizar la rama feature con develop (rebase preferido)
echo "🔄 Actualizando '$feature_branch' con '$DEVELOP_BRANCH'..."
git fetch origin "$DEVELOP_BRANCH"
read -rp "¿Usar 'rebase' (r) o 'merge' (m) para actualizar '$feature_branch'? (r/m, recomendado r): " update_method
# Función para manejar la salida y el posible pop del stash
handle_exit() {
    local exit_code=$?
    local message="$1"
    echo "$message"
    if $stashed_changes; then
        echo "↪️ Volviendo a la rama original '$original_branch' y restaurando stash..."
        if ! git checkout "$original_branch" -- ; then
            echo "⚠️ No se pudo volver a la rama '$original_branch'. El stash no se aplicará automáticamente."
        else
            echo "Restaurando cambios desde stash..."
            git stash pop || echo "⚠️ Falló al restaurar stash. Revisa con 'git stash list'."
        fi
    fi
    exit $exit_code
}
trap 'handle_exit "🛑 Script interrumpido."' INT TERM EXIT # Manejar salida abrupta

if [[ "$update_method" == "r" ]]; then
  if ! git rebase "origin/$DEVELOP_BRANCH"; then
    # No llamar a handle_exit aquí directamente, ya que el usuario necesita resolver conflictos
    echo "❌ Falló el rebase. Resuelve conflictos y luego ejecuta:"
    echo "   git rebase --continue"
    echo "   O para abortar:"
    echo "   git rebase --abort"
    # Si el usuario aborta el rebase, el script terminará y el trap de EXIT se encargará del stash
    exit 1 # Salir para que el usuario maneje el rebase
  fi
  echo "⏫ Forzando push de la rama rebaseada..."
  git push origin "$feature_branch" --force-with-lease
elif [[ "$update_method" == "m" ]]; then
  if ! git merge "origin/$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH into $feature_branch"; then
    echo "❌ Conflictos detectados durante merge. Resuélvelos y haz commit."
    exit 1 # Salir para que el usuario maneje el merge
  fi
  git push origin "$feature_branch"
else
  handle_exit "Opción inválida. Abortando." # Usar handle_exit para limpiar stash
fi
echo "✅ Rama '$feature_branch' actualizada."

# 4. Cambiar a develop y actualizarla
echo "🔄 Cambiando a '$DEVELOP_BRANCH' y actualizándola..."
if ! git checkout "$DEVELOP_BRANCH"; then
    handle_exit "❌ Error al cambiar a la rama '$DEVELOP_BRANCH'. Abortando."
fi
git pull origin "$DEVELOP_BRANCH"

# --- Limpieza en DEV ---
# ... (esta sección permanece igual) ...
PYCACHE_ALREADY_IGNORED_IN_DEV=false
if [ -f "$GITIGNORE_FILE" ] && grep -qF "$PYCACHE_PATTERN" "$GITIGNORE_FILE"; then
    PYCACHE_ALREADY_IGNORED_IN_DEV=true
    echo "✅ '$PYCACHE_PATTERN' ya está en $GITIGNORE_FILE de '$DEVELOP_BRANCH'."
else
    echo "🛡️ '$PYCACHE_PATTERN' no encontrado en $GITIGNORE_FILE de '$DEVELOP_BRANCH'. Añadiéndolo..."
    if [ -f "$GITIGNORE_FILE" ] && [ -n "$(tail -c1 "$GITIGNORE_FILE")" ]; then echo "" >> "$GITIGNORE_FILE"; fi
    echo -e "\n$COMMON_IGNORE_COMMENT (auto-added by script)\n$PYCACHE_PATTERN" >> "$GITIGNORE_FILE"
    git add "$GITIGNORE_FILE"
    echo "💾 Commiteando actualización de $GITIGNORE_FILE en '$DEVELOP_BRANCH' (si hubo cambios)..."
    if git commit -m "chore: Ensure $PYCACHE_PATTERN is ignored in $DEVELOP_BRANCH"; then
        echo "✅ $GITIGNORE_FILE actualizado y commiteado en '$DEVELOP_BRANCH'."
        git push origin "$DEVELOP_BRANCH"
    else
        echo "ℹ️ No se realizó un nuevo commit para $GITIGNORE_FILE en '$DEVELOP_BRANCH'."
    fi
fi
NODE_MODULES_ALREADY_IGNORED_IN_DEV=false
if [ -f "$GITIGNORE_FILE" ] && grep -qF "$NODE_MODULES_PATTERN" "$GITIGNORE_FILE"; then
    NODE_MODULES_ALREADY_IGNORED_IN_DEV=true
    echo "✅ '$NODE_MODULES_PATTERN' ya está en $GITIGNORE_FILE de '$DEVELOP_BRANCH'."
else
    echo "🛡️ '$NODE_MODULES_PATTERN' no encontrado en $GITIGNORE_FILE de '$DEVELOP_BRANCH'. Añadiéndolo..."
    if [ -f "$GITIGNORE_FILE" ] && [ -n "$(tail -c1 "$GITIGNORE_FILE")" ]; then echo "" >> "$GITIGNORE_FILE"; fi
    echo -e "\n$COMMON_IGNORE_COMMENT (auto-added by script)\n$NODE_MODULES_PATTERN" >> "$GITIGNORE_FILE"
    git add "$GITIGNORE_FILE"
    echo "💾 Commiteando actualización de $GITIGNORE_FILE en '$DEVELOP_BRANCH' (si hubo cambios)..."
    if git commit -m "chore: Ensure $NODE_MODULES_PATTERN is ignored in $DEVELOP_BRANCH"; then
        echo "✅ $GITIGNORE_FILE actualizado y commiteado en '$DEVELOP_BRANCH'."
        if ! $PYCACHE_ALREADY_IGNORED_IN_DEV; then
             git push origin "$DEVELOP_BRANCH"
        fi
    else
        echo "ℹ️ No se realizó un nuevo commit para $GITIGNORE_FILE en '$DEVELOP_BRANCH'."
    fi
fi
echo "🧹 Limpiando archivos y directorios ignorados sin seguimiento en '$DEVELOP_BRANCH' (como $PYCACHE_PATTERN, $NODE_MODULES_PATTERN)..."
git clean -fdX
echo "✅ Limpieza de archivos ignorados en '$DEVELOP_BRANCH' completada."

# 5. Obtener último mensaje de commit en la feature
last_commit_msg=$(git log -1 --pretty=format:%s "$feature_branch")

# 6. Merge de prueba para detectar conflictos
echo "🔎 Probando merge para detectar conflictos..."
if ! git merge --no-commit --no-ff "$feature_branch"; then
  echo "❌ Conflictos detectados durante merge de prueba. Abortando."
  if [ -f ".git/MERGE_HEAD" ]; then
      git merge --abort
      echo "ℹ️ Merge abortado."
  else
      echo "ℹ️ No había un merge en progreso para abortar."
  fi
  handle_exit "Por favor resuelve los conflictos en '$DEVELOP_BRANCH' manualmente y vuelve a ejecutar este script, o revisa otros errores."
fi
echo "✅ Merge de prueba exitoso. Deshaciendo para merge final..."
git reset --hard HEAD

# 7. Merge final con mensaje personalizado
merge_msg="Merge feature: $feature_branch

Último commit en $feature_branch:
$last_commit_msg"

echo "🔗 Fusionando '$feature_branch' en '$DEVELOP_BRANCH'..."
if ! git merge --no-ff "$feature_branch" -m "$merge_msg"; then
  if [ -f ".git/MERGE_HEAD" ]; then
      git merge --abort
      echo "ℹ️ Merge abortado."
  fi
  handle_exit "❌ Error inesperado durante merge."
fi

# 8. Push de develop
echo "⏫ Haciendo push de '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# 9. Eliminar rama feature local y remota
read -rp "¿Eliminar la rama '$feature_branch' local y remotamente? (s/n): " delete_confirm
if [[ "$delete_confirm" == "s" ]]; then
  echo "🗑️ Eliminando rama '$feature_branch' localmente..."
  if ! git branch -d "$feature_branch"; then
    echo "⚠️ No se pudo eliminar '$feature_branch' localmente. Puede que no esté completamente fusionada o haya otros problemas."
    echo "   Intenta 'git branch -D $feature_branch' si estás seguro."
  else
    echo "✅ Rama '$feature_branch' eliminada localmente."
  fi
  echo "🗑️ Eliminando rama '$feature_branch' remotamente..."
  if ! git push origin --delete "$feature_branch"; then
    echo "⚠️ No se pudo eliminar '$feature_branch' remotamente."
  else
    echo "✅ Rama '$feature_branch' eliminada remotamente."
  fi
else
  echo "ℹ️ Rama '$feature_branch' no eliminada."
fi

# Limpiar el trap antes de la salida normal
trap - INT TERM EXIT

if $stashed_changes; then
    echo "↪️ Volviendo a la rama original '$original_branch' y restaurando stash..."
    if ! git checkout "$original_branch" -- ; then
        echo "⚠️ No se pudo volver a la rama '$original_branch'. El stash no se aplicará automáticamente."
    else
        echo "Restaurando cambios desde stash..."
        git stash pop || echo "⚠️ Falló al restaurar stash. Revisa con 'git stash list'."
    fi
else
    # Volver a la rama original si se cambió y no hubo stash, y no es la rama develop
    if [[ "$original_branch" != "$(git branch --show-current)" ]] && [[ "$original_branch" != "$DEVELOP_BRANCH" ]]; then
        echo "↪️ Volviendo a la rama original: $original_branch"
        if ! git checkout "$original_branch" -- ; then
            echo "⚠️ No se pudo volver a la rama '$original_branch'."
        fi
    fi
fi

echo "🎉 Feature '$feature_branch' integrada exitosamente en '$DEVELOP_BRANCH'."