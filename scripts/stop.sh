#!/bin/bash

# --- Colores para la Salida ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # Sin color

set -euo pipefail

# --- Funciones de log ---
log_info() {
  echo -e "${CYAN}[INFO] $*${NC}"
}

log_success() {
  echo -e "${GREEN}[SUCCESS] $*${NC}"
}

log_error() {
  echo -e "${RED}[ERROR] $*${NC}"
}

# --- MAIN ---
echo -e "${YELLOW}🛑 Deteniendo entorno Nodex...${NC}"

log_info "🐳 Deteniendo servicios Docker Compose..."
if docker compose down --remove-orphans -t 1; then
  log_success "Servicios detenidos correctamente."
else
  log_error "Error al detener los servicios."
  exit 1
fi

log_info "🧹 Eliminando volúmenes y redes temporales..."
docker volume prune -f >/dev/null || log_warning "No se pudieron eliminar volúmenes."
docker network prune -f >/dev/null || log_warning "No se pudieron eliminar redes."

log_success "✅ Entorno Nodex completamente detenido y limpio."
