#!/bin/bash
set -euo pipefail

echo "🔎 Verificando rama actual..."
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Selección de rama test si no estamos en una
if [[ "$current_branch" != *test* ]]; then
  echo "📋 Lista de ramas con 'test' en el nombre:"
  mapfile -t test_branches < <(git branch --format="%(refname:short)" | grep test)
  if [[ ${#test_branches[@]} -eq 0 ]]; then
    echo "❌ No se encontraron ramas con 'test' en el nombre."
    exit 1
  fi

  echo ""
  select selected_branch in "${test_branches[@]}"; do
    if [[ -n "$selected_branch" ]]; then
      git checkout "$selected_branch"
      current_branch="$selected_branch"
      break
    else
      echo "❌ Selección inválida."
    fi
  done
else
  echo "🌿 Ya estás en una rama de prueba: $current_branch"
fi

# Mostrar commits
echo ""
echo "📜 Últimos 10 commits en '$current_branch':"
mapfile -t commits < <(git log --oneline -n 10)
for i in "${!commits[@]}"; do
  echo "  $((i+1)). ${commits[i]}"
done

# Selección de commit
echo ""
read -rp "🔢 Ingresa el número del commit al que deseas regresar: " selection
if ! [[ "$selection" =~ ^[1-9]$|^10$ ]]; then
  echo "❌ Selección inválida. Debe ser un número entre 1 y 10."
  exit 1
fi

selected_commit_hash=$(echo "${commits[$((selection-1))]}" | awk '{print $1}')
selected_commit_desc=$(echo "${commits[$((selection-1))]}" | cut -d' ' -f2-)

# Guardar estado actual
echo ""
echo "💾 Guardando HEAD actual..."
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  backup_msg="⏳ backup antes de explorar commit $selected_commit_hash"
  git commit -m "$backup_msg"
  echo "📝 Commit de respaldo creado."
fi

backup_ref=$(git rev-parse HEAD)
backup_tag="backup-before-review-$(date +%s)"
git tag "$backup_tag" "$backup_ref"
echo "🏷️ Tag temporal de respaldo creado: $backup_tag -> $backup_ref"

# Checkout del commit seleccionado (detached HEAD)
echo ""
echo "🧪 Haciendo checkout temporal a: $selected_commit_hash"
git checkout "$selected_commit_hash"

echo ""
echo "👁️ Puedes explorar el estado del repositorio ahora."
echo "----------------------------------------"
echo "✅ Estás en el commit: $selected_commit_hash - $selected_commit_desc"
echo "----------------------------------------"
echo ""
read -rp "¿Deseas hacer rollback definitivo ('r') o volver al HEAD anterior ('b')? " action

if [[ "$action" == "r" ]]; then
  echo "🚨 Haciendo rollback. Esto sobrescribirá el historial de la rama '$current_branch'."
  read -rp "¿Confirmas rollback permanente? (y/n): " confirm
  if [[ "$confirm" != "y" ]]; then
    echo "🚫 Operación cancelada."
    git checkout "$current_branch"
    git reset --hard "$backup_ref"
    exit 0
  fi

  git checkout "$current_branch"
  git reset --hard "$selected_commit_hash"
  git push origin "$current_branch" --force
  echo "✅ Rollback realizado. HEAD ahora en $selected_commit_hash."

elif [[ "$action" == "b" ]]; then
  echo "↩️ Regresando al HEAD anterior..."
  git checkout "$current_branch"
  git reset --hard "$backup_ref"
  git clean -fd
  echo "✅ Regresaste al estado original sin cambios."

else
  echo "❌ Opción inválida. Cancelando..."
  git checkout "$current_branch"
  git reset --hard "$backup_ref"
  exit 1
fi
