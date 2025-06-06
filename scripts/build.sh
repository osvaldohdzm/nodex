#!/bin/bash
set -euo pipefail

# Guardar la ruta original para regresar al final
ORIGINAL_DIR="$(pwd)"

echo "🔧 Iniciando construcción de 'frontend'..."

# Verificar que la carpeta 'frontend' exista
if [[ ! -d frontend ]]; then
  echo "❌ Carpeta 'frontend' no encontrada. Abortando."
  exit 1
fi

cd frontend

# Verificar que exista 'package.json'
if [[ ! -f package.json ]]; then
  echo "❌ No se encontró 'package.json' en frontend. ¿Estás en el proyecto correcto?"
  exit 1
fi

echo "📦 Ejecutando 'npm run build'..."
npm run build

# Verificar que la carpeta 'build' se haya creado
if [[ -d build ]]; then
  echo "✅ La carpeta 'build' fue creada exitosamente."
else
  echo "❌ No se encontró la carpeta 'build'. El proceso de construcción pudo haber fallado."
  exit 1
fi

# Volver a la ruta original
cd "$ORIGINAL_DIR"

echo "🔙 Regresado a la carpeta original: $ORIGINAL_DIR"
echo "✅ Construcción de 'frontend' completada correctamente."
