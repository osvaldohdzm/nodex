#!/bin/bash
set -euo pipefail

# --- Colores ---
YELLOW='\033[1;33m'
GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}ℹ️ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

# --- Verificar rama actual ---
log_info "Verificando rama actual..."
current_branch=$(git branch --show-current)

if [[ "$current_branch" != dev-* && "$current_branch" != *-test ]]; then
  log_error "No estás en una rama de pruebas. Estás en: $current_branch"
  exit 1
fi

# --- Confirmar eliminación de cambios sin commitear ---
if [[ -n $(git status --porcelain) ]]; then
  log_warning "Cambios sin commitear detectados:"
  git status --short
  echo
  read -p "¿Descartar cambios locales no guardados? (y/n): " confirm
  if [[ "$confirm" != "y" ]]; then
    log_error "Operación cancelada por el usuario."
    exit 1
  fi
  git reset --hard
  log_success "Cambios descartados."
fi

# --- Mostrar commits antes de eliminar ---
log_info "Commit actual (HEAD):"
git log -1 --oneline

log_info "Ajustando permisos de archivos para evitar errores de acceso..."

# Hacer todos los archivos editables por el usuario actual
sudo chown -R "$USER":"$USER" . && sudo chmod -R u+rw . || {
  log_error "No se pudieron ajustar los permisos."
  exit 1
}

log_success "Permisos ajustados correctamente."

log_info "Revirtiendo al commit anterior con reset --hard HEAD~1..."
git reset --hard HEAD~1 || {
  log_error "No se pudo hacer reset. Puede que no haya commits previos."
  exit 1
}


# --- Reset al commit anterior ---
log_info "Eliminando el último commit con reset --hard HEAD~1..."
git reset --hard HEAD~1
log_success "Commit anterior restaurado."

# --- Push forzado para reescribir remoto ---
log_info "Aplicando push --force para sobrescribir el historial remoto..."
git push origin "$current_branch" --force
log_success "Commit eliminado del repositorio remoto."

log_success "Todo listo. El commit 'Prueba 28 de dev' ya no existe."