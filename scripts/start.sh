#!/bin/bash
set -e

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

# Eliminar contenedor previo si existe para evitar conflictos
echo "Removing existing nodex-single container if it exists..."
docker rm -f nodex-single 2>/dev/null || true

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

echo "✅ Nodex is now running in a single container!"
echo "- 🌐 Frontend:        http://localhost:4545"
echo "- 🛠️  Backend API:     http://localhost:8000"
echo "- 🧠 Neo4j Browser:    http://localhost:7474"
echo "  (Username: neo4j | Password: yourStrongPassword)"

echo
echo "⏱️ Waiting a few seconds for services to be ready..."
sleep 5

echo "🧪 Running tests inside the container..."
docker exec nodex-single bash -c "cd /app && npm test"
# o si usas Python: docker exec nodex-single bash -c "cd /app && pytest"

echo
echo "✅ Tests completed."
