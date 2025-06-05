#!/bin/bash
set -euo pipefail

# --- Inicio del Script test.sh (Versión Mejorada con contador en commit) ---

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
  if [[ "$current_branch" == *"/"* ]]; then
    target_test_branch="${current_branch}-test"
    echo "🆕 Rama de pruebas destino (rama jerárquica ajustada): $target_test_branch"
  else
    target_test_branch="${current_branch}-test"
    echo "🆕 Rama de pruebas destino (rama raíz): $target_test_branch"
  fi

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

# 5. Buscar el último número de "Prueba N" en los commits de la rama destino actual
last_test_number=$(git log "$target_test_branch" --pretty=format:"%s" | grep -oP '^Prueba \K\d+' | sort -nr | head -n1)
last_test_number="${last_test_number:-0}"
next_test_number=$((last_test_number + 1))

# 6. Construir mensaje por defecto con incremento
default_commit_msg="Prueba $next_test_number"

# 7. Pedir mensaje de commit al usuario, con opción de dejar vacío para usar el mensaje automático
read -rp "Mensaje para el commit (deja vacío para '$default_commit_msg'): " user_commit_msg
commit_msg="${user_commit_msg:-$default_commit_msg}"

# 8. Realizar commit
if git commit -m "$commit_msg"; then
  echo "✅ Cambios commiteados en '$target_test_branch' con el mensaje: '$commit_msg'"
else
  echo "❌ Falló el commit. Puede que no haya cambios para commitear o algún hook pre-commit falló." >&2
  if git diff --cached --quiet; then
    echo "ℹ️ No había cambios staged para el commit. Verifica que los archivos no estén vacíos o ignorados."
  fi
  exit 1
fi

# 9. Ejecutar script start.sh
./scripts/start.sh

echo "🎉 Proceso completado. Tus cambios están ahora en la rama '$target_test_branch'."

# --- Fin del Script test.sh ---
