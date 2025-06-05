#!/bin/bash
set -euo pipefail

echo "🚨 Modo de emergencia: restauración dura a un commit anterior"
echo "⚠️ TODOS LOS CAMBIOS LOCALES SE PERDERÁN (incluye archivos no versionados)"
echo

# Obtener y mostrar los últimos 10 commits con enumeración
echo "📜 Últimos commits:"
mapfile -t commits < <(git log --oneline -n 10)

for i in "${!commits[@]}"; do
  echo "[$i] ${commits[$i]}"
done

echo
read -p "👉 Ingresa el número del commit al que deseas regresar (0-${#commits[@]}): " selection

if ! [[ "$selection" =~ ^[0-9]+$ ]] || (( selection < 0 || selection >= ${#commits[@]} )); then
  echo "❌ Selección inválida."
  exit 1
fi

commit_hash=$(echo "${commits[$selection]}" | awk '{print $1}')
echo
echo "🔁 Restaurando a commit $commit_hash (${commits[$selection]:$(( ${#commit_hash} + 1 ))})"
echo

# Confirmación final
read -p "⚠️ ¿Estás seguro? Esto eliminará todos los cambios no comprometidos. (escribe 'YES' para continuar): " confirm
if [[ "$confirm" != "YES" ]]; then
  echo "❌ Operación cancelada."
  exit 1
fi

# Limpiar archivos no rastreados
echo "🧹 Eliminando archivos no versionados..."
git clean -fd

# Reset duro al commit seleccionado
echo "🔙 Haciendo reset duro..."
git reset --hard "$commit_hash"

echo "✅ Estado restaurado al commit $commit_hash."
