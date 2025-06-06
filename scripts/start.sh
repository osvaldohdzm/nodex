#!/bin/bash
set -euo pipefail

CONTAINER_NAME="nodex_all_in_one"
IMAGE_NAME="nodex-all-in-one:latest"

echo "🔨 Construyendo imagen Docker desde docker/Dockerfile..."
docker build -f docker/Dockerfile -t "$IMAGE_NAME" .

echo ""
echo "🛑 Deteniendo y borrando cualquier contenedor previo llamado \"$CONTAINER_NAME\"..."
if [ "$(docker ps -aq -f name=^/${CONTAINER_NAME}$)" ]; then
  docker rm -f "$CONTAINER_NAME"
  echo "✔️ Contenedor anterior \"$CONTAINER_NAME\" eliminado."
else
  echo "ℹ️ No había ningún contenedor \"$CONTAINER_NAME\" corriendo."
fi

echo ""
echo "🚀 Iniciando contenedor \"$CONTAINER_NAME\" exponiendo puertos en 0.0.0.0..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 7474:7474 \
  -p 7687:7687 \
  -p 8000:8000 \
  -p 4545:4545 \
  "$IMAGE_NAME"

echo ""
echo "🔍 Estado del contenedor recién levantado:"
docker ps --filter "name=$CONTAINER_NAME"

echo ""
echo "📕 Para ver los logs en vivo, usa:"
echo "   docker logs -f $CONTAINER_NAME"
