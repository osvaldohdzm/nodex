#!/bin/bash
set -euo pipefail

start_time=$(date +%s)



# --- Colores para la Salida ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # Sin color

# --- Configuración ---
PORTS_TO_CLEAN=("6379" "8000" "4545")

declare -A SERVICES_TO_CHECK=(
  ["Frontend (React App)"]="http://localhost:4545"
  ["Backend API (FastAPI)"]="http://localhost:8000/docs"
  ["RedisGraph (Puerto TCP)"]="localhost:6379"
)

declare -A CONTAINER_NAMES=(
  ["Frontend (React App)"]="nodex_frontend_dev"
  ["Backend API (FastAPI)"]="nodex_backend_dev"
  ["RedisGraph (Puerto TCP)"]="my-redisgraph-dev"
)

MAX_RETRIES=12
RETRY_INTERVAL=5

# --- Funciones de Log ---
log_info()    { echo -e "${CYAN}ℹ️ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

# --- Limpieza de Puertos ---
cleanup_ports() {
  log_info "Verificando y liberando puertos necesarios..."
  for port in "${PORTS_TO_CLEAN[@]}"; do
    container_id=$(docker ps -q --filter "publish=${port}")

    if [[ -n "$container_id" ]]; then
      container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^\///')
      log_warning "Puerto $port ocupado por contenedor '$container_name' (ID: $container_id)."
      log_info "🔪 Eliminando contenedor '$container_name' para liberar el puerto..."
      if docker rm -f "$container_id"; then
        log_success "Puerto $port liberado."
      else
        log_error "No se pudo eliminar el contenedor '$container_name'. Requiere intervención manual."
      fi
    else
      log_info "👍 Puerto $port está libre."
    fi
  done
  echo ""
}

# --- Manejo de cambios en Git ---
handle_git_changes() {
  local current_branch no_changes target_test_branch commit_msg

  if git diff-index --quiet HEAD --; then
    log_success "No hay cambios pendientes en el directorio de trabajo."
    no_changes=true
  else
    log_warning "Cambios detectados en el directorio de trabajo."
    no_changes=false
  fi

  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ -z "$current_branch" ]]; then
    log_error "No se pudo obtener la rama actual."
    exit 1
  fi
  log_info "Rama actual: $current_branch"

  if [[ "$no_changes" != true ]]; then
    if [[ "$current_branch" == */test || "$current_branch" == *-test ]]; then
      target_test_branch="$current_branch"
    else
      target_test_branch="${current_branch}-test"
      log_info "Rama de pruebas destino: $target_test_branch"

      if ! git show-ref --verify --quiet "refs/heads/$target_test_branch"; then
        log_info "🌱 Creando nueva rama '$target_test_branch'..."
        git checkout -b "$target_test_branch"
      else
        log_warning "La rama '$target_test_branch' ya existe. Se usará la rama actual '$current_branch'."
        target_test_branch="$current_branch"
      fi
    fi

    git add .

    # Construcción del mensaje de commit
    local base_branch short_name last_test_number next_test_number default_commit_msg user_commit_msg
    base_branch="${current_branch%-test}"
    base_branch="${base_branch%/test}"

    case "$base_branch" in
      feature/*) short_name="${base_branch#feature/}" ;;
      hotfix/*)  short_name="${base_branch#hotfix/}"  ;;
      bugfix/*)  short_name="${base_branch#bugfix/}"  ;;
      dev)       short_name="dev" ;;
      *)         short_name="$base_branch" ;;
    esac

    last_test_number=$(git log --pretty=format:"%s" "$target_test_branch" | grep -oP "^Prueba \K[0-9]+(?= de $short_name)" | sort -rn | head -n1 || echo 0)
    next_test_number=$((last_test_number + 1))

    default_commit_msg="Prueba $next_test_number de $short_name"
    read -rp "$(echo -e "${YELLOW}Mensaje para el commit (Enter para usar '${default_commit_msg}'): ${NC}")" user_commit_msg
    commit_msg="${user_commit_msg:-$default_commit_msg}"

    if git commit -m "$commit_msg"; then
      log_success "Cambios commiteados: '$commit_msg' en '$target_test_branch'"
    else
      log_error "El commit falló. ¿Hay algo para commitear?"
      exit 1
    fi
  else
    log_info "Sin cambios a commitear, continuando..."
  fi
}

cleanup_ports
handle_git_changes

./scripts/start.sh

log_success "🎉 Script ejecutado con éxito en $(($(date +%s) - start_time)) segundos."
exit 0
