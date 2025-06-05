#!/bin/bash
set -euo pipefail

# Configuración básica
MAIN_BRANCH="main"
DEVELOP_BRANCH="dev"

echo "🚀 Iniciando integración completa de ramas en '$MAIN_BRANCH' y '$DEVELOP_BRANCH'"

git add .
git commit -m "Integración automática de dev en main" || echo "No hay cambios para integrar."

# Función para detectar si rama termina en /test
is_test_branch() {
  [[ "$1" =~ /test$ ]]
}

# Función para obtener la rama base (antes de /test)
base_branch_of_test() {
  echo "${1%/test}"
}

# Función para hacer commit si hay cambios pendientes
commit_if_dirty() {
  local branch=$1
  if ! git diff-index --quiet HEAD --; then
    echo "💾 Cambios pendientes detectados en $branch"
    read -rp "Mensaje para commit (deja vacío para 'WIP: commit automático en $branch'): " msg
    msg=${msg:-"WIP: commit automático en $branch"}
    git add .
    git commit -m "$msg"
  fi
}

# Función para actualizar una rama con la última versión remota
update_branch() {
  local branch_name=$1 # Renombrado para evitar conflicto con la variable global 'branch' en loops
  git checkout "$branch_name"
  echo "🔄 Actualizando $branch_name con la versión remota..."
  # Asegurar que se haga fetch antes de pull para tener las refs remotas actualizadas
  git fetch origin "$branch_name"
  git pull origin "$branch_name"
}


# Detectar todas las ramas locales inicialmente
mapfile -t initial_local_branches < <(git for-each-ref --format='%(refname:short)' refs/heads/)

echo "🔍 Ramas locales detectadas inicialmente:"
printf -- ' - %s\n' "${initial_local_branches[@]}"

# Primero integrar ramas test (que terminan en /test) en sus ramas base
echo ""
echo "--- Etapa 1: Integrando ramas '*/test' en sus ramas base ---"
for branch in "${initial_local_branches[@]}"; do
  if is_test_branch "$branch"; then
    base_branch=$(base_branch_of_test "$branch")
    echo "🔀 Preparando para integrar rama test '$branch' en su base '$base_branch'"

    # Verificar que base exista
    if ! git show-ref --verify --quiet "refs/heads/$base_branch"; then
      echo "⚠️ La rama base '$base_branch' no existe localmente. Intentando traerla de origin..."
      if ! git fetch origin "$base_branch":"$base_branch"; then
        echo "❌ No se pudo obtener '$base_branch' de origin. Saltando integración de '$branch'."
        continue
      fi
      echo "✅ Rama base '$base_branch' traída de origin."
    fi

    git checkout "$branch"
    commit_if_dirty "$branch"
    echo "📤 Subiendo cambios de '$branch' a origin..."
    git push origin "$branch"

    run_tests "$branch"

    echo "🔄 Haciendo merge de '$branch' en '$base_branch'..."
    git checkout "$base_branch"
    update_branch "$base_branch" # Asegurar que la base esté actualizada antes del merge
    if ! git merge --no-ff "$branch" -m "Merge rama test $branch en base $base_branch"; then
      echo "❌ Conflictos detectados al hacer merge de '$branch' en '$base_branch'."
      echo "   Por favor, resuelve los conflictos manualmente en otra terminal y haz commit en '$base_branch'."
      echo "   El script saldrá para que puedas manejar la situación."
      exit 1
    fi
    echo "📤 Subiendo '$base_branch' actualizada a origin..."
    git push origin "$base_branch"

    echo "🗑️ ¿Eliminar rama test '$branch' local y remota? (s/n): "
    read -r del_test
    if [[ "$del_test" == "s" ]]; then
      git branch -d "$branch"
      if git ls-remote --exit-code --heads origin "$branch" > /dev/null 2>&1; then
        git push origin --delete "$branch"
        echo "✅ Rama test '$branch' eliminada local y remotamente."
      else
        echo "✅ Rama test '$branch' eliminada localmente (no encontrada en origin)."
      fi
    else
      echo "ℹ️ Rama test '$branch' conservada."
    fi
  fi
done

# Actualizar lista de ramas porque algunas ramas test pudieron ser eliminadas/actualizadas.
# Obtenemos TODAS las ramas locales actuales.
echo ""
echo "--- Etapa 2: Integrando ramas adicionales en '$DEVELOP_BRANCH' ---"
mapfile -t current_remaining_branches < <(git for-each-ref --format='%(refname:short)' refs/heads/)
echo "🔍 Ramas actualmente existentes para considerar integración en '$DEVELOP_BRANCH':"
printf -- ' - %s\n' "${current_remaining_branches[@]}"

