#!/bin/bash
set -euo pipefail

# --- Configuración ---

# Remoto por defecto. Puedes cambiarlo si tu remoto principal no es 'origin'.
REMOTE="origin"
# Ramas base que NO deben ser el objetivo de una integración directa desde ramas de prueba.
# Esto es una medida de seguridad para evitar integraciones automáticas en ramas de producción.
PROTECTED_BASE_BRANCHES=("main" "master")

# --- Funciones de Utilidad ---

# Función para limpiar archivos .pyc y directorios __pycache__
clean_python_artifacts() {
    echo "🔐 Solicitando permisos de superusuario para limpiar archivos .pyc y __pycache__..."
    # 'sudo bash -c' permite ejecutar comandos con privilegios de root
    # '2>/dev/null || true' suprime errores y asegura que el script no falle si no hay permisos o archivos
    sudo bash -c 'chmod -R u+rw backend/app/__pycache__/ 2>/dev/null || true'
    sudo bash -c 'find backend/app/ -name "*.pyc" -delete || true'

    echo "📂 Limpiando rastreo de __pycache__ y *.pyc de Git..."
    # git rm --cached elimina los archivos del índice de Git (los deja en el disco)
    git rm -r --cached backend/app/__pycache__/ 2>/dev/null || true
    find backend/app/ -name "*.pyc" -print0 | xargs -0 git rm --cached --ignore-unmatch 2>/dev/null || true

    # Asegurarse de que están en .gitignore para que Git los ignore en el futuro
    local gitignore_changed=false
    if ! grep -q "__pycache__/" .gitignore 2>/dev/null; then
        echo "__pycache__/" >> .gitignore
        echo "✅ Añadido __pycache__/ a .gitignore."
        gitignore_changed=true
    fi
    if ! grep -q "*.pyc" .gitignore 2>/dev/null; then
        echo "*.pyc" >> .gitignore
        echo "✅ Añadido *.pyc a .gitignore."
        gitignore_changed=true
    fi

    # Si se modificó .gitignore, hacer un commit
    if [ "$gitignore_changed" = true ]; then
        git add .gitignore || true # '|| true' para que no falle si no hay cambios que añadir
        git commit -m "fix: remover __pycache__ y *.pyc del control de versiones y añadir a .gitignore" || true
    fi
}

# Función para manejar conflictos de merge previos o estados de rebase
handle_previous_git_state() {
    # Detectar y abortar merges en conflicto
    if [ -f .git/MERGE_HEAD ]; then
        echo "⚠️ Se detectó un merge previo con conflictos. Guardando cambios temporales para abortar merge..."
        if ! git stash push -u -m "🧹 Stash temporal antes de abortar merge fallido"; then
            echo "❌ Fallo al stashear cambios temporales. Puede que necesites resolver esto manualmente. Abortando."
            exit 1
        fi
        
        if ! git merge --abort; then
            echo "❌ Fallo al abortar el merge anterior. Puede que necesites resolver esto manualmente. Abortando."
            exit 1
        fi
        echo "✅ Merge anterior abortado correctamente."

        # Intentar aplicar el stash; si hay conflictos, notificar
        if ! git stash pop; then
            echo "⚠️ Conflicto al aplicar los cambios stasheados temporalmente. Por favor, resuélvelos manualmente."
            echo "Puedes ver tus stashes con 'git stash list' y aplicarlos con 'git stash apply stash@{n}'."
            # No se aborta aquí, el usuario puede resolverlo post-script
        fi
    fi

    # Detectar y abortar rebases en progreso
    if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
        echo "⚠️ Se detectó un rebase en progreso. Abortando rebase..."
        if ! git rebase --abort; then
            echo "❌ Fallo al abortar el rebase. Puede que necesites resolver esto manualmente. Abortando."
            exit 1
        fi
        echo "✅ Rebase abortado correctamente."
    fi
}

# --- Lógica Principal del Script ---

# 1. Limpiar artefactos y manejar estados de Git previos
handle_previous_git_state
clean_python_artifacts

---

## Detección y Selección de Ramas de Prueba

echo "🔍 Buscando ramas de prueba ('test/*' o '*-test')..."
mapfile -t test_branches < <(
    {
        git branch --list "test/*"
        git branch --list "*-test"
    } | sed 's/^[* ]*//' | sort -u
)

