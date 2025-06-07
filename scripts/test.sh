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

# Variables globales para opciones
FORCE_ACCEPT=false
NO_SAVE=false

# Ramas protegidas donde no se permiten ramas de prueba
PROTECTED_BRANCHES=("main" "master")

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

# Función para limpiar archivos Python con permisos elevados
cleanup_python_cache() {
    log_info "Limpiando archivos Python cache con permisos elevados..."
    # Primero intentamos con permisos normales
    find backend/app/ -name "*.pyc" -delete 2>/dev/null || true
    rm -rf backend/app/__pycache__/ 2>/dev/null || true

    # Si hay archivos que requieren permisos elevados, usamos sudo
    if [ -d "backend/app/__pycache__" ] || [ -n "$(find backend/app/ -name '*.pyc' 2>/dev/null)" ]; then
        log_info "Solicitando permisos de superusuario para limpiar archivos restantes..."
        sudo find backend/app/ -name "*.pyc" -delete 2>/dev/null || true
        sudo rm -rf backend/app/__pycache__/ 2>/dev/null || true
    fi
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
    echo "Usage: $0 [--force-accept] [--no-save]"
    echo "Options:"
    echo "  --force-accept    Automatically accept test as successful and save all changes"
    echo "  --no-save         Run test without creating branches or saving changes"
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
            --no-save)
                NO_SAVE=true
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

# Función para verificar si una rama está protegida
is_protected_branch() {
    local branch="$1"
    for protected in "${PROTECTED_BRANCHES[@]}"; do
        if [[ "$branch" == "$protected" ]]; then
            return 0  # true, está protegida
        fi
    done
    return 1  # false, no está protegida
}

# --- Ejecución Principal ---
main() {
    # VERIFICACIÓN INICIAL DE RAMA PROTEGIDA - DEBE SER LO PRIMERO
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [[ -z "$current_branch" ]]; then
        log_error "No se pudo detectar la rama actual. Asegúrate de estar en un repositorio Git."
        exit 1
    fi

    # Verificar inmediatamente si estamos en una rama protegida
    if is_protected_branch "$current_branch"; then
        log_warning "⚠️ ADVERTENCIA CRÍTICA: Estás en la rama protegida '$current_branch'"
        log_warning "Las pruebas en ramas protegidas (main/master) solo pueden ejecutarse en modo no-save"
        log_warning "No se permiten ramas de prueba ni guardar cambios en estas ramas"
        log_warning "El script se ejecutará en modo no-save automáticamente"
        NO_SAVE=true
    fi

    # Verificar si intentamos crear una rama de prueba desde una rama protegida
    if [[ "$current_branch" != */test ]] && [[ "$current_branch" != *-test ]]; then
        if is_protected_branch "$current_branch"; then
            log_error "❌ NO SE PERMITE crear ramas de prueba desde la rama protegida '$current_branch'"
            log_error "Por favor, cambia a una rama de desarrollo antes de crear ramas de prueba"
            exit 1
        fi
    fi

    # Ahora sí, continuamos con el resto del script
    local start_time
    start_time=$(date +%s)

    # Procesar argumentos
    process_args "$@"

    # Limpia los puertos antes de iniciar cualquier servicio
    cleanup_ports

    log_info "Starting test script..."

    if [[ "$NO_SAVE" == "true" ]]; then
        log_info "Running in no-save mode - will only execute test without branch management or saving changes"
        # Ejecutar la aplicación de prueba directamente
        if [ -f "./scripts/start.sh" ]; then
            ./scripts/start.sh
            log_success "Test execution completed in $(($(date +%s) - start_time)) seconds."

            # Si estamos en rama protegida, preguntar por limpieza final
            if is_protected_branch "$current_branch"; then
                echo ""
                log_warning "⚠️ IMPORTANTE: Estás en la rama protegida '$current_branch'"
                log_warning "Se recomienda limpiar cualquier cambio residual de la prueba"
                while true; do
                    read -rp "$(echo -e "${YELLOW}¿Desea terminar el flujo de prueba en rama $current_branch? (si/no): ${NC}")" confirm_cleanup
                    case "${confirm_cleanup,,}" in
                        si|s|yes|y)
                            log_info "Limpiando cambios residuales en rama protegida..."
                            
                            # 1. Primero limpiar archivos Python con permisos elevados
                            cleanup_python_cache
                            
                            # 2. Luego hacer reset y clean de git
                            if git reset --hard HEAD; then
                                # 3. Limpiar node_modules y otros archivos no rastreados
                                if git clean -fdx; then
                                    # 4. Verificar si quedaron archivos Python
                                    if [ -d "backend/app/__pycache__" ] || [ -n "$(find backend/app/ -name '*.pyc' 2>/dev/null)" ]; then
                                        log_warning "⚠️ Algunos archivos Python cache no se pudieron eliminar automáticamente"
                                        log_warning "Puedes eliminarlos manualmente con: sudo rm -rf backend/app/__pycache__/ && sudo find backend/app/ -name '*.pyc' -delete"
                                    else
                                        log_success "✅ Rama protegida '$current_branch' limpiada exitosamente"
                                    fi
                                else
                                    log_error "❌ Error al limpiar archivos no rastreados. Por favor, verifica manualmente"
                                fi
                            else
                                log_error "❌ Error al resetear la rama. Por favor, verifica manualmente"
                            fi
                            break
                            ;;
                        no|n)
                            log_warning "⚠️ No se limpiaron los cambios. Por favor, verifica manualmente el estado de la rama"
                            break
                            ;;
                        *)
                            log_warning "Respuesta inválida. Por favor, responde 'si' o 'no'"
                            ;;
                    esac
                done
            fi
        else
            log_error "./scripts/start.sh not found. Cannot run test."
            exit 1
        fi
        return
    fi

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

}

# Ejecuta la función principal
main "$@"
