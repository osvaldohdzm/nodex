#!/bin/bash
# --- Colores para la Salida ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # Sin color

set -euo pipefail

# Definición de funciones para logs
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
echo -e "${CYAN}🚀 Iniciando script de pruebas integrado Nodex...${NC}"
start_time=$(date +%s)

# --- Docker Compose ---
log_info "🐳 Iniciando entorno Docker Compose..."

log_info "🧹 Deteniendo servicios previos (si existen)..."

docker compose down --remove-orphans -t 1 || true
log_success "Entorno limpiado."

log_info "🏗️  Levantando entorno (build y up)..."
if docker compose up --build -d; then
  log_success "Todos los servicios Docker Compose están corriendo."
else
  log_error "Error durante 'docker compose up'."
  docker compose logs --tail=50
  exit 1
fi
