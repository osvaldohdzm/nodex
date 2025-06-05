#!/bin/bash
set -euo pipefail

echo "🎨 Aplicando linters y formateadores..."

# --- EJEMPLOS (AJUSTA A TU PROYECTO) ---

# Para JavaScript/TypeScript con Prettier y ESLint:
# echo "Formateando con Prettier..."
# npx prettier --write .
# echo "Linting con ESLint..."
# npx eslint --fix .

# Para Python con Black y Flake8:
# echo "Formateando con Black..."
# python -m black .
# echo "Linting con Flake8..."
# python -m flake8 .

# Si usas Java con Checkstyle y Spotless:
# echo "Aplicando Checkstyle y Spotless..."
# ./mvnw spotless:apply (o gradle spotlessApply)

echo "✅ Proceso de linting y formateo completado."
# Si hay errores que no se pueden auto-corregir y deben detener el commit,
# asegúrate de que el linter salga con un código de error.
# Por ejemplo, algunos linters tienen una opción para solo chequear sin arreglar.