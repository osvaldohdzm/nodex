#!/bin/bash
set -euo pipefail

REMOTE="origin"

# 1. Detectar ramas de prueba (test/* o *-test)
mapfile -t test_branches < <(
  {
    git branch --list "test/*"
    git branch --list "*-test"
  } | sed 's/^[* ]*//' | sort -u
)

if [ ${#test_branches[@]} -eq 0 ]; then
  echo "ℹ️ No hay ramas de prueba ('test/*' o '*-test') disponibles para integrar."
  exit 0
fi

echo "🌿 Ramas de prueba disponibles:"
for i in "${!test_branches[@]}"; do
  printf "  [%d] %s\n" "$((i+1))" "${test_branches[i]}"
done

# 2. Selección automática: primera rama test
selected_test="${test_branches[0]}"
echo "🟢 Seleccionando automáticamente la primera rama de prueba: '$selected_test'"

# 3. Determinar la rama base
if [[ "$selected_test" == test/* ]]; then
  base_branch="${selected_test#test/}"
elif [[ "$selected_test" == *-test ]]; then
  base_branch="${selected_test%-test}"
else
  echo "❌ El formato de la rama '$selected_test' no es reconocido para derivar rama base."
  exit 1
fi

echo "🔍 Rama base detectada: '$base_branch'"

# 4. Seguridad: evitar merges directos en main/master
if [[ "$base_branch" == "main" || "$base_branch" == "master" ]]; then
  echo "⚠️ Integración directa en '$base_branch' desde una rama de prueba no está permitida. Abortando."
  exit 1
fi

# 5. Asegurar que la rama base existe localmente o traerla del remoto
if ! git show-ref --verify --quiet "refs/heads/$base_branch"; then
  echo "⚠️ La rama base '$base_branch' no existe localmente. Intentando obtenerla desde remoto..."
  if ! git fetch "$REMOTE" "$base_branch:$base_branch"; then
    echo "❌ No se pudo obtener la rama base '$base_branch'. Abortando."
    exit 1
  fi
fi

# --- INICIO DE LA MODIFICACIÓN INTELIGENTE ---
# 6. Manejar cambios locales antes de cambiar de rama
echo "🛠️ Verificando cambios locales antes de cambiar de rama..."
if ! git diff-index --quiet HEAD --; then
  echo "⚠️ Se detectaron cambios locales sin confirmar. Intentando stash..."
  if git stash push -m "Automated stash by integration script before switching to $base_branch"; then
    echo "✅ Cambios locales stasheados exitosamente."
    # Set a flag to indicate that a stash was performed
    STASHED_CHANGES=true
  else
    echo "❌ No se pudieron stashear los cambios locales. Por favor, revísalos manualmente."
    exit 1
  fi
else
  echo "✨ No hay cambios locales sin confirmar."
  STASHED_CHANGES=false
fi
# --- FIN DE LA MODIFICACIÓN INTELIGENTE ---


# 7. Cambiar a la rama base y actualizarla si tiene remoto
echo "🔄 Cambiando a rama base '$base_branch' y actualizándola..."
git checkout "$base_branch"
if git ls-remote --exit-code "$REMOTE" "$base_branch" &>/dev/null; then
  git pull "$REMOTE" "$base_branch"
fi

# 8. Fusionar la rama de prueba
echo "🔀 Haciendo merge de '$selected_test' en '$base_branch'..."
git merge --no-ff "$selected_test" -m "Merge rama de prueba '$selected_test' en '$base_branch'"

# --- INICIO DE LA MODIFICACIÓN INTELIGENTE ---
# 9. Aplicar stash si se realizó uno previamente
if [ "$STASHED_CHANGES" = true ]; then
  echo "♻️ Aplicando cambios stasheados previamente..."
  if git stash pop; then
    echo "✅ Cambios stasheados aplicados exitosamente."
  else
    echo "⚠️ Fallo al aplicar los cambios stasheados. Puede haber conflictos. Por favor, resuélvelos manualmente."
    echo "Puedes ver tus stashes con 'git stash list' y aplicarlos con 'git stash apply stash@{n}'."
  fi
fi
# --- FIN DE LA MODIFICACIÓN INTELIGENTE ---

# 10. Eliminar la rama de prueba local
echo "🗑️ Eliminando rama de prueba local '$selected_test'..."
git branch -d "$selected_test" || git branch -D "$selected_test" # Use -D for force delete if -d fails (unmerged changes)

# 11. (Opcional) Eliminar rama remota si existe
if git ls-remote --exit-code "$REMOTE" "refs/heads/$selected_test" &>/dev/null; then
  echo "🌐 Eliminando rama de prueba remota '$selected_test'..."
  git push "$REMOTE" --delete "$selected_test"
fi

echo "✅ Integración completada exitosamente en '$base_branch'."