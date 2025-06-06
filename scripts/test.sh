#!/bin/bash
set -euo pipefail

# --- Códigos de Colores para Salida ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # Sin Color

# --- Configuración de Servicios ---
# Puertos que se verificarán y liberarán si están en uso por contenedores Docker.
PORTS_TO_CLEAN=("6379" "8000" "4545")

# Variable global para force-accept
FORCE_ACCEPT=false

# --- Definiciones de Funciones ---

# Funciones de registro para diferentes tipos de mensajes
log_info()    { echo -e "${CYAN}[INFO] $1${NC}"; }
log_success() { echo -e "${GREEN}[OK] $1${NC}"; }
log_warning() { echo -e "${YELLOW}[WARN] $1${NC}"; }
log_error()   { echo -e "${RED}[ERROR] $1${NC}"; }

# Función para limpiar puertos
cleanup_ports() {
  log_info "Verificando y liberando puertos necesarios..."
  for port in "${PORTS_TO_CLEAN[@]}"; do
    # Encuentra el ID del contenedor usando el puerto
    container_id=$(docker ps -q --filter "publish=${port}")

    if [[ -n "$container_id" ]]; then
      container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^\///')
      log_warning "El puerto $port está en uso por el contenedor '$container_name' (ID: $container_id)."
      log_info "🔪 Deteniendo y eliminando el contenedor '$container_name' para liberar el puerto..."

      if docker rm -f "$container_id" > /dev/null 2>&1; then
        log_success "El puerto $port ha sido liberado exitosamente."
      else
        log_error "Fallo al eliminar el contenedor '$container_name'. Puede requerir intervención manual."
      fi
    else
      log_info "👍 El puerto $port está libre."
    fi
  done
  echo "" # Añade una nueva línea para mejor legibilidad
}

