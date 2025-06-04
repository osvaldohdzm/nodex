#!/bin/bash

# Ensure script stops on first error
set -e

# Mostrar ramas feature
echo "=== Ramas existentes de feature/ ==="
git fetch --all
git branch -r | grep 'origin/feature/' || echo "No hay ramas feature aún."

echo ""
read -p "¿Cómo deseas llamar a la nueva feature? (solo el nombre, sin 'feature/'): " feature_name

if [[ -z "$feature_name" ]]; then
  echo "❌ El nombre de la feature no puede estar vacío."
  exit 1
fi

# Detectar cambios locales no comprometidos
if ! git diff-index --quiet HEAD --; then
  echo ""
  echo "⚠️  Tienes cambios locales sin guardar."
  echo "Opciones:"
  echo "  1. Hacer commit de los cambios."
  echo "  2. Guardar temporalmente con git stash."
  echo "  3. Cancelar."

  read -p "¿Qué deseas hacer? (1/2/3): " opcion

  case $opcion in
    1)
      git add .
      git commit -m "WIP: cambios previos a nueva feature $feature_name"
      ;;
    2)
      git stash
      echo "✅ Cambios guardados con git stash."
      ;;
    3)
      echo "🚫 Operación cancelada por el usuario."
      exit 1
      ;;
    *)
      echo "❌ Opción inválida."
      exit 1
      ;;
  esac
fi

# Continuar con la creación de la nueva rama
new_branch="feature/$feature_name"

git checkout dev
git pull origin dev
git checkout -b "$new_branch"

echo "✅ Se ha creado y cambiado a la nueva rama: $new_branch"
