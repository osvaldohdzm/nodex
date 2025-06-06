#!/bin/bash
set -euo pipefail

# --- Inicio del Script test.sh (Sin commits) ---

echo "🚀 Iniciando script de pruebas..."

# 1. Verificar si hay cambios sin commitear
if git diff-index --quiet HEAD --; then
  echo "⚠️ No hay cambios pendientes en el directorio de trabajo para commitear."
  no_changes=true
else
  echo "🔍 Detectados cambios pendientes en el directorio de trabajo."
  no_changes=false
fi

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
  echo "ℹ️ Ya estás en una rama de pruebas ('$current_branch'). Los cambios (si los hay) se usarán aquí."
  target_test_branch="$current_branch"
else
  target_test_branch="${current_branch}-test"
  echo "🆕 Rama de pruebas destino: $target_test_branch"

  if git rev-parse --verify "$target_test_branch" >/dev/null 2>&1; then
    echo "⚠️ La rama de pruebas '$target_test_branch' ya existe localmente."
    read -rp "¿Deseas cambiar a '$target_test_branch' y continuar con la prueba allí? (s/N): " switch_to_existing
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

# Ya no se hace git add ni git commit

echo "ℹ️ Se detectaron cambios: $no_changes. Sin embargo, no se realizarán commits ni staging."

echo "🎉 Proceso completado. Tus pruebas se ejecutarán en la rama '$target_test_branch'."

# 9. Ejecutar prueba
echo "🧪 Ejecutando script de prueba: ./scripts/start.sh"
# Asegúrate que start.sh sea ejecutable (chmod +x ./scripts/start.sh)
 ./scripts/start.sh
# --- Fin del Script test.sh ---
