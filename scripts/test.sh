#!/bin/bash
set -euo pipefail

# Define script directory at the start
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Inicio del Script test.sh (Versión Mejorada con Identificación de Feature/Hotfix/Dev) ---

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

# 4. Si hay cambios, preparar y commitear
if [[ "$no_changes" != true ]]; then
  echo "➕ Preparando (staging) todos los cambios..."
  git add .

  # 5. Detectar nombre de la feature/hotfix/dev original para el conteo específico
  base_branch_for_count="${current_branch%-test}"  # Elimina sufijo -test
  base_branch_for_count="${base_branch_for_count%/test}"  # Elimina sufijo /test

  # Extraer nombre limpio (sin prefijo tipo feature/, hotfix/, etc.)
  case "$base_branch_for_count" in
    feature/*) short_name="${base_branch_for_count#feature/}" ;;
    hotfix/*) short_name="${base_branch_for_count#hotfix/}" ;;
    bugfix/*) short_name="${base_branch_for_count#bugfix/}" ;;
    dev) short_name="dev" ;;
    *) short_name="$base_branch_for_count" ;;  # Fallback para otras ramas
  esac
# Asegurar que short_name no esté vacío para evitar errores con set -u
if [[ -z "$short_name" ]]; then
  short_name="unknown"
fi

echo "🧪 Estás probando la rama: '$short_name'"

# Buscar el último número de "Prueba N de <short_name>" en los mensajes de commit en la rama de prueba
# Se filtran líneas que contienen "Prueba <número> de <short_name>"
last_test_number=0
while IFS= read -r line; do
  # Extraer el número N de "Prueba N de <short_name>"
  if [[ "$line" =~ ^Prueba[[:space:]]([0-9]+)[[:space:]]de[[:space:]]$short_name ]]; then
    num="${BASH_REMATCH[1]}"
    (( num > last_test_number )) && last_test_number=$num
  fi
done < <(git log "$target_test_branch" --pretty=format:"%s")

next_test_number=$((last_test_number + 1))


  # 7. Construir mensaje por defecto con nombre de la feature
  default_commit_msg="Prueba $next_test_number de $short_name"
  read -rp "Mensaje para el commit (deja vacío para '$default_commit_msg'): " user_commit_msg
  commit_msg="${user_commit_msg:-$default_commit_msg}"

  # 8. Realizar commit
  if git commit -m "$commit_msg"; then
    echo "✅ Cambios commiteados en '$target_test_branch' con el mensaje: '$commit_msg'"
  else
    echo "❌ Falló el commit. Puede que no haya cambios staged o algún hook pre-commit falló." >&2
    if git diff --cached --quiet; then
      echo "ℹ️ No había cambios staged para el commit. Verifica que los archivos no estén vacíos o ignorados."
    fi
    exit 1
  fi
else
  echo "ℹ️ No hay cambios para commitear, pero se continuará con la ejecución de la prueba."
fi

echo "🎉 Proceso completado los cambios de la prueba han sido guardados. Tus pruebas se ejecutarán en la rama '$target_test_branch'."


# 9. Ejecutar prueba
echo "🧪 Ejecutando script de prueba: ./scripts/start.sh"
"$SCRIPT_DIR/start.sh"