# Función para generar un mensaje de commit predeterminado
generate_commit_message() {
    local current_branch_name="$1"
    local base_branch short_name last_test_number next_test_number

    # Extrae el nombre de la rama base eliminando el sufijo '-test' o '/test'
    base_branch="${current_branch_name%-test}"
    base_branch="${base_branch%/test}"

    # Extrae un nombre corto de la rama para el mensaje de commit
    case "$base_branch" in
        feature/*) short_name="${base_branch#feature/}" ;;
        hotfix/*)  short_name="${base_branch#hotfix/}"  ;;
        bugfix/*)  short_name="${base_branch#bugfix/}"  ;;
        dev)       short_name="dev" ;;
        *)         short_name="$base_branch" ;;
    esac

    # Encuentra el último número de test y lo incrementa
    # Busca en los logs de git el patrón "Test [número] for [short_name]"
    last_test_number=$(git log --pretty=format:"%s" "$current_branch_name" | grep -oP "^Test \K[0-9]+(?= for $short_name)" | sort -rn | head -n1 || echo 0)
    next_test_number=$((last_test_number + 1))
    echo "Test $next_test_number for $short_name - Checkpoint"
}

# Función para mostrar el uso del script
show_usage() {
    echo "Usage: $0 [--force-accept]"
    echo "Options:"
    echo "  --force-accept    Automatically accept test as successful and save all changes"
    exit 1
}

# Función para procesar argumentos
process_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --force-accept)
                FORCE_ACCEPT=true
                shift
                ;;
            --help|-h)
                show_usage
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                ;;
        esac
    done
}

# --- Ejecución Principal ---
main() {
    local start_time
    start_time=$(date +%s) # Captura el tiempo de inicio

    # Procesar argumentos
    process_args "$@"

    # Limpia los puertos antes de iniciar cualquier servicio
    cleanup_ports

    log_info "Starting test script with checkpoint..."

    # 1. Obtener la rama actual ANTES de cualquier manipulación de Git
    local initial_branch
    initial_branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ -z "$initial_branch" ]]; then
        log_error "No se pudo detectar la rama actual. Asegúrate de estar en un repositorio Git."
        exit 1
    fi
    log_info "Initial branch: $initial_branch"

    # 2. Determinar la rama de pruebas destino y cambiar a ella
    local target_test_branch=""
    if [[ "$initial_branch" == */test ]] || [[ "$initial_branch" == *-test ]]; then
        log_info "Already in a test branch ('$initial_branch'). Test will run here."
        target_test_branch="$initial_branch"
    else
        target_test_branch="${initial_branch}-test"
        log_info "New test branch target: $target_test_branch"

        # Verifica si la rama de pruebas ya existe localmente
        if git rev-parse --verify "$target_test_branch" >/dev/null 2>&1; then
            if [[ "$FORCE_ACCEPT" == "true" ]]; then
                if ! git checkout "$target_test_branch"; then
                    log_error "Could not switch to branch '$target_test_branch'."
                    exit 1
                fi
                log_success "Switched to existing branch '$target_test_branch'."
            else
                log_warning "Test branch '$target_test_branch' already exists locally."
                read -rp "$(echo -e "${YELLOW}Do you want to switch to '$target_test_branch' and continue testing there? (s/N): ${NC}")" switch_to_existing
                if [[ "${switch_to_existing,,}" == "s" || "${switch_to_existing,,}" == "si" ]]; then
                    if ! git checkout "$target_test_branch"; then
                        log_error "Could not switch to branch '$target_test_branch'."
                        exit 1
                    fi
                    log_success "Switched to existing branch '$target_test_branch'."
                else
                    log_error "Operation cancelled. No changes were made."
                    exit 1
                fi
            fi
        else
            log_info "Creating and switching to new test branch '$target_test_branch'..."
            if ! git checkout -b "$target_test_branch"; then
                log_error "Could not create or switch to branch '$target_test_branch'."
                exit 1
            fi
            log_success "Created and switched to new branch '$target_test_branch'."
        fi
    fi

    # 3. Ejecutar la aplicación de prueba
    log_info "Running test script: ./scripts/start.sh"
    if [ -f "./scripts/start.sh" ]; then
        ./scripts/start.sh
    else
        log_error "./scripts/start.sh not found. Cannot run test."
        exit 1
    fi

    # 4. Manejar el resultado del test basado en --force-accept
    if [[ "$FORCE_ACCEPT" == "true" ]]; then
        log_info "Force accept mode: Automatically marking test as successful and saving changes..."
        git add .
        if git diff-index --quiet HEAD --; then
            log_warning "No changes to commit. Skipping commit."
        else
            default_commit_msg=$(generate_commit_message "$target_test_branch")
            if git commit -m "$default_commit_msg"; then
                log_success "Changes committed: '$default_commit_msg' in branch '$target_test_branch'."
            else
                log_error "Failed to commit changes. Please check manually."
            fi
        fi
    else
        # Preguntar al usuario si el test fue exitoso
        local test_successful=""
        while true; do
            read -rp "$(echo -e "${YELLOW}¿El test se considera exitoso? (s/n): ${NC}")" test_successful_input
            case "${test_successful_input,,}" in
                s|si) test_successful="true"; break ;;
                n|no) test_successful="false"; break ;;
                *) log_warning "Respuesta inválida. Por favor, responde 's', 'si', 'n' o 'no'.";;
            esac
        done

        # 5. Manejar el resultado del test (éxito o fallo)
        if [[ "$test_successful" == "true" ]]; then
            log_info "Test marked as successful."
            local save_changes=""
            while true; do
                read -rp "$(echo -e "${YELLOW}¿Deseas guardar los cambios como un checkpoint? (s/n): ${NC}")" save_changes_input
                case "${save_changes_input,,}" in
                    s|si) save_changes="true"; break ;;
                    n|no) save_changes="false"; break ;;
                    *) log_warning "Respuesta inválida. Por favor, responde 's', 'si', 'n' o 'no'.";;
                esac
            done

            if [[ "$save_changes" == "true" ]]; then
                log_info "Saving changes as checkpoint..."
                git add .
                if git diff-index --quiet HEAD --; then
                    log_warning "No pending changes to save. Skipping commit."
                else
                    default_commit_msg=$(generate_commit_message "$target_test_branch")
                    read -rp "$(echo -e "${YELLOW}Ingresa el mensaje de commit (ENTER para usar '${default_commit_msg}'): ${NC}")" user_commit_msg
                    commit_msg="${user_commit_msg:-$default_commit_msg}"

                    if git commit -m "$commit_msg"; then
                        log_success "Changes committed: '$commit_msg' in branch '$target_test_branch'."
                    else
                        log_error "Failed to commit. Please check manually."
                    fi
                fi
            else
                log_info "Changes will not be saved in a commit. You can manage them manually."
            fi
        else
            log_warning "Test marked as NOT successful."
            local reset_or_keep=""
            while true; do
                read -rp "$(echo -e "${YELLOW}¿Deseas mantener los cambios (k) o resetear y limpiar todo (r)? (k/r): ${NC}")" reset_or_keep_input
                case "${reset_or_keep_input,,}" in
                    k|mantener) reset_or_keep="keep"; break ;;
                    r|resetear) reset_or_keep="reset"; break ;;
                    *) log_warning "Respuesta inválida. Por favor, responde 'k', 'mantener', 'r' o 'resetear'.";;
                esac
            done

            if [[ "$reset_or_keep" == "reset" ]]; then
                log_info "Resetting and cleaning changes from last commit..."
                if git reset --hard HEAD && git clean -fdx; then
                    log_success "Repository reset and cleaned successfully."
                else
                    log_error "Failed to reset or clean repository. Please do it manually."
                fi
            else
                log_info "Changes will not be reset. You can manage them manually."
            fi
        fi
    fi

    log_success "Test and checkpoint process completed in $(($(date +%s) - start_time)) seconds."
    # Vuelve a la rama inicial solo si se cambió a una rama de prueba
    if [[ "$initial_branch" != "$target_test_branch" ]]; then
        log_info "Returning to initial branch: $initial_branch..."
        if git checkout "$initial_branch"; then
            log_success "Returned to branch '$initial_branch'."
        else
            log_error "Could not return to branch '$initial_branch'. Please do it manually."
        fi
    fi
    exit 0
}

# Ejecuta la función principal
main "$@"
