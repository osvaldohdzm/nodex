#!/bin/bash
set -euo pipefail # -e: exit on error, -u: treat unset variables as error, -o pipefail: exit status of last command in pipe

# --- Colores para la Salida ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# --- Configuración ---
# Puertos que nuestra aplicación necesita.
PORTS_TO_CLEAN=("6379" "8000" "4545")

# Servicios y sus endpoints para verificación de salud
declare -A SERVICES_TO_CHECK=(
  ["Frontend (React App)"]="http://localhost:4545"
  ["Backend API (FastAPI)"]="http://localhost:8000/docs"
  ["RedisGraph (Puerto TCP)"]="localhost:6379" # Format: host:port for TCP check
)
# Nombres de contenedores para logs (deben coincidir con docker-compose.yml y las claves de SERVICES_TO_CHECK)
declare -A CONTAINER_NAMES=(
  ["Frontend (React App)"]="nodex_frontend_dev"
  ["Backend API (FastAPI)"]="nodex_backend_dev"
  ["RedisGraph (Puerto TCP)"]="my-redisgraph-dev"
)

MAX_RETRIES=12 # Total retries for health checks (e.g., 12 * 5s = 60s total wait)
RETRY_INTERVAL=5 # Seconds between retries

# --- Funciones de Ayuda ---
log_info() { echo -e "${CYAN}ℹ️ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

cleanup_ports() {
  log_info "Verificando y liberando puertos necesarios..."
  for port in "${PORTS_TO_CLEAN[@]}"; do
    container_id=$(docker ps -q --filter "publish=${port}")
    
    if [ -n "$container_id" ]; then
      container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^\///')
      log_warning "El puerto $port está ocupado por el contenedor '$container_name' (ID: $container_id)."
      log_info "🔪 Forzando la detención y eliminación de '$container_name' para liberar el puerto..."
      if docker rm -f "$container_id"; then
        log_success "Puerto $port liberado."
      else
        log_error "No se pudo eliminar el contenedor '$container_name'. Puede que necesites hacerlo manualmente."
      fi
    else
      log_info "👍 El puerto $port está libre."
    fi
  done
  echo ""
}

handle_git_changes() {
  local current_branch no_changes target_test_branch commit_msg
  
  if git diff-index --quiet HEAD --; then
    log_success "No hay cambios pendientes en el directorio de trabajo."
    no_changes=true
  else
    log_warning "Detectados cambios pendientes en el directorio de trabajo."
    no_changes=false
  fi

  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ -z "$current_branch" ]]; then
    log_error "No se pudo detectar la rama actual. Asegúrate de estar en un repositorio Git."
    exit 1
  fi
  log_info "Rama actual: $current_branch"

  if [[ "$no_changes" != true ]]; then
    target_test_branch=""
    if [[ "$current_branch" == */test ]] || [[ "$current_branch" == *-test ]]; then
      log_info "Ya estás en una rama de pruebas ('$current_branch'). Los nuevos cambios se commitearán aquí."
      target_test_branch="$current_branch"
    else
      target_test_branch="${current_branch}-test"
      log_info "Rama de pruebas destino: $target_test_branch"

      if ! git rev-parse --verify "$target_test_branch" >/dev/null 2>&1; then
        log_info "🌱 Creando nueva rama de pruebas '$target_test_branch'..."
        if ! git checkout -b "$target_test_branch"; then
          log_error "No se pudo crear la rama '$target_test_branch'."
          exit 1
        fi
      else
        log_warning "La rama de pruebas '$target_test_branch' ya existe. Los cambios se commitearán en tu rama actual ('$current_branch')."
        target_test_branch="$current_branch" # Commit to current branch if -test exists and user didn't switch
      fi
    fi

    log_info "➕ Preparando (staging) todos los cambios..."
    git add .

    local base_branch_for_count short_name last_test_number next_test_number default_commit_msg user_commit_msg
    base_branch_for_count="${current_branch%-test}"
    base_branch_for_count="${base_branch_for_count%/test}"
    case "$base_branch_for_count" in
      feature/*) short_name="${base_branch_for_count#feature/}" ;;
      hotfix/*)  short_name="${base_branch_for_count#hotfix/}"  ;;
      bugfix/*)  short_name="${base_branch_for_count#bugfix/}"  ;;
      dev)       short_name="dev" ;;
      *)         short_name="$base_branch_for_count" ;;
    esac
    
    if [[ -z "$short_name" ]]; then short_name="unknown"; fi
    log_info "📝 Feature/Tarea base: '$short_name'"

    last_test_number=$(git log --pretty=format:"%s" "${target_test_branch}" | grep -oP "^Prueba \K[0-9]+(?= de $short_name)" | sort -rn | head -n 1 || echo 0)
    next_test_number=$((last_test_number + 1))

    default_commit_msg="Prueba $next_test_number de $short_name"
    read -rp "$(echo -e "${YELLOW}Mensaje para el commit (deja vacío para '${default_commit_msg}'): ${NC}")" user_commit_msg
    commit_msg="${user_commit_msg:-$default_commit_msg}"

    if git commit -m "$commit_msg"; then
      log_success "Cambios commiteados con el mensaje: '$commit_msg' en la rama '$target_test_branch'"
    else
      log_error "Falló el commit. Puede que no haya cambios staged o que estés en un estado conflictivo."
      exit 1
    fi
  else
    log_info "No hay cambios para commitear, se procederá a levantar el entorno."
  fi
}

# --- Lógica Principal ---
echo -e "${CYAN}🚀 Iniciando script de pruebas integrado Nodex...${NC}"
start_time=$(date +%s)

# 1. Limpieza de Puertos
cleanup_ports

# 2. Gestión de Git
handle_git_changes
echo ""

# 3. Ejecución con Docker Compose
log_info "🐳 Gestionando entorno Docker Compose..."

log_info "🧹 Deteniendo y eliminando cualquier instancia previa del proyecto Compose..."
docker compose down --remove-orphans -t 1 # -t 1 para timeout rápido si no hay nada que detener
log_success "Entorno Docker Compose limpiado."

log_info "🏗️  Construyendo (si es necesario) y levantando servicios en segundo plano..."
if docker compose up --build -d; then
  log_success "Servicios de Docker Compose iniciados."
else
  log_error "Falló 'docker compose up'. Revisa los logs de construcción."
  docker compose logs --tail=50 # Muestra logs si 'up' falla
  exit 1
fi
echo ""


exit 0