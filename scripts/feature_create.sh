#!/bin/bash
set -euo pipefail

DEVELOP_BRANCH="dev" # Rama base para features

# Mostrar ramas feature existentes
echo "=== Ramas feature existentes (remotas) ==="
git fetch --all --prune > /dev/null
git branch -r | grep 'origin/feature/' | sed 's/origin\///' || echo "No hay ramas feature remotas aún."
echo ""

read -p "¿Cómo deseas llamar a la nueva feature? (solo el nombre, sin 'feature/'): " feature_name

if [[ -z "$feature_name" ]]; then
  echo "❌ El nombre de la feature no puede estar vacío."
  exit 1
fi

new_branch="feature/$feature_name"

# Verificar si la rama ya existe local o remotamente
if git rev-parse --verify "refs/heads/$new_branch" > /dev/null 2>&1; then
  echo "❌ La rama '$new_branch' ya existe localmente."
  exit 1
fi
if git rev-parse --verify "refs/remotes/origin/$new_branch" > /dev/null 2>&1; then
  echo "❌ La rama '$new_branch' ya existe remotamente."
  exit 1
fi

# Detectar cambios locales no comprometidos
if ! git diff-index --quiet HEAD --; then
  echo ""
  echo "⚠️ Tienes cambios locales sin guardar en la rama actual ($(git branch --show-current))."
  read -p "¿Deseas hacer commit de estos cambios antes de continuar? (s/n): " commit_changes
  if [[ "$commit_changes" == "s" ]]; then
    read -p "Mensaje del commit: " commit_message
    git add .
    git commit -m "$commit_message"
    git push # Asumimos que queremos pushear los cambios en la rama actual
  elif [[ "$commit_changes" == "n" ]]; then
    read -p "¿Deseas guardar temporalmente con git stash? (s/n): " stash_changes
    if [[ "$stash_changes" == "s" ]]; then
        git stash push -m "WIP: Stash antes de crear $new_branch"
        echo "✅ Cambios guardados con git stash."
    else
        echo "🚫 Operación cancelada. Por favor, guarda tus cambios antes de crear una nueva rama."
        exit 1
    fi
  else
    echo "🚫 Opción inválida. Operación cancelada."
    exit 1
  fi
fi

echo "🔄 Actualizando la rama '$DEVELOP_BRANCH'..."
current_branch_before_switch=$(git branch --show-current)
git checkout "$DEVELOP_BRANCH"
git pull origin "$DEVELOP_BRANCH"

echo "🌱 Creando y cambiando a la nueva rama '$new_branch' desde '$DEVELOP_BRANCH'..."
git checkout -b "$new_branch"

echo "✅ Se ha creado y cambiado a la nueva rama: $new_branch"
echo "👉 Puedes empezar a trabajar. Recuerda hacer push para publicarla: git push -u origin $new_branch"