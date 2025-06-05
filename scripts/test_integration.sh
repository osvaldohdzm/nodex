#!/bin/bash
set -euo pipefail

REMOTE="origin"
TARGET_BRANCH="dev"

# 1. Actualizar la rama corporativa
echo "🔄 Cambiando a rama destino '$TARGET_BRANCH' y actualizándola..."
git checkout "$TARGET_BRANCH"
git pull "$REMOTE" "$TARGET_BRANCH"

# 2. Listar ramas test/*
mapfile -t test_branches < <(git branch --list "test/*" | sed 's/^[* ]*//')

if [ ${#test_branches[@]} -eq 0 ]; then
  echo "ℹ️ No hay ramas 'test/*' disponibles para integrar."
  exit 0
fi

echo "Ramas de test disponibles:"
for i in "${!test_branches[@]}"; do
  printf "  [%d] %s\n" "$((i+1))" "${test_branches[i]}"
done

# 3. Selección automática: toma la primera rama test disponible
selected_test="${test_branches[0]}"
echo "🟢 Seleccionando automáticamente la primera rama test: '$selected_test'"

# 4. Detectar rama base quitando prefijo test/
base_branch="${selected_test#test/}"

# Validar que la rama base exista local o remotamente
if ! git show-ref --verify --quiet "refs/heads/$base_branch"; then
  echo "⚠️ La rama base '$base_branch' no existe localmente. Intentando obtenerla desde remoto..."
  if ! git fetch "$REMOTE" "$base_branch":"$base_branch"; then
    echo "❌ No se pudo obtener la rama base '$base_branch'. Abortando."
    exit 1
  fi
fi

# 5. Cambiar a la rama test seleccionada
git checkout "$selected_test"

# 6. Actualizar rama test con base_branch (merge)
echo "🔄 Integrando rama base '$base_branch' en '$selected_test'..."
if ! git merge --no-ff "$base_branch" -m "Merge rama base $base_branch en $selected_test"; then
  echo "❌ Conflictos al actualizar '$selected_test' con '$base_branch'. Resuélvelos manualmente."
  git merge --abort
  exit 1
fi

# Push rama test actualizada
git push "$REMOTE" "$selected_test"

# 7. Cambiar a rama destino
git checkout "$TARGET_BRANCH"

# 8. Integrar rama test en rama destino
echo "🔀 Integrando '$selected_test' en '$TARGET_BRANCH'..."
if ! git merge --no-ff "$selected_test" -m "Merge rama de test $selected_test en $TARGET_BRANCH"; then
  echo "❌ Conflictos al integrar '$selected_test' en '$TARGET_BRANCH'. Resuélvelos manualmente."
  git merge --abort
  exit 1
fi

# 9. Push final
git push "$REMOTE" "$TARGET_BRANCH"

# 10. Eliminar automáticamente la rama test local y remotamente
echo "🗑️ Eliminando rama test '$selected_test' local y remotamente..."
git branch -d "$selected_test" || git branch -D "$selected_test"
git push "$REMOTE" --delete "$selected_test"
echo "✅ Rama '$selected_test' eliminada."

# 11. Asegurar que estamos en la rama target al final
git checkout "$TARGET_BRANCH"

echo "🎉 Integración completada exitosamente en '$TARGET_BRANCH'."
