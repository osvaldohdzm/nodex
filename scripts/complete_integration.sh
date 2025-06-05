#!/bin/bash
set -euo pipefail

# Configuración básica
MAIN_BRANCH="main"
DEVELOP_BRANCH="dev"

echo "🚀 Iniciando integración completa de ramas en '$MAIN_BRANCH' y '$DEVELOP_BRANCH'"

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
    read -rp "Mensaje para commit (deja vacío para 'WIP: commit automático'): " msg
    msg=${msg:-"WIP: commit automático en $branch"}
    git add .
    git commit -m "$msg"
  fi
}

# Función para actualizar una rama con la última versión remota
update_branch() {
  local branch=$1
  git checkout "$branch"
  echo "🔄 Actualizando $branch con la versión remota..."
  git pull origin "$branch"
}

# Función para ejecutar pruebas (placeholder)
run_tests() {
  local branch=$1
  read -rp "¿Ejecutar pruebas para '$branch'? (s/n): " answer
  if [[ "$answer" == "s" ]]; then
    echo "🧪 Ejecutando pruebas para $branch (placeholder)..."
    # Aquí pon tu comando real de pruebas, ej:
    # ./run-tests.sh
    echo "✅ Pruebas (simuladas) pasaron para $branch."
  else
    echo "⚠️ Omitiendo pruebas para $branch."
  fi
}

# Detectar todas las ramas locales que coincidan con tipos permitidos
mapfile -t all_branches < <(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -E '^(feature/|hotfix/|dev/|test/|main$|dev$|main/test$|dev/test$)')

echo "🔍 Ramas detectadas para procesar:"
printf ' - %s\n' "${all_branches[@]}"

# Primero integrar ramas test en sus ramas base
for branch in "${all_branches[@]}"; do
  if is_test_branch "$branch"; then
    base_branch=$(base_branch_of_test "$branch")
    echo "🔀 Integrando rama test '$branch' en su base '$base_branch'"

    # Verificar que base exista
    if ! git show-ref --verify --quiet "refs/heads/$base_branch"; then
      echo "⚠️ La rama base $base_branch no existe localmente. Intentando traerla..."
      git fetch origin "$base_branch":"$base_branch" || { echo "❌ No se pudo obtener $base_branch. Saltando $branch."; continue; }
    fi

    git checkout "$branch"
    commit_if_dirty "$branch"
    git push origin "$branch"

    run_tests "$branch"

    echo "🔄 Haciendo merge de '$branch' en '$base_branch'..."
    git checkout "$base_branch"
    git pull origin "$base_branch"
    if ! git merge --no-ff "$branch" -m "Merge rama test $branch en base $base_branch"; then
      echo "❌ Conflictos detectados al hacer merge de $branch en $base_branch. Por favor resuelve manualmente."
      exit 1
    fi
    git push origin "$base_branch"

    echo "🗑️ ¿Eliminar rama test '$branch' local y remota? (s/n): "
    read -r del_test
    if [[ "$del_test" == "s" ]]; then
      git branch -d "$branch"
      git push origin --delete "$branch"
      echo "✅ Rama test $branch eliminada."
    else
      echo "ℹ️ Rama test $branch conservada."
    fi
  fi
done

# Actualizar lista de ramas porque algunas ramas test pudieron ser eliminadas
mapfile -t all_branches < <(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -E '^(feature/|hotfix/|dev/|main$|dev$)')

# Integrar todas las feature y hotfix en dev
for branch in "${all_branches[@]}"; do
  if [[ "$branch" == "$DEVELOP_BRANCH" || "$branch" == "$MAIN_BRANCH" ]]; then
    continue
  fi

  if [[ "$branch" =~ ^(feature/|hotfix/|dev/).* ]]; then
    echo "🔀 Integrando rama $branch en $DEVELOP_BRANCH"

    # Asegurar que dev esté actualizada
    update_branch "$DEVELOP_BRANCH"

    # Preparar rama feature/hotfix
    git checkout "$branch"
    commit_if_dirty "$branch"
    git push origin "$branch"

    run_tests "$branch"

    # Rebase o merge de dev en branch para mantener actualizado
    echo "🔄 Actualizando $branch con $DEVELOP_BRANCH (rebase recomendado)..."
    if ! git rebase "$DEVELOP_BRANCH"; then
      echo "❌ Rebase falló. Por favor resuelve conflictos y termina rebase manualmente."
      exit 1
    fi
    git push origin "$branch" --force-with-lease

    # Volver a dev para hacer merge
    git checkout "$DEVELOP_BRANCH"
    if ! git merge --no-ff "$branch" -m "Merge $branch en $DEVELOP_BRANCH"; then
      echo "❌ Conflictos detectados al hacer merge de $branch en $DEVELOP_BRANCH. Por favor resuelve manualmente."
      exit 1
    fi
    git push origin "$DEVELOP_BRANCH"

    echo "🗑️ ¿Eliminar rama $branch local y remota? (s/n): "
    read -r del_feat
    if [[ "$del_feat" == "s" ]]; then
      git branch -d "$branch"
      git push origin --delete "$branch"
      echo "✅ Rama $branch eliminada."
    else
      echo "ℹ️ Rama $branch conservada."
    fi
  fi
done

# Finalmente integrar dev en main
echo "🔀 Integrando $DEVELOP_BRANCH en $MAIN_BRANCH..."

update_branch "$MAIN_BRANCH"
update_branch "$DEVELOP_BRANCH"

git checkout "$MAIN_BRANCH"

if ! git merge --no-ff "$DEVELOP_BRANCH" -m "Merge $DEVELOP_BRANCH en $MAIN_BRANCH"; then
  echo "❌ Conflictos detectados al integrar $DEVELOP_BRANCH en $MAIN_BRANCH. Resuelve manualmente."
  exit 1
fi
git push origin "$MAIN_BRANCH"

# Posicionarse en dev al final
git checkout "$DEVELOP_BRANCH"
echo "🎉 Integración completa terminada. Estás en '$DEVELOP_BRANCH'."
