#!/bin/bash
set -e

# Obtener la rama actual
current_branch=$(git branch --show-current)

echo "Guardando todos los cambios en la rama '$current_branch'"

# Agregar todos los archivos modificados y nuevos
git add .

# Preguntar mensaje de commit
read -p "Mensaje del commit para guardar cambios (deja vacío para omitir commit): " msg

if [[ -n "$msg" ]]; then
  git commit -m "$msg"
else
  echo "No se hizo commit. Si tienes cambios nuevos, por favor haz commit manualmente."
fi

# Push con configuración upstream si no existe
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)
if [[ -z "$upstream" ]]; then
  echo "🔁 Estableciendo upstream para '$current_branch'..."
  git push --set-upstream origin "$current_branch"
else
  git push
fi

echo "✅ Cambios guardados y enviados a remoto en '$current_branch'."


./scripts/start.sh