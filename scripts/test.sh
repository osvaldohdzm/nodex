#!/bin/bash
set -euo pipefail

# --- Inicio del Script test.sh (Versión Mejorada) ---

# 1. Verificar si hay cambios sin commitear
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios pendientes en el directorio de trabajo para commitear. Saliendo."
  exit 0
fi
echo "🔍 Detectados cambios pendientes en el directorio de trabajo."

# 2. Obtener la rama actual
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ -z "$current_branch" ]]; then
  echo "❌ No se pudo detectar la rama actual. Asegúrate de estar en un repositorio Git." >&2
  exit 1
fi
echo "➡️ Rama actual: $current_branch"

# 3. Determinar la rama de pruebas destino
target_test_branch=""

if [[ "$current_branch" == */test ]]; then
  echo "ℹ️ Ya estás en una rama que parece ser una rama de pruebas ('$current_branch'). Los cambios se commitearán aquí."
  target_test_branch="$current_branch"
elif [[ "$current_branch" == *-test && ($(git rev-parse --verify "${current_branch%-test}" >/dev/null 2>&1) || $(git rev-parse --verify "origin/${current_branch%-test}" >/dev/null 2>&1)) ]]; then
  # Heurística: si la rama actual es como 'algo-test' y 'algo' existe, considerarla una rama de test
  echo "ℹ️ Ya estás en una rama que parece ser una rama de pruebas ('$current_branch'). Los cambios se commitearán aquí."
  target_test_branch="$current_branch"
else
  # No estamos en una rama que ya parezca ser de pruebas. Vamos a definir la rama destino.
  if [[ "$current_branch" == *"/"* ]]; then
    # La rama actual ya tiene una estructura jerárquica (ej: feature/foo, hotfix/bar)
    # Se usará el formato 'jerarquia/actual/test'
    target_test_branch="${current_branch}/test"
    echo "🆕 Rama de pruebas destino (para rama jerárquica): $target_test_branch"
  else
    # La rama actual es una rama raíz (ej: dev, main, master)
    # Se usará el formato 'actual-test' para evitar conflictos (ej: dev-test)
    target_test_branch="${current_branch}-test"
    echo "🆕 Rama de pruebas destino (para rama raíz): $target_test_branch"
  fi

  # Verificar si la rama de pruebas destino ya existe localmente
  if git rev-parse --verify "$target_test_branch" >/dev/null 2>&1; then
    echo "⚠️ La rama de pruebas '$target_test_branch' ya existe localmente."
    # Preguntar si se quiere cambiar a ella y commitear los cambios actuales allí
    read -rp "¿Deseas cambiar a '$target_test_branch' y commitear los cambios actuales allí? (s/N): " switch_to_existing
    if [[ "$(echo "$switch_to_existing" | tr '[:upper:]' '[:lower:]')" == "s" ]]; then
      if ! git checkout "$target_test_branch"; then
        echo "❌ No se pudo cambiar a la rama '$target_test_branch'." >&2
        exit 1
      fi
      echo "✅ Cambiado a la rama existente '$target_test_branch'."
    else
      echo "🛑 Operación cancelada. No se han realizado cambios en las ramas."
      exit 1
    fi
  else
    # La rama de pruebas no existe localmente, crearla
    echo "🌱 Creando y cambiando a la nueva rama de pruebas '$target_test_branch'..."
    if ! git checkout -b "$target_test_branch"; then
      echo "❌ No se pudo crear o cambiar a la rama '$target_test_branch'." >&2
      exit 1
    fi
    echo "✅ Creada y cambiada a la nueva rama '$target_test_branch'."
  fi
fi

# En este punto, estamos en la 'target_test_branch' (sea nueva o existente)
# y los cambios del directorio de trabajo están listos para ser commiteados.

# 4. Staging de todos los cambios
echo "➕ Preparando (staging) todos los cambios..."
git add .

# 5. Commit de los cambios
default_commit_msg="WIP: Pruebas en $target_test_branch"
user_commit_msg=""
read -rp "Mensaje para el commit (deja vacío para '$default_commit_msg'): " user_commit_msg

commit_msg="${user_commit_msg:-$default_commit_msg}" # Usa el default si user_commit_msg está vacío

if git commit -m "$commit_msg"; then
  echo "✅ Cambios commiteados en '$target_test_branch' con el mensaje: '$commit_msg'"
else
  echo "❌ Falló el commit. Puede que no haya cambios para commitear después del staging, o algún hook pre-commit falló." >&2
  # Verifica si realmente hay cambios stagedeados para el commit
  if git diff --cached --quiet; then
    echo "ℹ️ No había cambios en el staging area para el commit. Si añadiste archivos nuevos, asegúrate que no estén vacíos o ignorados."
  fi
  exit 1
fi


./scripts/start.sh

echo "🎉 Proceso completado. Tus cambios están ahora en la rama '$target_test_branch'."

# --- Fin del Script test.sh ---