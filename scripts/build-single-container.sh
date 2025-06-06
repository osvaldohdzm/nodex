#!/bin/bash
set -e

# Función para liberar puerto ocupado (por contenedor o proceso)
function free_port() {
  local port=$1
  echo "Checking port $port..."

  # Buscar contenedor que use ese puerto y eliminarlo
  container_ids=$(docker ps -q --filter "publish=$port")
  if [ -n "$container_ids" ]; then
    echo "  Stopping and removing Docker containers using port $port..."
    docker rm -f $container_ids
  fi

  # Si algún proceso fuera de Docker está usando el puerto, matarlo
  pid=$(lsof -t -i :"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  Killing process $pid that is using port $port..."
    kill -9 $pid
  fi
}

# Puertos que vamos a liberar antes de correr contenedor
ports=(4545 8000 7474 7687)

for p in "${ports[@]}"; do
  free_port "$p"
done

# Obtener la ruta absoluta del proyecto
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Stopping and removing any existing Docker containers..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans

# Optional cleanup step (uncomment with caution):
# echo "Pruning unused Docker data..."
# docker system prune -a --volumes

echo "Rebuilding and starting services with Docker Compose..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d --build --force-recreate

echo "Building the Nodex application image manually..."
docker build -t nodex-single -f "$ROOT_DIR/docker/Dockerfile" "$ROOT_DIR"

echo "Running the Nodex container..."
docker run -d \
  --name nodex-single \
  -p 4545:4545 \
  -p 8000:8000 \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_USER=neo4j \
  -e NEO4J_PASSWORD=yourStrongPassword \
  -e JWT_SECRET_KEY=your_jwt_secret_key \
  -e ALGORITHM=HS256 \
  -e ACCESS_TOKEN_EXPIRE_MINUTES=30 \
  nodex-single

echo
echo "✅ Nodex is now running in a single container!"
echo "- 🌐 Frontend:        http://localhost:4545"
echo "- 🛠️  Backend API:     http://localhost:8000"
echo "- 🧠 Neo4j Browser:    http://localhost:7474"
echo "  (Username: neo4j | Password: yourStrongPassword)"