if [ ${#test_branches[@]} -eq 0 ]; then
    echo "ℹ️ No hay ramas de prueba ('test/*' o '*-test') disponibles para integrar."
    exit 0
fi

echo "🌿 Ramas de prueba disponibles:"
for i in "${!test_branches[@]}"; do
    printf "  [%d] %s\n" "$((i+1))" "${test_branches[i]}"
done

# Seleccionar automáticamente la primera rama de prueba encontrada.
selected_test="${test_branches[0]}"
echo "🟢 Seleccionando automáticamente la primera rama de prueba: '$selected_test'"

---

## Determinación de la Rama Base

base_branch=""
if [[ "$selected_test" == test/* ]]; then
    base_branch="${selected_test#test/}" # Elimina "test/" del inicio
elif [[ "$selected_test" == *-test ]]; then
    base_branch="${selected_test%-test}" # Elimina "-test" del final
else
    echo "❌ El formato de la rama '$selected_test' no es reconocido para derivar rama base. Abortando."
    exit 1
fi

echo "🔍 Rama base detectada: '$base_branch'"

# Seguridad: evitar merges directos en ramas protegidas
for protected_branch in "${PROTECTED_BASE_BRANCHES[@]}"; do
    if [[ "$base_branch" == "$protected_branch" ]]; then
        echo "⚠️ Integración directa en la rama protegida '$base_branch' desde una rama de prueba no está permitida. Abortando."
        exit 1
    fi
done

---

## Preparación del Entorno Git

# Guardar la rama actual para regresar a ella al final
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Asegurar que la rama base exista localmente y esté actualizada
echo "🌐 Asegurando que la rama base '$base_branch' exista localmente y esté actualizada..."
# Primero, fetch de todas las ramas para tener la información más reciente.
if ! git fetch "$REMOTE"; then
    echo "❌ No se pudo hacer fetch desde el remoto '$REMOTE'. Abortando."
    exit 1
fi

# Intentar crear una rama de seguimiento si no existe, o verificar su existencia.
if ! git rev-parse --verify "refs/heads/$base_branch" &>/dev/null; then
    echo "⚠️ La rama base local '$base_branch' no existe. Intentando crearla desde '$REMOTE/$base_branch'..."
    if ! git branch --track "$base_branch" "$REMOTE/$base_branch"; then
        echo "❌ No se pudo crear la rama base '$base_branch' desde '$REMOTE/$base_branch'. Abortando."
        exit 1
    fi
else
    echo "✅ Rama base '$base_branch' ya existe localmente."
fi

# Manejar cambios locales antes de cambiar de rama
echo "🛠️ Verificando cambios locales en la rama actual ($CURRENT_BRANCH) antes de cambiar..."
STASHED_CHANGES=false
# Usamos `git status --porcelain` para detectar cambios en archivos rastreados y sin rastrear.
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Se detectaron cambios locales (modificados o sin rastrear). Intentando stash..."
    # `git stash push -u` incluye archivos sin rastrear (untracked).
    if git stash push -u -m "Automated stash by integration script before switching to $base_branch"; then
        echo "✅ Cambios locales stasheados exitosamente."
        STASHED_CHANGES=true
    else
        echo "❌ No se pudieron stashear los cambios locales. Por favor, revísalos manualmente. Abortando."
        exit 1
    fi
else
    echo "✨ No hay cambios locales sin confirmar."
fi

---

## Proceso de Integración

# 1. Cambiar a la rama de prueba y actualizarla (pull)
echo "🔄 Cambiando a la rama de prueba '$selected_test' y actualizándola..."
if ! git checkout "$selected_test"; then
    echo "❌ No se pudo cambiar a la rama de prueba '$selected_test'. Abortando."
    # Asegúrate de que, si falló, no estás en un estado intermedio
    git checkout "$CURRENT_BRANCH" || true
    exit 1
fi
if git ls-remote --exit-code "$REMOTE" "$selected_test" &>/dev/null; then
    echo "🌐 Actualizando rama de prueba '$selected_test' desde remoto..."
    if ! git pull "$REMOTE" "$selected_test"; then
        echo "⚠️ Fallo al hacer pull de la rama de prueba '$selected_test'. Continuar con los cambios locales de la rama de prueba."
        # No se aborta aquí; se asume que se quiere continuar con la versión local de la rama de prueba.
    fi
fi

# 2. Fusionar la rama base en la rama de prueba con estrategia 'ours'
echo "🛡️ Fusionando '$base_branch' en '$selected_test' usando estrategia 'ours' (se conservarán los cambios de la rama de prueba)..."
# Esto es crucial: los cambios de la rama de prueba prevalecen si hay conflictos con la rama base.
if ! git merge "$base_branch" -s ours -m "Integración de '$base_branch' en '$selected_test' (estrategia ours)"; then
    echo "❌ Fallo al fusionar '$base_branch' en '$selected_test' con estrategia 'ours'. Abortando."
    git checkout "$CURRENT_BRANCH" || true # Intentar volver a la rama original
    exit 1
fi

# 3. Cambiar a la rama base y hacer fast-forward desde la rama de prueba
echo "🔄 Cambiando a la rama base '$base_branch'..."
if ! git checkout "$base_branch"; then
    echo "❌ No se pudo cambiar a la rama base '$base_branch'. Abortando."
    git checkout "$CURRENT_BRANCH" || true # Intentar volver a la rama original
    exit 1
fi

echo "⏩ Aplicando fast-forward de '$selected_test' en '$base_branch'..."
# Intenta fast-forward; si no es posible, intenta un merge regular.
if ! git merge --ff-only "$selected_test"; then
    echo "⚠️ No se pudo hacer fast-forward de '$selected_test' en '$base_branch'. Esto puede indicar que la rama de prueba tiene historial divergente."
    echo "Se intentará un merge regular en su lugar."
    if ! git merge "$selected_test" -m "Merge rama de prueba '$selected_test' en '$base_branch' (fallback)"; then
        echo "❌ Fallo al fusionar '$selected_test' en '$base_branch'. Puede haber conflictos. Por favor, resuélvelos manualmente y luego ejecuta 'git add .' y 'git commit'."
        git checkout "$CURRENT_BRANCH" || true # Intentar volver a la rama original
        exit 1
    fi
fi

---

## Finalización y Limpieza

# Aplicar stash si se realizó uno previamente
if [ "$STASHED_CHANGES" = true ]; then
    echo "♻️ Aplicando cambios stasheados previamente..."
    if git stash pop; then
        echo "✅ Cambios stasheados aplicados exitosamente."
    else
        echo "⚠️ Fallo al aplicar los cambios stasheados. Puede haber conflictos. Por favor, resuélvelos manualmente."
        echo "Puedes ver tus stashes con 'git stash list' y aplicarlos con 'git stash apply stash@{n}'."
        # No se aborta aquí; el usuario debe resolver manualmente si ocurre un conflicto al aplicar el stash.
    fi
fi

# Eliminar la rama de prueba local
echo "🗑️ Eliminando rama de prueba local '$selected_test'..."
# Intenta eliminar con -d (seguro, solo si está completamente fusionada).
# Si falla, usa -D (forzado, útil si tiene commits no empujados o no mergeados).
if ! git branch -d "$selected_test"; then
    echo "⚠️ La rama '$selected_test' no está completamente fusionada o tiene cambios sin subir. Intentando eliminarla forzadamente."
    if ! git branch -D "$selected_test"; then
        echo "❌ No se pudo eliminar la rama local '$selected_test'. Por favor, elimínala manualmente si es necesario."
        # Esto no es un error fatal para el proceso de integración.
    fi
fi

# (Opcional) Eliminar rama remota si existe
if git ls-remote --exit-code "$REMOTE" "refs/heads/$selected_test" &>/dev/null; then
    echo "🌐 Eliminando rama de prueba remota '$selected_test'..."
    if ! git push "$REMOTE" --delete "$selected_test"; then
        echo "❌ No se pudo eliminar la rama remota '$selected_test'. Por favor, elimínala manualmente si es necesario."
        # Esto no es un error fatal.
    fi
fi

echo "✅ Integración completada exitosamente en '$base_branch'."
echo "🎉 ¡La rama '$base_branch' ahora contiene los cambios de '$selected_test'!"

# Regresar a la rama original si se hizo un stash y se cambió de rama
if [[ "$CURRENT_BRANCH" != "$base_branch" ]]; then
    echo "🔄 Volviendo a la rama original '$CURRENT_BRANCH'..."
    if git checkout "$CURRENT_BRANCH"; then
        echo "✅ Regresado a la rama original '$CURRENT_BRANCH'."
    else
        echo "❌ No se pudo volver a la rama original '$CURRENT_BRANCH'. Actualmente estás en la rama '$base_branch'."
    fi
fi

echo "Script finalizado."