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

# Endpoints a verificar
declare -A SERVICES_TO_CHECK=(
  ["Frontend (React App)"]="http://localhost:4545"
  ["Backend API (FastAPI)"]="http://localhost:8000/docs"
  ["RedisGraph (Puerto TCP)"]="6379"
)

# --- Funciones de Ayuda ---
check_http_alive() {
  # -L: sigue redirecciones, -f: falla en error HTTP, -s: silencioso, -I: solo headers, --max-time: timeout
  if curl -LfsI --max-time 5 "$1" -o /dev/null; then
    return 0 # Éxito
  else
    return 1 # Falla
  fi
}

check_port_listening() {
  # -z: modo scan, -w: timeout
  if nc -z -w 3 "localhost" "$1" > /dev/null 2>&1; then
    return 0 # Éxito
  else
    return 1 # Falla
  fi
}

is_container_running() {
  if docker ps --format '{{.Names}}' | grep -q "^${1}$"; then
    return 0 # Corriendo
  else
    return 1 # No corriendo
  fi
}

# --- Lógica Principal ---
clear
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}==         Estado de Servicios Nodex (Entorno DEV)        ==${NC}"
echo -e "${CYAN}============================================================${NC}"
all_services_ok=true
any_container_down=false

# 1. Verificar el estado de los Contenedores
echo -e "\n${YELLOW}--- Estado de los Contenedores Docker ---${NC}"
for service in "${!DEV_CONTAINERS[@]}"; do
  container_name="${DEV_CONTAINERS[$service]}"
  if is_container_running "$container_name"; then
    echo -e "${GREEN}[✓] $service: Contenedor '$container_name' está activo.${NC}"
  else
    echo -e "${RED}[×] $service: Contenedor '$container_name' NO está en ejecución.${NC}"
    all_services_ok=false
    any_container_down=true
  fi
done

# Si no hay contenedores, no tiene sentido seguir verificando endpoints
if $any_container_down; then
  echo -e "\n${RED}Uno o más contenedores esenciales no están corriendo. No se pueden verificar los endpoints.${NC}"
  echo -e "\n${CYAN}============================================================${NC}"
  echo -e "${RED}❌ Verificación fallida. Revisa los logs con 'docker compose logs -f'${NC}"
  echo -e "${CYAN}============================================================${NC}"
  exit 1
fi

# 2. Verificar los Endpoints de los servicios
echo -e "\n${YELLOW}--- Estado de los Endpoints y Puertos ---${NC}"
for service_name in "${!SERVICES_TO_CHECK[@]}"; do
  endpoint="${SERVICES_TO_CHECK[$service_name]}"
  
  printf "Verificando %-25s ... " "$service_name"

  if [[ "$endpoint" == http* ]]; then # Es una URL HTTP
    if check_http_alive "$endpoint"; then
      echo -e "${GREEN}OK${NC} (Responde en $endpoint)"
    else
      echo -e "${RED}FALLÓ${NC} (No responde en $endpoint)"
      all_services_ok=false
    fi
  else # Es un puerto TCP
    if check_port_listening "$endpoint"; then
      echo -e "${GREEN}OK${NC} (Escuchando en el puerto $endpoint)"
    else
      echo -e "${RED}FALLÓ${NC} (No escucha en el puerto $endpoint)"
      all_services_ok=false
    fi
  fi
done

# 3. Mostrar logs si algo falló
if ! $all_services_ok; then
    echo -e "\n${YELLOW}--- Mostrando últimos logs debido a fallos detectados ---${NC}"
    docker compose logs --tail=20
fi

# 4. Resumen Final
echo -e "\n${CYAN}============================================================${NC}"
echo -e "Verificación completada - $(date)"
echo -e "${CYAN}============================================================${NC}"

if $all_services_ok; then
  echo -e "${GREEN}✅ ¡Éxito! Todos los servicios del entorno de desarrollo parecen estar funcionando correctamente.${NC}"
  exit 0
else
  echo -e "${RED}❌ ¡Problema detectado! Revisa los detalles de arriba y los logs para diagnosticar.${NC}"
  echo -e "   Ejecuta ${CYAN}'docker compose logs -f'${NC} para ver los logs en tiempo real."
  exit 1
fi