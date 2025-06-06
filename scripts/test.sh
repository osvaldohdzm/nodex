#!/bin/bash
set -euo pipefail

# --- Inicio del Script de Pruebas Integrado (Git + Docker Compose) ---

echo "🚀 Iniciando script de pruebas..."

# --- SECCIÓN DE LIMPIEZA PREVIA (MUY IMPORTANTE) ---
# Puertos que nuestra aplicación necesita. Añade más si es necesario.
PORTS_TO_CHECK=("6379" "8000" "4545")

echo "🔎 Verificando y liberando puertos necesarios..."
for port in "${PORTS_TO_CHECK[@]}"; do
  # Busca el ID del contenedor que está usando el puerto
  container_id=$(docker ps -q --filter "publish=${port}")
  
  if [ -n "$container_id" ]; then
    container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^\///')
    echo "⚠️ El puerto $port está ocupado por el contenedor '$container_name' (ID: $container_id)."
    echo "🔪 Forzando la detención y eliminación de '$container_name' para liberar el puerto..."
    docker rm -f "$container_id"
    echo "✅ Puerto $port liberado."
  else
    echo "👍 El puerto $port está libre."
  fi
done
echo ""

# --- SECCIÓN DE GESTIÓN DE GIT ---
# 1. Verificar si hay cambios sin commitear
if git diff-index --quiet HEAD --; then
  echo "✅ No hay cambios pendientes en el directorio de trabajo."
  no_changes=true
else
  echo "🔍 Detectados cambios pendientes en el directorio de trabajo."
  no_changes=false
fi

# 2. Obtener la rama actual
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ -z "$current_branch" ]]; then
  echo "❌ No se pudo detectar la rama actual. Asegúrate de estar en un repositorio Git." >&2
  exit 1
fi
echo "➡️ Rama actual: $current_branch"

# 3. Determinar la rama de pruebas destino y gestionar el commit
if [[ "$no_changes" != true ]]; then
  target_test_branch=""
  if [[ "$current_branch" == */test ]] || [[ "$current_branch" == *-test ]]; then
    echo "ℹ️ Ya estás en una rama de pruebas ('$current_branch'). Los nuevos cambios se commitearán aquí."
    target_test_branch="$current_branch"
  else
    target_test_branch="${current_branch}-test"
    echo "🆕 Rama de pruebas destino: $target_test_branch"

    if ! git rev-parse --verify "$target_test_branch" >/dev/null 2>&1; then
      echo "🌱 Creando nueva rama de pruebas '$target_test_branch'..."
      if ! git checkout -b "$target_test_branch"; then
        echo "❌ No se pudo crear la rama '$target_test_branch'." >&2
        exit 1
      fi
    else
      echo "⚠️ La rama de pruebas '$target_test_branch' ya existe. Los cambios se commitearán en tu rama actual ('$current_branch')."
      target_test_branch="$current_branch"
    fi
  fi

  echo "➕ Preparando (staging) todos los cambios..."
  git add .

  base_branch_for_count="${current_branch%-test}"
  base_branch_for_count="${base_branch_for_count%/test}"
  case "$base_branch_for_count" in
    feature/*) short_name="${base_branch_for_count#feature/}" ;;
    hotfix/*)  short_name="${base_branch_for_count#hotfix/}"  ;;
    bugfix/*)  short_name="${base_branch_for_count#bugfix/}"  ;;
    dev)       short_name="dev" ;;
    *)         short_name="$base_branch_for_count" ;;
  esac
  
  if [[ -z "$short_name" ]]; then short_name="unknown"; fi
  echo "📝 Feature/Tarea base: '$short_name'"

  last_test_number=$(git log --pretty=format:"%s" | grep -oP "^Prueba \K[0-9]+(?= de $short_name)" | sort -rn | head -n 1 || echo 0)
  next_test_number=$((last_test_number + 1))

  default_commit_msg="Prueba $next_test_number de $short_name"
  read -rp "Mensaje para el commit (deja vacío para '$default_commit_msg'): " user_commit_msg
  commit_msg="${user_commit_msg:-$default_commit_msg}"

  if git commit -m "$commit_msg"; then
    echo "✅ Cambios commiteados con el mensaje: '$commit_msg'"
  else
    echo "❌ Falló el commit. Puede que no haya cambios staged." >&2
    exit 1
  fi
else
  echo "ℹ️ No hay cambios para commitear, se procederá a levantar el entorno."
fi

# --- SECCIÓN DE EJECUCIÓN CON DOCKER COMPOSE ---
echo ""
echo "🐳 Lanzando entorno de desarrollo RÁPIDO..."

# 4. Asegurarse de que cualquier instancia previa del proyecto Compose esté detenida
echo "🧹 Limpiando entorno de Docker Compose previo..."
docker compose down --remove-orphans

# 5. Levantar todos los servicios definidos en docker-compose.yml
echo "🏗️  Construyendo y levantando servicios (backend, frontend, redis)..."
docker compose up --build -d

echo ""
echo "✅ ¡Entorno de desarrollo listo y corriendo!"
echo "-----------------------------------------------------"
echo "--- URLs ---"
echo "🌐 Frontend (con recarga en caliente): http://localhost:4545"
echo "⚙️  Backend API (con recarga automática): http://localhost:8000/docs"
echo "💾 RedisGraph: localhost:6379"
echo ""
echo "--- Comandos Útiles ---"
echo "   Para ver los logs de todos los servicios:"
echo "   👉 docker compose logs -f"
echo ""
echo "   Para detener el entorno cuando termines:"
echo "   👉 docker compose down"
echo "-----------------------------------------------------"