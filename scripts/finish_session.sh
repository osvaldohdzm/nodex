#!/bin/bash
set -euo pipefail

# Nombres de contenedores usados en el entorno
CONTAINERS=("nodex_all_in_one" "my-redisgraph" "sivg-instance")
NETWORK="sivg-net"
VOLUMES=("redis_data")  # Agrega aquí más volúmenes si los usas

echo "🧹 Deteniendo contenedores..."

for container in "${CONTAINERS[@]}"; do
  if docker ps -q -f name=^/${container}$ >/dev/null; then
    echo "⛔ Deteniendo contenedor: $container"
    docker stop "$container"
  fi

  if docker ps -aq -f name=^/${container}$ >/dev/null; then
    echo "🗑️ Eliminando contenedor: $container"
    docker rm "$container"
  fi
done

echo ""
echo "🔌 Eliminando red Docker si existe: $NETWORK"
if docker network ls | grep -q "$NETWORK"; then
  docker network rm "$NETWORK" || echo "⚠️ No se pudo eliminar red $NETWORK"
else
  echo "ℹ️ Red $NETWORK no existe."
fi

echo ""
echo "🧼 Limpiando volúmenes si existen..."
for vol in "${VOLUMES[@]}"; do
  if docker volume ls -q | grep -q "^${vol}$"; then
    echo "🗑️ Eliminando volumen: $vol"
    docker volume rm "$vol" || echo "⚠️ No se pudo eliminar volumen $vol"
  else
    echo "ℹ️ Volumen $vol no existe."
  fi
done

echo ""
echo "✅ Entorno limpio. Listo para el siguiente programador."
