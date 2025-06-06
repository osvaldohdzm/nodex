#!/bin/bash

set -e

# Colores
YELLOW='\033[1;33m'
GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}ℹ️ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

log_info "⏳ Preparando limpieza forzada del repositorio..."

# Mostrar estado antes
log_info "Cambios actuales:"
git status --short

echo
log_warning "⚠️ Esta acción eliminará TODOS los cambios no guardados y archivos no versionados."

# Cambiar permisos a todos los archivos del repo para evitar errores
log_info "🔧 Ajustando permisos..."
find . -type f -exec chmod u+w {} \; 2>/dev/null || sudo find . -type f -exec chmod u+w {} \;

# Forzar reset del HEAD
log_info "🔄 Ejecutando reset --hard HEAD..."
if ! git reset --hard HEAD 2>/dev/null; then
  log_warning "❗ Reset falló, intentando con sudo..."
  sudo git reset --hard HEAD
fi

# Forzar limpieza de archivos no versionados
log_info "🧹 Ejecutando git clean -fdx..."
if ! git clean -fdx 2>/dev/null; then
  log_warning "❗ Limpieza falló, intentando con sudo..."
  sudo git clean -fdx
fi

log_success "🎉 Limpieza completa. Todo restaurado al estado exacto del último commit."