for branch in "${current_remaining_branches[@]}"; do
  if [[ "$branch" == "$DEVELOP_BRANCH" || "$branch" == "$MAIN_BRANCH" ]]; then
    echo "ℹ️ Omitiendo '$branch' (es '$DEVELOP_BRANCH' o '$MAIN_BRANCH') de la integración en '$DEVELOP_BRANCH' en esta etapa."
    continue
  fi

  # Cualquier otra rama $branch será procesada para integrarse en $DEVELOP_BRANCH
  echo "🔀 Preparando para integrar la rama '$branch' en '$DEVELOP_BRANCH'"

  # Asegurar que DEVELOP_BRANCH esté actualizada ANTES de cada ciclo de integración de rama.
  update_branch "$DEVELOP_BRANCH"

  # Preparar rama '$branch'
  git checkout "$branch"
  commit_if_dirty "$branch"
  echo "📤 Subiendo cambios de '$branch' a origin (pre-rebase)..."
  # Intentar push; si falla porque no tiene upstream, configurarlo.
  if ! git push origin "$branch" 2>/dev/null; then
    echo "ℹ️ Push inicial falló (posiblemente nueva rama local). Intentando con --set-upstream..."
    git push --set-upstream origin "$branch"
  fi
  
  echo "🔄 Actualizando '$branch' con los últimos cambios de '$DEVELOP_BRANCH' (usando rebase)..."
  if ! git rebase "$DEVELOP_BRANCH"; then
    echo "❌ El rebase de '$branch' sobre '$DEVELOP_BRANCH' falló."
    echo "   Por favor, resuelve los conflictos manualmente en otra terminal."
    echo "   Una vez resueltos, ejecuta 'git rebase --continue'."
    echo "   Si deseas abortar el rebase, ejecuta 'git rebase --abort'."
    echo "   El script saldrá para que puedas manejar la situación."
    exit 1 # Exit for manual conflict resolution
  fi
  echo "📤 Subiendo '$branch' rebaseada a origin (con --force-with-lease)..."
  git push origin "$branch" --force-with-lease # Push rebased branch

  # Volver a dev para hacer merge
  git checkout "$DEVELOP_BRANCH"
  # DEVELOP_BRANCH ya está actualizada localmente debido al update_branch al inicio de este ciclo.
  
  echo "🔗 Haciendo merge (no-ff) de '$branch' en '$DEVELOP_BRANCH'..."
  if ! git merge --no-ff "$branch" -m "Merge $branch en $DEVELOP_BRANCH"; then
    echo "❌ Conflictos detectados al hacer merge de '$branch' en '$DEVELOP_BRANCH'."
    echo "   Por favor, resuelve los conflictos manualmente en otra terminal y haz commit en '$DEVELOP_BRANCH'."
    echo "   El script saldrá para que puedas manejar la situación."
    exit 1 # Exit for manual conflict resolution
  fi
  echo "📤 Subiendo '$DEVELOP_BRANCH' actualizada a origin..."
  git push origin "$DEVELOP_BRANCH"

  echo "🗑️ ¿Eliminar rama '$branch' local y remota después de la integración? (s/n): "
  read -r del_branch
  if [[ "$del_branch" == "s" ]]; then
    git branch -d "$branch"
    if git ls-remote --exit-code --heads origin "$branch" > /dev/null 2>&1; then
      git push origin --delete "$branch"
      echo "✅ Rama '$branch' eliminada local y remotamente."
    else
      echo "✅ Rama '$branch' eliminada localmente (no se encontró en origin o ya fue eliminada remotamente)."
    fi
  else
    echo "ℹ️ Rama '$branch' conservada."
  fi
done

# Finalmente integrar dev en main
echo ""
echo "--- Etapa 3: Integrando '$DEVELOP_BRANCH' en '$MAIN_BRANCH' ---"
echo "🔀 Integrando '$DEVELOP_BRANCH' en '$MAIN_BRANCH'..."

update_branch "$MAIN_BRANCH"
update_branch "$DEVELOP_BRANCH" # Asegurarse que dev también está lo más reciente posible

git checkout "$MAIN_BRANCH"

if ! git merge --no-ff "$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH en $MAIN_BRANCH"; then
  echo "❌ Conflictos detectados al integrar '$DEVELOP_BRANCH' en '$MAIN_BRANCH'."
  echo "   Por favor, resuelve los conflictos manualmente en otra terminal y haz commit en '$MAIN_BRANCH'."
  echo "   El script saldrá para que puedas manejar la situación."
  exit 1
fi
echo "📤 Subiendo '$MAIN_BRANCH' actualizada a origin..."
git push origin "$MAIN_BRANCH"

# Posicionarse en dev al final
git checkout "$DEVELOP_BRANCH"
echo ""
echo "🎉 Integración completa terminada. Estás en la rama '$DEVELOP_BRANCH'."