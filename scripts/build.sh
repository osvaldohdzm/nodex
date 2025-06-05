#!/bin/bash
set -euo pipefail

echo "🔧 Iniciando construcción de 'frontend'..."

if [[ ! -d frontend ]]; then
  echo "❌ Carpeta 'frontend' no encontrada. Abortando."
  exit 1
fi

cd frontend

if [[ ! -f package.json ]]; then
  echo "❌ No se encontró 'package.json' en frontend. ¿Estás en el proyecto correcto?"
  exit 1
fi

echo "📦 Ejecutando 'npm run build'..."
npm run build

echo "✅ Construcción de 'frontend' completada."
