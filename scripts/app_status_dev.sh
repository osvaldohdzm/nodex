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
# Asegúrate que los nombres de servicio aquí (claves del array) son descriptivos.
# Los valores son los endpoints o "host:port" para chequeos TCP.
declare -A SERVICES_TO_CHECK=(
  ["Frontend (React App)"]="http://localhost:4545"
  ["Backend API (FastAPI)"]="http://localhost:8000/docs"
  ["RedisGraph (Puerto TCP)"]="localhost:6379"
)
# Nombres de contenedores para logs (deben coincidir con docker-compose.yml)
# Las claves DEBEN COINCIDIR con las claves de SERVICES_TO_CHECK para que los logs se asocien correctamente.
declare -A CONTAINER_LOG_NAMES=(
  ["Frontend (React App)"]="nodex_frontend_dev"
  ["Backend API (FastAPI)"]="nodex_backend_dev"
  ["RedisGraph (Puerto TCP)"]="my-redisgraph-dev"
)

MAX_RETRIES=15    # Aumentado a 15 intentos (e.g., 15 * 5s = 75s total wait)
RETRY_INTERVAL=5 # Seconds between retries

# --- Funciones de Ayuda ---
log_info() { echo -e "${CYAN}ℹ️ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

cleanup_ports() {
  log_info "Verificando y liberando puertos necesarios..."
  for port_to_clean in "${PORTS_TO_CLEAN[@]}"; do
    # Busca el ID del contenedor que está usando el puerto
    container_id=$(docker ps -q --filter "publish=${port_to_clean}")
    
    if [ -n "$container_id" ]; then
      container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^\///')
      log_warning "El puerto $port_to_clean está ocupado por el contenedor '$container_name' (ID: $container_id)."
      log_info "🔪 Forzando la detención y eliminación de '$container_name' para liberar el puerto..."
      if docker rm -f "$container_id"; then
        log_success "Puerto $port_to_clean liberado."
      else
        log_error "No se pudo eliminar el contenedor '$container_name'. Puede que necesites hacerlo manualmente."
      fi
    else
      log_info "👍 El puerto $port_to_clean está libre."
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
    # Si ya estamos en una rama que termina en -test o /test, usamos esa.
    if [[ "$current_branch" == *"-test" ]] || [[ "$current_branch" == *"/test" ]]; then
      log_info "Ya estás en una rama de pruebas ('$current_branch'). Los nuevos cambios se commitearán aquí."
      target_test_branch="$current_branch"
    else
      target_test_branch="${current_branch}-test"
      log_info "Rama de pruebas destino: $target_test_branch"

      if ! git rev-parse --verify "$target_test_branch" >/dev/null 2>&1; then
        log_info "🌱 Creando nueva rama de pruebas '$target_test_branch' desde '$current_branch'..."
        if ! git checkout -b "$target_test_branch" "$current_branch"; then # Crear desde current_branch
          log_error "No se pudo crear la rama '$target_test_branch'."
          exit 1
        fi
      else
        log_info "🔁 Cambiando a la rama de pruebas existente '$target_test_branch'..."
        if ! git checkout "$target_test_branch"; then
            log_error "No se pudo cambiar a la rama '$target_test_branch'."
            exit 1
        fi
        # Opcional: mergear cambios de la rama base si es necesario
        # echo "🔄 Intentando mergear cambios de '$current_branch' en '$target_test_branch'..."
        # if ! git merge "$current_branch" --no-edit; then
        #   log_warning "Merge de '$current_branch' en '$target_test_branch' falló o tuvo conflictos. Revisa manualmente."
        # fi
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
      main|master) short_name="main" ;;
      *)         short_name="$base_branch_for_count" ;;
    esac
    
    if [[ -z "$short_name" ]]; then short_name="general"; fi
    log_info "📝 Feature/Tarea base para numeración de prueba: '$short_name'"

    # Contar pruebas en la rama de pruebas actual
    last_test_number=$(git log --first-parent --pretty=format:"%s" | grep -oP "^Prueba \K[0-9]+(?= de $short_name)" | sort -rn | head -n 1 || echo 0)
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

