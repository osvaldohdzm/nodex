#!/bin/bash
set -euo pipefail

current_branch=$(git symbolic-ref --short HEAD)

echo "Guardando cambios antes de cerrar la rama '$current_branch'"

read -rp "Mensaje del commit para guardar cambios (deja vacío para omitir commit): " msg

if [[ -n "$msg" ]]; then
  git add --all
  git commit -m "$msg"
fi

# Detectar si existe upstream configurado
if ! git rev-parse --abbrev-ref --symbolic-full-name "@{u}" &>/dev/null; then
  echo "🔁 Estableciendo upstream para '$current_branch'..."
  git push --set-upstream origin "$current_branch"
else
  git push
fi

# No eliminar rama, solo mensaje final
echo "✅ Cambios guardados y rama '$current_branch' mantenida."

# Si quieres ejecutar otro script, descomenta la línea siguiente
./scripts/start.sh
