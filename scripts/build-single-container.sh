#!/bin/bash
set -e

# Función para liberar un puerto (contenedor Docker o proceso externo)
function free_port() {
  local port=$1
  echo "🔍 Liberando puerto $port..."

  # Buscar contenedores Docker que expongan ese puerto
  container_ids=$(docker ps --filter "publish=$port" -q)
  if [ -n "$container_ids" ]; then
    echo "🐳 Encontrados contenedores usando el puerto $port..."
    for cid in $container_ids; do
      cname=$(docker inspect --format '{{.Name}}' "$cid" | sed 's|/||')
      echo "  - Deteniendo contenedor $cname (ID: $cid)..."
      
      # Obtener el PID del proceso principal del contenedor
      container_pid=$(docker inspect -f '{{.State.Pid}}' "$cid" 2>/dev/null || true)

      docker rm -f "$cid" >/dev/null 2>&1 || true

      # Matar proceso huérfano si sigue vivo
      if [[ -n "$container_pid" && "$container_pid" -ne 0 ]]; then
        if kill -0 "$container_pid" 2>/dev/null; then
          echo "    ⚠️ Matando proceso huérfano del contenedor (PID $container_pid)"
          kill -9 "$container_pid" 2>/dev/null || true
        fi
      fi
    done
  fi

  # Buscar procesos externos que usan el puerto
  pids=$(lsof -t -i :"$port" 2>/dev/null | sort -u || true)
  for pid in $pids; do
    # Verifica que no se haya eliminado previamente
    if kill -0 "$pid" 2>/dev/null; then
      pname=$(ps -p "$pid" -o comm=)
      echo "💀 Matando proceso externo $pname (PID $pid) que usa el puerto $port"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

# Lista de puertos a liberar
ports=(4545 8000 7474 7687)

for p in "${ports[@]}"; do
  free_port "$p"
done

# Ruta raíz del proyecto
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧹 Deteniendo y limpiando contenedores huérfanos del proyecto..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans

echo "🔨 Reconstruyendo servicios con Docker Compose..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d --build --force-recreate

echo "🛠️  Construyendo imagen manual Nodex..."
docker build -t nodex-single -f "$ROOT_DIR/docker/Dockerfile" "$ROOT_DIR"

echo "🚀 Ejecutando contenedor Nodex..."
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
echo "✅ ¡Nodex está corriendo en un contenedor único!"
echo "- 🌐 Frontend:        http://localhost:4545"
echo "- 🛠️  Backend API:     http://localhost:8000"
echo "- 🧠 Neo4j Browser:    http://localhost:7474"
echo "  (Usuario: neo4j | Contraseña: yourStrongPassword)"
