#!/bin/bash
set -uo pipefail # -e quitado temporalmente para que el script no muera si un curl falla

# --- Configuración ---
APP_CONTAINER_NAME="nodex_all_in_one"
REDIS_CONTAINER_NAME="my-redisgraph" # Para verificar si el contenedor de Redis está corriendo

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Servicios y sus puntos de verificación
# Clave: Nombre del servicio para mostrar
# Valor: URL para HTTP o puerto para TCP
declare -A services_to_check=(
  ["Frontend (React App)"]="http://localhost:4545"
  ["Backend API (FastAPI)"]="http://localhost:8000/docs" # /docs es una buena ruta para verificar
  ["RedisGraph (Puerto TCP)"]="6379"
)

# --- Funciones de Ayuda ---
check_http_alive() {
  local url="$1"
  # Usamos -L para seguir redirecciones, -I para solo headers (más rápido), -s para silencioso, -o /dev/null para descartar salida
  if curl -LfsI --max-time 3 "$url" -o /dev/null; then
    return 0 # Éxito
  else
    return 1 # Falla
  fi
}

check_port_listening() {
  local host="localhost" # Asumimos que los puertos están mapeados a localhost
  local port="$1"
  if nc -z -w 2 "$host" "$port" > /dev/null 2>&1; then # -w 2 para timeout de 2 segundos
    return 0 # Éxito
  else
    return 1 # Falla
  fi
}

is_container_running() {
  local container_name="$1"
  if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
    return 0 # Corriendo
  else
    return 1 # No corriendo
  fi
}

# --- Lógica Principal ---
clear
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}==         Estado de Servicios Nodex & RedisGraph         ==${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# 1. Verificar Contenedor de la Aplicación Nodex
echo -e "${YELLOW}--- Estado del Contenedor Nodex ---${NC}"
if is_container_running "$APP_CONTAINER_NAME"; then
  echo -e "${GREEN}[✓] Contenedor '$APP_CONTAINER_NAME' está activo.${NC}"
else
  echo -e "${RED}[×] Contenedor '$APP_CONTAINER_NAME' NO está en ejecución.${NC}"
  # Si el contenedor principal no está, no tiene mucho sentido seguir
  # docker logs --tail=30 "$APP_CONTAINER_NAME" 2>/dev/null || echo -e "${RED}   No se pudieron obtener logs (contenedor no existe).${NC}"
  # echo -e "\n${CYAN}============================================================${NC}"
  # echo -e "Verificación completada - $(date)"
  # echo -e "${CYAN}============================================================${NC}"
  # exit 1
fi
echo ""

# 2. Verificar Contenedor de RedisGraph
echo -e "${YELLOW}--- Estado del Contenedor RedisGraph ---${NC}"
if is_container_running "$REDIS_CONTAINER_NAME"; then
  echo -e "${GREEN}[✓] Contenedor '$REDIS_CONTAINER_NAME' está activo.${NC}"
else
  echo -e "${RED}[×] Contenedor '$REDIS_CONTAINER_NAME' NO está en ejecución.${NC}"
fi
echo ""

# 3. Verificar Servicios Internos (basados en puertos y URLs)
echo -e "${YELLOW}--- Estado de los Servicios (Puertos/URLs) ---${NC}"
all_services_ok=true
for service_name in "${!services_to_check[@]}"; do
  endpoint="${services_to_check[$service_name]}"
  
  if [[ "$endpoint" == *":"* && "$endpoint" != "http"* ]]; then # Es un puerto
    port="$endpoint"
    if check_port_listening "$port"; then
      echo -e "${GREEN}[✓] $service_name (Puerto $port) está disponible.${NC}"
    else
      echo -e "${RED}[×] $service_name (Puerto $port) NO está disponible.${NC}"
      all_services_ok=false
    fi
  elif [[ "$endpoint" == "http"* ]]; then # Es una URL
    if check_http_alive "$endpoint"; then
      echo -e "${GREEN}[✓] $service_name ($endpoint) responde correctamente.${NC}"
    else
      echo -e "${RED}[×] $service_name ($endpoint) NO responde.${NC}"
      all_services_ok=false
    fi
  else
    echo -e "${RED}[!] Configuración de endpoint inválida para '$service_name': $endpoint${NC}"
    all_services_ok=false
  fi
done
echo ""

# 4. Mostrar Logs si el contenedor de la app está corriendo
if is_container_running "$APP_CONTAINER_NAME"; then
  echo -e "${YELLOW}--- Últimos logs del contenedor '$APP_CONTAINER_NAME' (30 líneas) ---${NC}"
  docker logs --tail=30 "$APP_CONTAINER_NAME"
  echo ""
fi

if is_container_running "$REDIS_CONTAINER_NAME" && ! $all_services_ok; then
  echo -e "${YELLOW}--- Últimos logs del contenedor '$REDIS_CONTAINER_NAME' (15 líneas) ---${NC}"
  docker logs --tail=15 "$REDIS_CONTAINER_NAME"
  echo ""
fi


echo -e "${CYAN}============================================================${NC}"
echo -e "Verificación completada - $(date)"
echo -e "${CYAN}============================================================${NC}"

if $all_services_ok && is_container_running "$APP_CONTAINER_NAME" && is_container_running "$REDIS_CONTAINER_NAME"; then
  echo -e "${GREEN}Todos los servicios parecen estar funcionando correctamente.${NC}"
  exit 0
else
  echo -e "${RED}Se detectaron problemas en uno o más servicios.${NC}"
  exit 1
fi