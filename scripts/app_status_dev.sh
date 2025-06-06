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
  ["Frontend (React App)"]="http://localhost:4545;nodex_frontend_dev"  # <<< CHANGED TO HTTP
  ["Backend API (FastAPI)"]="http://localhost:8000/docs;nodex_backend_dev"
  ["RedisGraph (Puerto TCP)"]="localhost:6379;my-redisgraph-dev" # host:port para TCP
)

MAX_RETRIES=3     # Número de reintentos para cada servicio (más bajo para un status check rápido)
RETRY_INTERVAL=2 # Segundos entre reintentos

# --- Funciones de Ayuda ---
log_info() { echo -e "${CYAN}ℹ️ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

is_container_running() {
  if docker ps --format '{{.Names}}' | grep -q "^${1}$"; then
    return 0 # Corriendo
  else
    return 1 # No corriendo
  fi
}

check_service_health() {
  local service_display_name="$1"
  local check_details="$2"
  
  local endpoint="${check_details%;*}"
  local container_log_name="${check_details#*;}"
  
  local attempt=1

  log_info "Verificando salud de '$service_display_name' en '$endpoint'..."
  while [ $attempt -le $MAX_RETRIES ]; do
    printf "  Intento %s/%s... " "$attempt" "$MAX_RETRIES"
    if [[ "$endpoint" == http* ]]; then
      http_status=$(curl -Lso /dev/null -w "%{http_code}" --max-time 3 "$endpoint" || echo "000")
      if [[ "$http_status" =~ ^[23]..$ ]]; then # 2xx o 3xx son éxito para /docs o la app
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
    else # Asume que es solo un número de puerto, verifica en localhost
       if nc -z -w 2 "localhost" "$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}OK (Puerto TCP localhost:$endpoint abierto)${NC}"
        return 0
      else
        echo -e "${YELLOW}Pendiente (Puerto TCP localhost:$endpoint cerrado/filtrado)${NC}"
      fi
    fi
    
    if [ $attempt -lt $MAX_RETRIES ]; then
      sleep $RETRY_INTERVAL
    fi
    ((attempt++))
  done

  log_error "Servicio '$service_display_name' no disponible en '$endpoint' después de $MAX_RETRIES intentos."
  if [ -n "$container_log_name" ] && is_container_running "$container_log_name"; then
    log_warning "Mostrando últimos 20 logs de '$container_log_name':"
    docker compose logs --tail=20 "$container_log_name" 2>/dev/null || \
    docker logs --tail 20 "$container_log_name" 2>/dev/null || \
    echo -e "${RED} (No se pudieron obtener logs para $container_log_name)${NC}"
  elif [ -n "$container_log_name" ]; then
    log_warning "El contenedor '$container_log_name' no está corriendo o no se especificó."
  fi
  return 1
}


# --- Lógica Principal ---
clear
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}==         Estado de Servicios Nodex (Entorno DEV)        ==${NC}"
echo -e "${CYAN}============================================================${NC}"
overall_status_ok=true
any_container_down=false

# 1. Verificar el estado de los Contenedores Docker
echo -e "\n${YELLOW}--- Estado de los Contenedores Docker ---${NC}"
for service_key in "${!DEV_CONTAINERS[@]}"; do
  container_name="${DEV_CONTAINERS[$service_key]}"
  if is_container_running "$container_name"; then
    log_success "$service_key: Contenedor '$container_name' está activo."
  else
    log_error "$service_key: Contenedor '$container_name' NO está en ejecución."
    overall_status_ok=false
    any_container_down=true
  fi
done

# Si algún contenedor esencial está caído, no tiene mucho sentido seguir con los checks de endpoints
# que dependen de esos contenedores.
if $any_container_down; then
  log_warning "Uno o más contenedores esenciales no están corriendo. Las verificaciones de endpoints pueden fallar."
  # No salimos, pero el estado general ya no será OK.
fi
echo ""

# 2. Verificar los Endpoints de los servicios
log_info "${YELLOW}--- Estado de los Endpoints y Puertos ---${NC}"
for service_display_name in "${!SERVICES_TO_CHECK[@]}"; do
  check_details="${SERVICES_TO_CHECK[$service_display_name]}"
  if ! check_service_health "$service_display_name" "$check_details"; then
    overall_status_ok=false
  fi
done
echo ""

# 3. Resumen Final
echo -e "${CYAN}============================================================${NC}"
echo -e "Verificación completada - $(date)"
echo -e "${CYAN}============================================================${NC}"

if $overall_status_ok; then
  log_success "¡Éxito! Todos los servicios del entorno de desarrollo parecen estar funcionando correctamente."
  exit 0
else
  log_error "¡Problema detectado! Revisa los detalles de arriba y los logs para diagnosticar."
  echo -e "   Ejecuta ${CYAN}'docker compose logs -f'${NC} o ${CYAN}'docker compose logs -f [nombre_del_contenedor]'${NC} para ver los logs en tiempo real."
  exit 1
fi