#!/bin/bash
set -e

# Obtener la ruta absoluta del proyecto
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Deteniendo y eliminando servicios Docker Compose y contenedores huérfanos..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans

echo "Eliminando todos los contenedores con 'nodex' en el nombre para evitar conflictos..."
docker ps -a --filter "name=nodex" --format "{{.ID}}" | xargs -r docker rm -f

echo "Construyendo la imagen Nodex manualmente..."
docker build -t nodex-single -f "$ROOT_DIR/docker/Dockerfile" "$ROOT_DIR"

echo "Ejecutando el contenedor nodex-single..."
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

echo "✅ Nodex está corriendo en un solo contenedor!"
echo "- 🌐 Frontend:        http://localhost:4545"
echo "- 🛠️  Backend API:     http://localhost:8000"
echo "- 🧠 Neo4j Browser:    http://localhost:7474"
echo "  (Usuario: neo4j | Contraseña: yourStrongPassword)"

echo
echo "⏱️ Esperando unos segundos para que los servicios estén listos..."
sleep 5

echo "🧪 Ejecutando tests dentro del contenedor..."
docker exec nodex-single bash -c "cd /app && npm test"
# Si usas Python en lugar de Node.js:
# docker exec nodex-single bash -c "cd /app && pytest"

echo
echo "✅ Tests completados."
