#!/bin/bash
set -uo pipefail

# --- Colores para la Salida ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# --- Configuración ---
# Nombres de los contenedores definidos en tu docker-compose.yml
declare -A DEV_CONTAINERS=(
  ["Backend"]="nodex_backend_dev"
  ["Frontend"]="nodex_frontend_dev"
  ["Redis"]="my-redisgraph-dev"
)

# Endpoints a verificar y sus contenedores asociados para logs
# Formato: "Nombre del Servicio para Mostrar"="endpoint_o_puerto;nombre_del_contenedor_para_logs"
declare -A SERVICES_TO_CHECK=(
  ["Frontend (React App)"]="http://localhost:4545;nodex_frontend_dev"
  ["Backend API (FastAPI)"]="http://localhost:8000/docs;nodex_backend_dev"
  ["RedisGraph (Puerto TCP)"]="localhost:6379;my-redisgraph-dev" # host:port para TCP
)

# Segundos de espera entre cada actualización
WAIT_INTERVAL=3

# --- Funciones de Ayuda ---
log_info() { echo -e "${CYAN}ℹ️ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Verifica si un contenedor está en ejecución
is_container_running() {
  if docker ps --format '{{.Names}}' | grep -q "^${1}$"; then
    return 0 # Corriendo
  else
    return 1 # No corriendo
  fi
}

# Verifica la salud de un servicio (un solo intento)
check_service_health() {
  local service_display_name="$1"
  local check_details="$2"
  
  local endpoint="${check_details%;*}"
  local container_log_name="${check_details#*;}"
  
  local status_message=""
  local result=1 # 0 para éxito, 1 para fallo

  if [[ "$endpoint" == http* ]]; then
    http_status=$(curl -Lso /dev/null -w "%{http_code}" --max-time 2 "$endpoint" || echo "000")
    if [[ "$http_status" =~ ^[23]..$ ]]; then # 2xx o 3xx son éxito
      status_message="${GREEN}EN LÍNEA (HTTP $http_status)${NC}"
      result=0
    else
      status_message="${RED}CAÍDO (HTTP $http_status)${NC}"
    fi
  elif [[ "$endpoint" == *":"* ]]; then # formato host:port para TCP
    local host="${endpoint%:*}"
    local port="${endpoint#*:}"
    if nc -z -w 2 "$host" "$port" > /dev/null 2>&1; then
      status_message="${GREEN}EN LÍNEA (Puerto TCP abierto)${NC}"
      result=0
    else
      status_message="${RED}CAÍDO (Puerto TCP cerrado)${NC}"
    fi
  fi
  
  printf "  %-25s: %s\n" "$service_display_name" "$status_message"
  return $result
}

# --- Lógica Principal ---

# Captura la interrupción (CTRL+C) para salir limpiamente
trap 'echo -e "\n\n${YELLOW}Saliendo del monitor de estado...${NC}"; exit 0' INT

while true; do
  clear
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}==      Estado en Tiempo Real de Servicios Nodex (DEV)    ==${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo -e "Última actualización: $(date +"%Y-%m-%d %H:%M:%S")"
  echo -e "(Presiona ${YELLOW}CTRL+C${NC} para salir)"
  
  # 1. Verificar el estado de los Contenedores Docker
  echo -e "\n${YELLOW}--- Estado de Contenedores Docker ---${NC}"
  any_container_down=false
  for service_key in "${!DEV_CONTAINERS[@]}"; do
    container_name="${DEV_CONTAINERS[$service_key]}"
    if is_container_running "$container_name"; then
      log_success "$(printf "%-10s: Contenedor '$container_name' está ACTIVO." "$service_key")"
    else
      log_error "$(printf "%-10s: Contenedor '$container_name' está CAÍDO." "$service_key")"
      any_container_down=true
    fi
  done
  
  # 2. Verificar los Endpoints de los servicios
  echo -e "\n${YELLOW}--- Estado de Endpoints y Puertos ---${NC}"
  for service_display_name in "${!SERVICES_TO_CHECK[@]}"; do
    check_details="${SERVICES_TO_CHECK[$service_display_name]}"
    check_service_health "$service_display_name" "$check_details"
  done

  echo -e "\n${CYAN}------------------------------------------------------------${NC}"
  
  # Espera antes de la siguiente iteración
  sleep $WAIT_INTERVAL
done
