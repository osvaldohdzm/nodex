#!/bin/bash
set -e

# Listar ramas locales
echo "=== Ramas locales disponibles ==="
git branch

# Pedir rama a eliminar
read -p "¿Qué rama deseas eliminar? (escribe el nombre EXACTO): " branch_to_delete

# Verificar que la rama exista
if ! git show-ref --verify --quiet refs/heads/"$branch_to_delete"; then
  echo "❌ La rama '$branch_to_delete' NO existe localmente."
  exit 1
fi

# Verificar que no sea la rama actual
current_branch=$(git branch --show-current)
if [[ "$branch_to_delete" == "$current_branch" ]]; then
  echo "❌ No puedes eliminar la rama en la que estás actualmente ('$current_branch'). Cambia de rama primero."
  exit 1
fi

# Confirmación
read -p "¿Seguro que deseas eliminar la rama '$branch_to_delete' local y remota? (s/n): " confirm
if [[ "$confirm" != "s" ]]; then
  echo "Operación cancelada."
  exit 0
fi

# Eliminar rama local
git branch -d "$branch_to_delete" || {
  echo "No se pudo eliminar con '-d', intentando forzar con '-D'..."
  git branch -D "$branch_to_delete"
}

# Verificar si existe rama remota para eliminar
remote_branch="origin/$branch_to_delete"
if git show-ref --verify --quiet refs/remotes/"$remote_branch"; then
  git push origin --delete "$branch_to_delete"
  echo "✅ Rama remota '$branch_to_delete' eliminada."
else
  echo "No existe rama remota '$branch_to_delete'."
fi

echo "✅ Rama '$branch_to_delete' eliminada localmente."
