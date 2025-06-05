#!/bin/bash

# ==============================================================================
# app_status_mejorado.sh
#
# Muestra el estado reciente de los servicios de la aplicación (frontend/backend)
# mostrando las últimas 25 líneas de sus respectivos logs de Docker.
#
# Uso:
# 1. Guarda este archivo como 'app_status_mejorado.sh'.
# 2. Dale permisos de ejecución: chmod +x app_status_mejorado.sh
# 3. Ejecútalo: ./app_status_mejorado.sh
# ==============================================================================

# --- Colores para una mejor legibilidad ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m' # Sin Color

# Limpia la pantalla para una vista fresca
clear

# --- Muestra los logs del Frontend ---
# Usamos "echo -e" para que interprete los códigos de color.
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}==  Estado Reciente del Frontend           ==${NC}"
echo -e "${CYAN}=============================================${NC}"
# La opción --tail="25" muestra las últimas 25 líneas en lugar de seguir (-f) los logs.
docker-compose logs --tail="25" frontend

# Añade un espacio para separar las secciones
echo ""
echo ""

# --- Muestra los logs del Backend ---
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}==  Estado Reciente del Backend            ==${NC}"
echo -e "${GREEN}=============================================${NC}"
docker-compose logs --tail="25" backend

echo ""
echo -e "${CYAN}=============================================${NC}"
echo "Script finalizado. Mostrando las últimas 25 líneas de cada servicio."