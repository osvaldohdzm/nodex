#!/bin/bash
set -euo pipefail # -e: exit on error, -u: treat unset variables as error, -o pipefail: exit status of last command in pipe

# --- Configuración ---
APP_CONTAINER_NAME="nodex_all_in_one"
APP_IMAGE_NAME="nodex-all-in-one:latest"
REDIS_CONTAINER_NAME="my-redisgraph"
REDIS_IMAGE_NAME="redislabs/redisgraph:latest"
NETWORK_NAME="sivg-net"

# --- Funciones de Ayuda ---
cleanup_container() {
  local container_name="$1"
  echo "🧹 Limpiando contenedor previo '$container_name'..."
  if [ "$(docker ps -aq -f name=^/${container_name}$)" ]; then
    docker rm -f "$container_name"
    echo "✔️ Contenedor '$container_name' eliminado."
  else
    echo "ℹ️ No existía el contenedor '$container_name'."
  fi
}

# --- Lógica Principal ---

echo "--- Iniciando Proceso de Despliegue de Nodex ---"

# 1. Limpiar contenedores existentes
cleanup_container "$APP_CONTAINER_NAME"
cleanup_container "$REDIS_CONTAINER_NAME"

# 2. Manejar la Red Docker
echo "🌐 Gestionando la red Docker '$NETWORK_NAME'..."
if docker network ls --format '{{ .Name }}' | grep -qx "$NETWORK_NAME"; then
  echo "🔄 La red '$NETWORK_NAME' ya existe. No se requiere acción."
else
  docker network create "$NETWORK_NAME"
  echo "✔️ Red '$NETWORK_NAME' creada."
fi

# 3. Iniciar RedisGraph
echo "🚀 Iniciando contenedor RedisGraph '$REDIS_CONTAINER_NAME'..."
docker run -d \
  --name "$REDIS_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  -p 6379:6379 \
  -p 8001:8001 \
  -v redis_data:/data \
  "$REDIS_IMAGE_NAME" \
  # Opciones de persistencia para Redis (opcional, pero bueno para desarrollo)
  # Si RedisGraph no las soporta directamente en el comando run, se configuran en un redis.conf
  # --save 900 1 --save 300 10 --save 60 10000 \
  # --appendonly no
echo "✔️ Contenedor RedisGraph '$REDIS_CONTAINER_NAME' iniciado."

# 4. Construir la imagen de la aplicación Nodex
echo "🔨 Construyendo imagen Docker '$APP_IMAGE_NAME' desde docker/Dockerfile..."
docker build -f docker/Dockerfile -t "$APP_IMAGE_NAME" .
echo "✔️ Imagen '$APP_IMAGE_NAME' construida."

# 5. Iniciar la aplicación Nodex
echo "🚀 Iniciando contenedor de la aplicación '$APP_CONTAINER_NAME'..."
docker run -d \
  --name "$APP_CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  -p 8000:8000 \
  -p 4545:4545 \
  # Los puertos 7474 y 7687 son para Neo4j, no RedisGraph. Los comento.
  # -p 7474:7474 \
  # -p 7687:7687 \
  "$APP_IMAGE_NAME"
echo "✔️ Contenedor de la aplicación '$APP_CONTAINER_NAME' iniciado."

echo ""
echo "--- Estado Final ---"
echo "🔍 Contenedores activos en la red '$NETWORK_NAME':"
docker ps --filter "network=$NETWORK_NAME" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📕 Para ver los logs de la aplicación:"
echo "   docker logs -f $APP_CONTAINER_NAME"
echo "📕 Para ver los logs de RedisGraph:"
echo "   docker logs -f $REDIS_CONTAINER_NAME"
echo ""
echo "🌐 Frontend Nodex debería estar disponible en: http://localhost:4545"
echo "⚙️ Backend Nodex API (Swagger UI) debería estar disponible en: http://localhost:8000/docs"
echo "💾 RedisGraph está escuchando en el puerto: 6379"
echo "--- Proceso de Despliegue Completado ---"