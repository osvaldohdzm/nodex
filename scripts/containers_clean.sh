#!/bin/bash
# Parar y eliminar contenedores que usan imágenes con "frontend" o "backend"
docker ps -a --filter "ancestor=nodex-frontend" --filter "ancestor=nodex-backend" -q | xargs -r docker rm -f

# Eliminar las imágenes forzadamente
docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep -E 'frontend|backend' | awk '{print $2}' | xargs -r docker rmi -f
