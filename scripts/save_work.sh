#!/bin/bash
set -euo pipefail

# Función para limpiar archivos temporales sin errores por permisos
clean_pycache() {
  echo "🧹 Limpiando archivos temporales (por ejemplo, __pycache__ y *.pyc)..."
  # Forzamos borrar archivos .pyc y directorios __pycache__, ignorando errores
  find . -type f -name '*.pyc' -exec rm -f {} + 2>/dev/null || true
  find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
}

# Función para eliminar archivos .pyc versionados y hacer commit
remove_versioned_pyc() {
  echo "🔍 Verificando archivos .pyc versionados en git..."
  pyc_files=$(git ls-files 'backend/app/__pycache__/*.pyc' || true)
  if [[ -n "$pyc_files" ]]; then
    echo "⚠️ Se encontraron archivos .pyc versionados, eliminándolos del repo..."
    git rm --cached backend/app/__pycache__/*.pyc
    git commit -m "Remove .pyc files from repo"
    git push
    echo "✅ Archivos .pyc removidos del control de versiones."
  else
    echo "✅ No hay archivos .pyc versionados en el repo."
  fi
}

# Función para asegurar .gitignore adecuado
check_gitignore() {
  echo "🔎 Verificando .gitignore para __pycache__ y *.pyc..."
  if ! grep -q -E '^__pycache__/$' .gitignore 2>/dev/null; then
    echo "__pycache__/" >> .gitignore
    echo "Añadido '__pycache__/' a .gitignore"
  fi
  if ! grep -q -E '^\*\.pyc$' .gitignore 2>/dev/null; then
    echo "*.pyc" >> .gitignore
    echo "Añadido '*.pyc' a .gitignore"
  fi
}

# Verificar rama actual
current_branch=$(git branch --show-current)

if [[ -z "$current_branch" ]]; then
  echo "❌ No estás en ninguna rama. Operación abortada."
  exit 1
fi

echo "💾 Guardando cambios en la rama '$current_branch'..."

# 1. Limpiar archivos temporales antes de add para evitar que entren en el commit
clean_pycache

# 2. Quitar archivos .pyc versionados
remove_versioned_pyc

# 3. Verificar y actualizar .gitignore
check_gitignore

# 4. Agregar cambios y hacer commit si hay cambios
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios para hacer commit."
else
  git add .
  read -rp "Mensaje del commit (deja vacío para mensaje por defecto 'WIP: Save changes'): " commit_message
  if [[ -z "$commit_message" ]]; then
    commit_message="WIP: Save changes on $current_branch"
  fi
  git commit -m "$commit_message"
fi

# Push con upstream configurado o asignarlo si no existe
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)
if [[ -z "$upstream" ]]; then
  echo "🔁 Estableciendo upstream para '$current_branch' y haciendo push..."
  if ! git push --set-upstream origin "$current_branch"; then
    echo "❌ Error en git push. Verifica tus credenciales o conexión."
    exit 1
  fi
else
  echo "⏫ Haciendo push a '$upstream'..."
  if ! git push; then
    echo "❌ Error en git push. Verifica tus credenciales o conexión."
    exit 1
  fi
fi

echo "🌐 Sincronizando ramas locales con sus remotas..."

# Guardar la rama actual para regresar después
original_branch=$current_branch

# Para cada rama con upstream y que no sea la actual, hacer pull fast-forward y limpiar pycache
while read -r branch; do
  branch_name=$(echo "$branch" | awk '{print $1}')
  remote_name=$(git for-each-ref --format='%(upstream:short)' refs/heads/"$branch_name")

  if [[ -z "$remote_name" || "$branch_name" == "$original_branch" ]]; then
    continue
  fi

  echo "🔄 Cambiando a '$branch_name' para sincronizar con '$remote_name'..."
  # Limpiar antes de cambiar
  clean_pycache
  git switch "$branch_name" >/dev/null
  git pull --ff-only

done < <(git branch --format='%(refname:short)')

# Regresar a la rama original y limpiar pycache
git switch "$original_branch" >/dev/null
clean_pycache

echo "✅ Todas las ramas locales con upstream han sido sincronizadas con sus ramas remotas."
