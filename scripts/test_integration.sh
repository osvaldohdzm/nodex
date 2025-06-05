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

echo "Ramas de prueba disponibles:"
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

# 5. Asegurar que la rama base existe (local o remota)
if ! git show-ref --verify --quiet "refs/heads/$base_branch"; then
  echo "⚠️ La rama base '$base_branch' no existe localmente. Intentando obtenerla desde remoto..."
  if ! git fetch "$REMOTE" "$base_branch:$base_branch"; then
    echo "❌ No se pudo obtener la rama base '$base_branch'. Abortando."
    exit 1
  fi
fi

# 6. Actualizar rama base
echo "🔄 Cambiando a rama base '$base_branch' y actualizándola..."
git checkout "$base_branch"
git pull "$REMOTE" "$base_branch"

# 7. Cambiar a la rama test
git checkout "$sel
