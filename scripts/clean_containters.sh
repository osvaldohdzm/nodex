#!/bin/bash
set -e

echo "🧹 Stopping and removing Nodex-related containers..."

# Parar y eliminar todos los contenedores basados en imágenes nodex
docker ps -a --filter "ancestor=nodex-single" \
             --filter "ancestor=nodex-frontend" \
             --filter "ancestor=nodex-backend" \
  -q | xargs -r docker rm -f

# También eliminar contenedores por nombre si se crearon con nombres personalizados
docker ps -a --format '{{.ID}} {{.Names}}' | grep -E 'nodex' | awk '{print $1}' | xargs -r docker rm -f

echo "🗑️ Removing Nodex-related images..."

# Eliminar las imágenes con nombre nodex-*
docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" \
  | grep -E 'nodex-(frontend|backend|single)' \
  | awk '{print $2}' | xargs -r docker rmi -f

echo "✅ Done. All Nodex containers and images have been removed."
