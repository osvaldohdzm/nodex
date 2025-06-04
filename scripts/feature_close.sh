#!/bin/bash
set -e

current_branch=$(git branch --show-current)

read -p "¿Seguro que deseas eliminar la rama '$current_branch'? (s/n): " confirm
if [[ "$confirm" != "s" ]]; then
  echo "Cancelado."
  exit 0
fi

git checkout dev
git pull origin dev
git branch -d "$current_branch"
git push origin --delete "$current_branch"

