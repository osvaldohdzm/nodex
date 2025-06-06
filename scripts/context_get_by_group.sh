#!/bin/bash

set -e

# Asociar grupos con archivos o carpetas
declare -A GROUP_FILES
GROUP_FILES[frontend]="frontend"
GROUP_FILES[backend]="backend"
GROUP_FILES[full]="frontend backend docker-compose.yml frontend/Dockerfile docker"

# Extensiones permitidas (sólo para grupos distintos de "full")
INCLUDE_EXTENSIONS=(py js json yml yaml css html tsx ts r)

# Directorios a excluir
EXCLUDE_DIRS=(.git node_modules __pycache__ venv scan_results target build dist .idea .vscode .terraform .serverless)

# Archivos a excluir (pueden incluir patrones con '*')
EXCLUDE_FILES=(
  README.md LICENSE .env .DS_Store "*.log" "*.tmp" "*.swp" "*.bak" "*.old"
  "frontend/package-lock.json" "frontend/package.json"
)

# Argumento: nombre del grupo
GROUP="$1"
# Generar un timestamp para el nombre del archivo de salida.
# Formato: AAAA-MM-DD_HH-MM-SS
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="auxiliar/code_context/code_context_${TIMESTAMP}.txt" # Cambiado para incluir el timestamp


if [[ -z "${GROUP_FILES[$GROUP]}" ]]; then
  echo "Grupo inválido. Opciones válidas: ${!GROUP_FILES[@]}"
  exit 1
fi

echo "Selected group: $GROUP"
echo "Output file: $OUTPUT_FILE"
> "$OUTPUT_FILE"

# Convertir EXCLUDE_DIRS a opciones -path para find
find_exclude_dirs=()
for dir in "${EXCLUDE_DIRS[@]}"; do
  find_exclude_dirs+=(-path "*/$dir/*" -prune -o)
done

# Convertir INCLUDE_EXTENSIONS en -name opciones
include_name_args=()
for ext in "${INCLUDE_EXTENSIONS[@]}"; do
  include_name_args+=(-name "*.$ext" -o)
done
unset 'include_name_args[${#include_name_args[@]}-1]' # Remove last -o

# Convertir archivos/patrones a excluir
should_exclude_file() {
  local filepath="$1"
  for pattern in "${EXCLUDE_FILES[@]}"; do
    if [[ "$filepath" == $pattern ]]; then
      return 0
    fi
  done
  return 1
}

# Procesar archivos por grupo
for item in ${GROUP_FILES[$GROUP]}; do
  if [ -d "$item" ]; then
    if [ "$GROUP" == "full" ]; then
      files=$(find "$item" "${find_exclude_dirs[@]}" -type f -print)
    else
      files=$(find "$item" "${find_exclude_dirs[@]}" -type f \( "${include_name_args[@]}" \) -print)
    fi
  elif [ -f "$item" ]; then
    files="$item"
  else
    echo "Skipping non-existent item: $item"
    continue
  fi

  while IFS= read -r file; do
    rel_path="${file#./}"
    if should_exclude_file "$rel_path"; then
      echo "Skipping excluded file: $rel_path"
      continue
    fi

    echo "===== $rel_path =====" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
  done <<< "$files"
done

echo "Context successfully written to $OUTPUT_FILE"