check_service_health() {
  local service_name="$1"
  local endpoint="$2"
  local container_log_name="${CONTAINER_LOG_NAMES[$service_name]:-}" # Get log name, default to empty if not found
  local attempt=1

  log_info "Verificando salud de '$service_name' en '$endpoint'..."
  while [ $attempt -le $MAX_RETRIES ]; do
    printf "  Intento %s/%s... " "$attempt" "$MAX_RETRIES"
    if [[ "$endpoint" == http* ]]; then
      # For HTTP, use curl. -s for silent, -o /dev/null to discard body, -w "%{http_code}" to get status code
      # Check for 2xx or 3xx status codes as success
      http_status=$(curl -Lso /dev/null -w "%{http_code}" --max-time 3 "$endpoint" || echo "000")
      if [[ "$http_status" =~ ^[23]..$ ]]; then
        echo -e "${GREEN}OK (HTTP $http_status)${NC}"
        return 0
      else
        echo -e "${YELLOW}Pendiente (HTTP $http_status)${NC}"
      fi
    elif [[ "$endpoint" == *":"* ]]; then # host:port format for TCP
      local host="${endpoint%:*}"
      local port="${endpoint#*:}"
      if nc -z -w 2 "$host" "$port" > /dev/null 2>&1; then
        echo -e "${GREEN}OK (Puerto TCP abierto)${NC}"
        return 0
      else
        echo -e "${YELLOW}Pendiente (Puerto TCP cerrado/filtrado)${NC}"
      fi
    else # Assume it's just a port number, check against localhost
       if nc -z -w 2 "localhost" "$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}OK (Puerto TCP localhost:$endpoint abierto)${NC}"
        return 0
      else
        echo -e "${YELLOW}Pendiente (Puerto TCP localhost:$endpoint cerrado/filtrado)${NC}"
      fi
    fi
    sleep $RETRY_INTERVAL
    ((attempt++))
  done

  log_error "Servicio '$service_name' no disponible en '$endpoint' después de $MAX_RETRIES intentos."
  if [ -n "$container_log_name" ] && docker ps -q --filter "name=^/${container_log_name}$" > /dev/null; then
    log_warning "Mostrando últimos 30 logs de '$container_log_name':"
    docker compose logs --tail=30 "$container_log_name" || echo " (No se pudieron obtener logs para $container_log_name)"
  elif [ -n "$container_log_name" ]; then
    log_warning "El contenedor '$container_log_name' no está corriendo. No se pueden mostrar logs específicos."
  fi
  return 1
}

# --- Lógica Principal ---
clear
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}==    🚀 Iniciando Script de Pruebas Integrado Nodex 🚀   ==${NC}"
echo -e "${CYAN}============================================================${NC}"
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
# El --build aquí es CLAVE para recoger cambios como requirements.txt
if docker compose up --build -d; then
  log_success "Servicios de Docker Compose iniciados."
else
  log_error "Falló 'docker compose up'. Revisa los logs de construcción."
  docker compose logs --tail=50 # Muestra logs si 'up' falla
  exit 1
fi
echo ""

# 4. Verificación de Salud de los Servicios
log_info "🩺 Realizando verificación de salud de los servicios (puede tardar hasta $((MAX_RETRIES * RETRY_INTERVAL)) segundos)..."
all_services_healthy=true
for service_name in "${!SERVICES_TO_CHECK[@]}"; do
  if ! check_service_health "$service_name" "${SERVICES_TO_CHECK[$service_name]}"; then
    all_services_healthy=false
  fi
done
echo ""

end_time=$(date +%s)
duration=$((end_time - start_time))

# 5. Resumen Final
echo -e "${CYAN}============================================================${NC}"
if $all_services_healthy; then
  log_success "🎉 ¡Entorno de desarrollo Nodex listo y saludable en ${duration}s!"
  echo ""
  echo -e "${YELLOW}--- URLs ---${NC}"
  echo -e "🌐 Frontend (React Dev Server): ${GREEN}http://localhost:4545${NC} (o http://YOUR_IP:4545)"
  echo -e "⚙️  Backend API (FastAPI Docs): ${GREEN}http://localhost:8000/docs${NC} (o http://YOUR_IP:8000/docs)"
  echo -e "💾 RedisGraph (via redis-cli): ${GREEN}redis-cli -h localhost -p 6379${NC}"
  echo ""
  echo -e "${YELLOW}--- Comandos Útiles ---${NC}"
  echo -e "   Para ver los logs de todos los servicios en tiempo real:"
  echo -e "   👉 ${CYAN}docker compose logs -f${NC}"
  echo -e "   Para ver logs de un servicio específico (ej. backend):"
  echo -e "   👉 ${CYAN}docker compose logs -f nodex_backend_dev${NC}"
  echo ""
  echo -e "   Para detener el entorno cuando termines:"
  echo -e "   👉 ${CYAN}docker compose down${NC}"
else
  log_error "💥 Uno o más servicios no están saludables después de ${duration}s."
  log_warning "Revisa los logs detallados arriba o ejecuta 'docker compose logs -f [nombre_del_contenedor]'."
fi
echo -e "${CYAN}============================================================${NC}"

if $all_services_healthy; then
  exit 0
else
  exit 1
fi