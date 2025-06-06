#!/bin/bash
set -euo pipefail

# Nombre del contenedor que quieres crear/usar
CONTAINER_NAME="nodex_all_in_one"

# Nombre de la imagen que construiste
IMAGE_NAME="nodex-all-in-one:latest"

echo "🛑 Deteniendo y borrando cualquier contenedor previo con el mismo nombre..."
if [ "$(docker ps -aq -f name=^/${CONTAINER_NAME}$)" ]; then
  docker rm -f $CONTAINER_NAME
  echo "✔️ Contenedor anterior \"$CONTAINER_NAME\" eliminado."
else
  echo "ℹ️ No había ningún contenedor \"$CONTAINER_NAME\" corriendo."
fi

echo ""
echo "🚀 Ejecutando el contenedor \"$CONTAINER_NAME\" en 0.0.0.0..."
docker run -d \
  --name $CONTAINER_NAME \
  -p 7474:7474 \    # Neo4j HTTP
  -p 7687:7687 \    # Neo4j BOLT
  -p 8000:8000 \    # Backend (Uvicorn/FastAPI por ejemplo)
  -p 4545:4545 \    # Frontend (React Dev Server)
  $IMAGE_NAME

# Podemos verificar el estado
echo ""
echo "🔍 Estado del contenedor recién levantado:"
docker ps --filter "name=$CONTAINER_NAME"

echo ""
echo "📕 Para ver los logs en vivo, corre:"
echo "   docker logs -f $CONTAINER_NAME"
