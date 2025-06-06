#!/bin/bash
set -euo pipefail

# Colores
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Servicios internos del contenedor nodex_all_in_one
declare -A internal_services=(
  ["API / Backend"]="http://localhost:4545"
  ["Neo4j Browser"]="http://localhost:7474"
  ["Neo4j Bolt"]="http://localhost:7687" # No es HTTP pero incluimos su puerto
  ["Admin / UI Extra"]="http://localhost:8000"
  ["Frontend"]="http://localhost:3000"
)

container="nodex_all_in_one"

function check_http_alive() {
  local url="$1"
  curl -fs --max-time 2 "$url" > /dev/null 2>&1
}

clear

echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}==    Estado de Servicios Internos - $container     ==${NC}"
echo -e "${CYAN}=======================================================${NC}"

# Verifica si el contenedor está corriendo
if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
  echo -e "${GREEN}[OK] Contenedor '$container' está activo.${NC}"
  echo ""

  # Verifica estado de servicios internos
  for name in "${!internal_services[@]}"; do
    url="${internal_services[$name]}"
    if check_http_alive "$url"; then
      echo -e "${GREEN}- $name:${NC} ${url} ✅ (responde)"
    else
      echo -e "${RED}- $name:${NC} ${url} ❌ (NO responde)"
    fi
  done

  echo -e "\n${CYAN}--- Últimos logs del contenedor '${container}':${NC}"
  docker logs --tail=15 "$container"
else
  echo -e "${RED}[ERROR] El contenedor '$container' no está en ejecución.${NC}"
fi

echo -e "\n${CYAN}=======================================================${NC}"
echo -e "Análisis finalizado. Verificación de puertos completada."
