#!/bin/bash
#
# ==============================================================================
# create_full_context.sh (Versión Definitiva y Robusta)
# ==============================================================================
#
# Description:
#   Escanea los archivos importantes del proyecto y los consolida en un solo
#   archivo de texto para un agente de IA. Excluye correctamente los
#   directorios y archivos especificados y es resistente a errores en
#   archivos individuales.
#
# Usage:
#   ./create_full_context.sh
#
# ==============================================================================

# NO USAR 'set -e'. Un fallo en un solo archivo no debe detener todo el script.
# La robustez es más importante aquí que la terminación por fallo.

# --- CONFIGURACIÓN ---

# 1. Archivos y directorios a incluir en el escaneo inicial.
FULL_CONTEXT_ITEMS=(
  "frontend"
  "backend"
  "docker-compose.yml"
  "docker"
)

# 2. Nombres de directorios a excluir completamente.
# Esta es la lista de exclusión más importante.
EXCLUDE_DIRS=(
  ".git"
  "node_modules"
  "__pycache__"
  "venv"
  "scan_results"
  "target"
  "build"
  "dist"
  ".idea"
  ".vscode"
  ".terraform"
  ".serverless"
  ".next"
  ".DS_Store"
  "coverage"
)

# 3. Archivos específicos o patrones glob a excluir.
EXCLUDE_FILES=(
  "README.md" "LICENSE" ".env" "*.log" "*.tmp" "*.swp" "*.bak" "*.old"
  "frontend/package-lock.json" "frontend/package.json"
  "*.ico" "*.png" "*.jpg" "*.jpeg" "*.gif" "*.svg" "*.pdf" "*.zip" "*.gz"
  "auxiliar/code_context/*"
)

# --- LÓGICA DEL SCRIPT ---

# Limpiar archivos de contexto anteriores.
rm -f auxiliar/code_context/* 2>/dev/null || true

# Generar un nombre de archivo único con timestamp.
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_DIR="auxiliar/code_context"
OUTPUT_FILE="${OUTPUT_DIR}/code_context_full_${TIMESTAMP}.txt"
FILE_COUNTER=0

# Asegurarse de que el directorio de salida exista.
mkdir -p "$OUTPUT_DIR"
# Crear/limpiar el archivo de salida.
> "$OUTPUT_FILE"

echo "================================================="
echo "  Creando Contexto Completo del Proyecto"
echo "================================================="
echo "Archivo de Salida:    $OUTPUT_FILE"
echo "-------------------------------------------------"


# --- FUNCIONES AUXILIARES ---

# Comprueba si un archivo debe ser excluido por la lista EXCLUDE_FILES.
should_exclude_file() {
  local filepath="$1"
  for pattern in "${EXCLUDE_FILES[@]}"; do
    if [[ "$filepath" == $pattern ]]; then
      return 0 # 0 significa "true" (excluido).
    fi
  done
  return 1 # 1 significa "false" (no excluido).
}

# Procesa un solo archivo y lo añade al contexto.
process_file() {
    local file="$1"
    # Asegurarse de que la ruta sea relativa desde el directorio actual.
    local rel_path="${file#./}"

    # --- Comprobaciones de robustez ---
    # 1. Saltar si no es un archivo regular o no se puede leer.
    if ! [[ -f "$file" && -r "$file" ]]; then
        return
    fi

    # 2. Comprobar la lista de exclusión de archivos.
    if should_exclude_file "$rel_path"; then
        echo "  -> Saltando archivo excluido: $rel_path"
        return
    fi

    # 3. Comprobar si es binario (método seguro que no detiene el script).
    # Se redirige stderr a /dev/null para ignorar errores de 'file' en archivos extraños.
    if ! file --mime-type -b "$file" 2>/dev/null | grep -qE '^text/|^application/(json|javascript|xml|x-sh|x-yaml|typescript)'; then
        echo "  -> Saltando archivo binario: $rel_path"
        return
    fi

    # --- Si pasa todas las comprobaciones, añadir el archivo ---
    echo "  -> Añadiendo archivo: $rel_path"
    {
      echo "===== $rel_path ====="
      # Usar cat, pero si falla, imprimir un mensaje de error en lugar de detener el script.
      cat "$file" || echo "### ERROR: No se pudo leer el archivo '$rel_path' ###"
      echo -e "\n"
    } >> "$OUTPUT_FILE"
    ((FILE_COUNTER++))
}

# --- PROCESAMIENTO PRINCIPAL ---

# Construir los argumentos -prune para el comando 'find'.
# Esta es la forma canónica y más fiable de excluir directorios.
find_prune_args=()
for dir in "${EXCLUDE_DIRS[@]}"; do
    find_prune_args+=(-name "$dir" -prune -o)
done

# Bucle principal: recorre los elementos de inicio y los maneja según su tipo.
for item in "${FULL_CONTEXT_ITEMS[@]}"; do
    if [[ ! -e "$item" ]]; then
        echo "Aviso: El elemento '$item' no existe. Saltando."
        continue
    fi

    if [[ -d "$item" ]]; then
        # Si es un directorio, usar 'find' para buscar dentro, excluyendo los subdirectorios.
        # Se usa 'find ... -print0 | while ... read -d' para manejar correctamente nombres con espacios.
        echo "--- Escaneando Directorio: $item ---"
        find "$item" ${find_prune_args[@]} -type f -print0 | while IFS= read -r -d $'\0' file; do
            process_file "$file"
        done
    elif [[ -f "$item" ]]; then
        # Si es un archivo, procesarlo directamente.
        process_file "$item"
    fi
done

echo "-------------------------------------------------"
echo "¡Éxito! El contexto completo del proyecto ha sido creado."
echo "Total de archivos incluidos: $FILE_COUNTER"
echo "Archivo de salida: $OUTPUT_FILE"
echo "================================================="