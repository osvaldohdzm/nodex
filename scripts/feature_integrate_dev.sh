#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev"

select_feature_branch() {
  # Mensajes al stderr para no mezclar con la salida que se capturará
  >&2 echo "🔍 No estás en una rama 'feature/*'. Listando ramas 'feature/*' disponibles (locales y remotas)..."

  mapfile -t local_features < <(git branch --list 'feature/*' --sort=-committerdate | sed 's/^[* ]*//')
  mapfile -t remote_features < <(git branch -r --list 'origin/feature/*' --sort=-committerdate | sed 's|origin/||' | sed 's/^[ *]*//')

  feature_branches=("${local_features[@]}")

  for remote_branch in "${remote_features[@]}"; do
    if [[ ! " ${feature_branches[*]} " =~ " ${remote_branch} " ]]; then
      feature_branches+=("$remote_branch")
    fi
  done

  if [[ ${#feature_branches[@]} -eq 0 ]]; then
    >&2 echo "❌ No hay ramas 'feature/*' disponibles para seleccionar."
    exit 1
  elif [[ ${#feature_branches[@]} -eq 1 ]]; then
    >&2 echo "✅ Sólo hay una rama feature disponible: ${feature_branches[0]}"
    echo "${feature_branches[0]}"
  else
    >&2 echo "Selecciona la rama feature por número:"
    for i in "${!feature_branches[@]}"; do
      >&2 echo "  $((i+1))) ${feature_branches[i]}"
    done

    while true; do
      read -rp "Número de la rama feature a usar: " selection
      if [[ "$selection" =~ ^[0-9]+$ ]] && (( selection >= 1 && selection <= ${#feature_branches[@]} )); then
        selected_branch="${feature_branches[selection-1]}"
        >&2 echo "✅ Has seleccionado: $selected_branch"
        echo "$selected_branch"
        break
      else
        >&2 echo "❌ Selección inválida. Por favor, ingresa un número válido."
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
git push origin "$feature_branch" # Actualizar remoto

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

# 4. Cambiar a develop y actualizarla
echo "🔄 Cambiando a '$DEVELOP_BRANCH' y actualizándola..."
git checkout "$DEVELOP_BRANCH"
git pull origin "$DEVELOP_BRANCH"

# --- INICIO: NUEVA SECCIÓN PARA IGNORAR Y LIMPIAR __pycache__ ---
GITIGNORE_FILE=".gitignore"
PYCACHE_PATTERN="__pycache__/"
PYCACHE_COMMENT="# Python cache files and directories"
PYCACHE_ALREADY_IGNORED=false

if [ -f "$GITIGNORE_FILE" ] && grep -qF "$PYCACHE_PATTERN" "$GITIGNORE_FILE"; then
    PYCACHE_ALREADY_IGNORED=true
    echo "✅ '$PYCACHE_PATTERN' ya está en $GITIGNORE_FILE."
else
    echo "🛡️ '$PYCACHE_PATTERN' no encontrado en $GITIGNORE_FILE. Añadiéndolo..."
    # Asegurar que haya una nueva línea antes de añadir si el archivo existe y no termina con una
    if [ -f "$GITIGNORE_FILE" ] && [ -n "$(tail -c1 "$GITIGNORE_FILE")" ]; then
        echo "" >> "$GITIGNORE_FILE"
    fi
    # Añadir comentario y patrón
    echo -e "\n$PYCACHE_COMMENT\n$PYCACHE_PATTERN" >> "$GITIGNORE_FILE"
    git add "$GITIGNORE_FILE"
    echo "💾 Commiteando actualización de $GITIGNORE_FILE en '$DEVELOP_BRANCH' (si hubo cambios)..."
    # Este commit solo ocurrirá si .gitignore fue realmente modificado y añadido
    # El || true es para evitar que el script falle si no hay nada que commitear (ej. .gitignore ya estaba staged)
    if git commit -m "chore: Ensure $PYCACHE_PATTERN is ignored"; then
        echo "✅ $GITIGNORE_FILE actualizado y commiteado en '$DEVELOP_BRANCH'."
        # Considera hacer push de este cambio si es crítico que esté en el remoto inmediatamente
        # git push origin "$DEVELOP_BRANCH"
    else
        echo "ℹ️ No se realizó un nuevo commit para $GITIGNORE_FILE (puede que no hubiera cambios netos o ya estuviera preparado)."
    fi
fi

echo "🧹 Limpiando archivos y directorios ignorados sin seguimiento (como $PYCACHE_PATTERN)..."
# -d para directorios, -f para forzar, -X para solo ignorados (según .gitignore)
git clean -fdX
echo "✅ Limpieza de archivos ignorados completada."
# --- FIN: NUEVA SECCIÓN ---

# 5. Obtener último mensaje de commit en la feature
last_commit_msg=$(git log -1 --pretty=format:%s "$feature_branch")

# 6. Merge de prueba para detectar conflictos
echo "🔎 Probando merge para detectar conflictos..."
if ! git merge --no-commit --no-ff "$feature_branch"; then
  echo "❌ Conflictos detectados durante merge de prueba. Abortando."
  # Solo abortar si un merge está realmente en progreso
  if [ -f ".git/MERGE_HEAD" ]; then
      git merge --abort
      echo "ℹ️ Merge abortado."
  else
      echo "ℹ️ No había un merge en progreso para abortar (probablemente falló antes debido a archivos sin seguimiento, que ahora deberían estar limpios)."
  fi
  echo "Por favor resuelve los conflictos en '$DEVELOP_BRANCH' manualmente y vuelve a ejecutar este script, o revisa otros errores."
  exit 1
else
  echo "✅ Merge de prueba exitoso. Deshaciendo para merge final..."
  git reset --hard HEAD # Deshacer merge de prueba
fi

# 7. Merge final con mensaje personalizado
merge_msg="Merge feature: $feature_branch

Último commit en $feature_branch:
$last_commit_msg"

echo "🔗 Fusionando '$feature_branch' en '$DEVELOP_BRANCH'..."
if ! git merge --no-ff "$feature_branch" -m "$merge_msg"; then
  echo "❌ Error inesperado durante merge."
  # Solo abortar si un merge está realmente en progreso
  if [ -f ".git/MERGE_HEAD" ]; then
      git merge --abort
      echo "ℹ️ Merge abortado."
  fi
  exit 1
fi

# 8. Push de develop
echo "⏫ Haciendo push de '$DEVELOP_BRANCH'..."
git push origin "$DEVELOP_BRANCH"

# 9. Eliminar rama feature local y remota
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