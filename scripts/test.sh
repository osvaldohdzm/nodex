#!/bin/bash
set -euo pipefail

echo "🧪 Ejecutando pruebas..."

# --- EJEMPLOS (AJUSTA A TU PROYECTO) ---

# Para Node.js:
# npm test

# Para Python con Pytest:
# pytest

# Para Python con unittest:
# python -m unittest discover

# Para Java con Maven:
# ./mvnw test

# Para Java con Gradle:
# ./gradlew test
result=$(./scripts/start.sh)
if [[ $? -ne 0 ]]; then
  echo "❌ Pruebas fallidas. Abortando."
  exit 1
fi
echo "✅ Pruebas completadas."
# El script de pruebas debe salir con código de error si alguna prueba falla.
# Esto es crucial para la integración en pipelines CI/CD, ya que un código de error indica que el proceso debe detenerse
# y evitar que cambios defectuosos se desplieguen automáticamente.