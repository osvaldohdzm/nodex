#!/bin/bash
set -euo pipefail

echo "🔁 Revirtiendo al estado anterior de prueba..."

# 1. Verificar la rama actual
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ -z "$current_branch" ]]; then
  echo "❌ No se pudo obtener la rama actual." >&2
  exit 1
fi

# 2. Validar que estamos en una rama de pruebas
if [[ "$current_branch" != *-test && "$current_branch" != */test ]]; then
  echo "🛑 Esta operación solo está permitida en ramas de prueba (*-test o */test)."
  echo "➡️ Rama actual: $current_branch"
  exit 1
fi

echo "➡️ Rama de prueba detectada: $current_branch"

# 3. Confirmar si hay al menos un commit previo
if ! git rev-parse HEAD~1 >/dev/null 2>&1; then
  echo "⚠️ No hay commit anterior al actual. No se puede revertir más."
  exit 1
fi

# 4. Mostrar commit actual y anterior
echo "📌 Commit actual:"
git --no-pager log -1 --oneline

echo "🔙 Revirtiendo al commit anterior..."
git reset --hard HEAD~1

echo "✅ Estado revertido al commit anterior."
git --no-pager log -1 --oneline
