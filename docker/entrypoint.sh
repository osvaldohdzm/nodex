#!/bin/bash
set -e

# Function to handle graceful shutdown
cleanup() {
    echo "Shutting down services..."
    nginx -s stop
    pkill -f "uvicorn"
    pkill -f "neo4j"
    exit 0
}

# Trap SIGTERM and SIGINT
trap cleanup SIGTERM SIGINT

# Start Neo4j in the background
echo "Starting Neo4j..."
neo4j start &

# Wait for Neo4j to be ready
echo "Waiting for Neo4j to be ready..."
until curl -s -I http://localhost:7474/ > /dev/null; do
    sleep 1
done

# Initialize Neo4j
echo "Initializing Neo4j..."
cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
    "CALL dbms.security.changePassword('$NEO4J_PASSWORD');" || true

# Start FastAPI backend
echo "Starting FastAPI backend..."
cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &


# Start Nginx in the foreground
echo "Starting Nginx..."
nginx -g 'daemon off;' &

# Wait for Nginx to be ready
until curl -s http://localhost:4545 > /dev/null; do
    sleep 1
done

echo "All services are up and running!"
echo "- Frontend: http://localhost:4545"
echo "- Backend API: http://localhost:8000"
echo "- Neo4j Browser: http://localhost:7474"

# Keep the container running
wait
