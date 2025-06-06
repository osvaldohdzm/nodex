#!/bin/bash
set -euo pipefail

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

container="nodex_all_in_one"

declare -A internal_services=(
  ["API / Backend"]="http://localhost:4545"
  ["Admin / UI"]="http://localhost:8000"
  ["Frontend"]="http://localhost:3000"
  ["RedisGraph"]="6379"  # Port for Redis check
)

function check_http_alive() {
  local url="$1"
  if curl -fs --max-time 2 "$url" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

function check_port_listening() {
  local port="$1"
  if nc -z localhost "$port" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

clear
echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}==    Estado de Servicios Internos - $container     ==${NC}"
echo -e "${CYAN}=======================================================${NC}"

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
  echo -e "${GREEN}[✓] Contenedor '$container' está activo${NC}"
  echo ""
  
  # Check services status
  for service in "${!internal_services[@]}"; do
    if [[ "$service" == "RedisGraph" ]]; then
      port="${internal_services[$service]}"
      if check_port_listening "$port"; then
        echo -e "${GREEN}[✓] $service (puerto $port) está activo${NC}"
      else
        echo -e "${RED}[×] $service (puerto $port) NO está disponible${NC}"
      fi
    else
      url="${internal_services[$service]}"
      if check_http_alive "$url"; then
        echo -e "${GREEN}[✓] $service ($url) responde correctamente${NC}"
      else
        echo -e "${RED}[×] $service ($url) NO responde${NC}"
      fi
    fi
  done

  # Show recent logs
  echo -e "\n${CYAN}--- Últimos logs del contenedor (30 líneas) ---${NC}"
  docker logs --tail=30 "$container"

else
  echo -e "${RED}[×] El contenedor '$container' NO está en ejecución${NC}"
fi

echo -e "\n${CYAN}=======================================================${NC}"
echo -e "Verificación completada - $(date)"
echo -e "${CYAN}=======================================================${NC}"