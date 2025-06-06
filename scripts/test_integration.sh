#!/bin/bash
set -euo pipefail

if [ -f .git/MERGE_HEAD ]; then
  echo "⚠️ Se detectó un merge previo con conflictos. Guardando cambios temporales para abortar merge..."
  git stash push -u -m "🧹 Stash temporal antes de abortar merge fallido" || true
  git merge --abort || true
  git stash pop || true
  echo "✅ Conflicto anterior limpiado correctamente."
fi


REMOTE="origin"

echo "🔐 Solicitando permisos de superusuario para limpiar archivos .pyc..."
sudo bash -c 'chmod -R u+rw backend/app/__pycache__/ 2>/dev/null || true'
sudo bash -c 'find backend/app/ -name "*.pyc" -delete'

echo "📂 Limpiando rastreo de __pycache__ y *.pyc..."
git rm -r --cached backend/app/__pycache__/ 2>/dev/null || true
echo -e "*.pyc\n__pycache__/" >> .gitignore
git add .gitignore
git commit -m "fix: remover __pycache__ y *.pyc del control de versiones" || true


# Detectar ramas de prueba
mapfile -t test_branches < <(
  {
    git branch --list "test/*"
    git branch --list "*-test"
  } | sed 's/^[* ]*//' | sort -u
)

if [ ${#test_branches[@]} -eq 0 ]; then
  echo "ℹ️ No hay ramas de prueba ('test/*' o '*-test')."
  exit 0
fi

selected_test="${test_branches[0]}"
echo "🟢 Usando rama de prueba: $selected_test"

if [[ "$selected_test" == test/* ]]; then
  base_branch="${selected_test#test/}"
elif [[ "$selected_test" == *-test ]]; then
  base_branch="${selected_test%-test}"
else
  echo "❌ Formato de rama no reconocido."
  exit 1
fi

echo "🔍 Rama base detectada: '$base_branch'"

if [[ "$base_branch" == "main" || "$base_branch" == "master" ]]; then
  echo "🚫 No se permite integrar automáticamente en '$base_branch'."
  exit 1
fi

# Fetch y garantizar existencia local
git fetch "$REMOTE"
git branch --track "$base_branch" "$REMOTE/$base_branch" 2>/dev/null || true

# Stash si hay cambios
if [ -n "$(git status --porcelain)" ]; then
  git stash push -u -m "Stash automático antes de integración"
  STASHED_CHANGES=true
else
  STASHED_CHANGES=false
fi

# Cambiar a la rama de prueba
git checkout "$selected_test"

# Hacer merge de la base, pero conservando los cambios actuales (estrategia ours)
echo "🛡️ Fusionando '$base_branch' en '$selected_test' usando estrategia 'ours' (se conservarán los cambios de prueba)..."
git merge "$base_branch" -s ours -m "Integración de '$base_branch' en '$selected_test' (estrategia ours)"

# Cambiar a base y fast-forward desde prueba
git checkout "$base_branch"
git merge --ff-only "$selected_test"

# Aplicar stash si se hizo
if [ "$STASHED_CHANGES" = true ]; then
  echo "♻️ Aplicando stash..."
  git stash pop || echo "⚠️ Conflicto al aplicar stash. Resuélvelo manualmente."
fi

# Borrar rama de prueba local y remota
git branch -d "$selected_test" || git branch -D "$selected_test"
git push "$REMOTE" --delete "$selected_test" 2>/dev/null || true

echo "✅ Integración completada. La rama '$base_branch' conserva los cambios de '$selected_test'."
