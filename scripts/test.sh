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

if [[ "$current_branch" == */test ]] || [[ "$current_branch" == *-test ]]; then
  echo "ℹ️ Ya estás en una rama de pruebas ('$current_branch'). Los cambios se commitearán aquí."
  target_test_branch="$current_branch"
else
  # Si la rama actual tiene estructura jerárquica (ej: feature/foo)
  if [[ "$current_branch" == *"/"* ]]; then
    # Para evitar conflictos, crear la rama de pruebas con guion en lugar de slash después de la rama padre
    target_test_branch="${current_branch}-test"
    echo "🆕 Rama de pruebas destino (rama jerárquica ajustada): $target_test_branch"
  else
    # Rama raíz, se usa formato 'rama-test'
    target_test_branch="${current_branch}-test"
    echo "🆕 Rama de pruebas destino (rama raíz): $target_test_branch"
  fi

  # Verificar si la rama de pruebas destino ya existe
  if git rev-parse --verify "$target_test_branch" >/dev/null 2>&1; then
    echo "⚠️ La rama de pruebas '$target_test_branch' ya existe localmente."
    read -rp "¿Deseas cambiar a '$target_test_branch' y commitear los cambios actuales allí? (s/N): " switch_to_existing
    if [[ "${switch_to_existing,,}" == "s" ]]; then
      if ! git checkout "$target_test_branch"; then
        echo "❌ No se pudo cambiar a la rama '$target_test_branch'." >&2
        exit 1
      fi
      echo "✅ Cambiado a la rama existente '$target_test_branch'."
    else
      echo "🛑 Operación cancelada. No se han realizado cambios."
      exit 1
    fi
  else
    echo "🌱 Creando y cambiando a la nueva rama de pruebas '$target_test_branch'..."
    if ! git checkout -b "$target_test_branch"; then
      echo "❌ No se pudo crear o cambiar a la rama '$target_test_branch'." >&2
      exit 1
    fi
    echo "✅ Creada y cambiada a la nueva rama '$target_test_branch'."
  fi
fi

# 4. Preparar todos los cambios para commit
echo "➕ Preparando (staging) todos los cambios..."
git add .

# 5. Commit de los cambios
default_commit_msg="WIP: Pruebas en $target_test_branch"
read -rp "Mensaje para el commit (deja vacío para '$default_commit_msg'): " user_commit_msg
commit_msg="${user_commit_msg:-$default_commit_msg}"

if git commit -m "$commit_msg"; then
  echo "✅ Cambios commiteados en '$target_test_branch' con el mensaje: '$commit_msg'"
else
  echo "❌ Falló el commit. Puede que no haya cambios para commitear o algún hook pre-commit falló." >&2
  if git diff --cached --quiet; then
    echo "ℹ️ No había cambios staged para el commit. Verifica que los archivos no estén vacíos o ignorados."
  fi
  exit 1
fi

# 6. Ejecutar script start.sh
./scripts/start.sh

echo "🎉 Proceso completado. Tus cambios están ahora en la rama '$target_test_branch'."

# --- Fin del Script test.sh ---
