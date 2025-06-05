#!/bin/bash
set -euo pipefail

# Nombre del script de pre-commit que se creará en .git/hooks
PRE_COMMIT_HOOK_SCRIPT_NAME="pre-commit-runner.sh"
GIT_HOOKS_DIR=".git/hooks"
PRE_COMMIT_HOOK_PATH="$GIT_HOOKS_DIR/pre-commit"

# Contenido del script que se ejecutará en el pre-commit
# Este script llamará a tus scripts de linting, formateo y pruebas.
PRE_COMMIT_RUNNER_CONTENT="#!/bin/bash
set -euo pipefail

echo \"🚀 Ejecutando validaciones pre-commit...\"

# --- Scripts de Calidad y Pruebas ---
# Descomenta y ajusta las rutas a tus scripts reales.
# Si alguno de estos scripts falla (sale con código != 0), el commit se abortará.

# echo \"🔍 Ejecutando linters y formateadores...\"
# ./scripts/lint-and-format.sh || { echo \"❌ Error de linting/formateo.\"; exit 1; }

# echo \"🧪 Ejecutando pruebas unitarias...\"
# ./scripts/run-tests.sh || { echo \"❌ Pruebas fallidas.\"; exit 1; }

# --- Validación de Mensaje de Commit (ejemplo conceptual) ---
# Para una validación robusta, usa herramientas como commitlint con un hook commit-msg.
# Este es un ejemplo muy básico:
# COMMIT_MSG_FILE=\\"\$1\\"
# if ! grep -qE \"^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\\(.+\\))?: .+$\" \\"\$COMMIT_MSG_FILE\\"; then
#   echo \"❌ Mensaje de commit no sigue el formato convencional (ej: feat: nueva funcionalidad).\"
#   echo \"   Tipos permitidos: feat, fix, docs, style, refactor, perf, test, chore, build, ci.\"
#   exit 1
# fi

echo \"✅ Validaciones pre-commit completadas.\"
exit 0
"

# Crear el directorio de scripts si no existe
mkdir -p ./scripts

echo "🔧 Configurando Git pre-commit hook..."

# Crear el script que será llamado por el hook
echo "$PRE_COMMIT_RUNNER_CONTENT" > "./scripts/$PRE_COMMIT_HOOK_SCRIPT_NAME"
chmod +x "./scripts/$PRE_COMMIT_HOOK_SCRIPT_NAME"

echo "✅ Script ./scripts/$PRE_COMMIT_HOOK_SCRIPT_NAME creado."

# Crear o reemplazar el hook de pre-commit en .git/hooks
# Este hook simplemente llamará a nuestro script centralizado
echo "#!/bin/bash
./scripts/$PRE_COMMIT_HOOK_SCRIPT_NAME \"\$1\"" > "$PRE_COMMIT_HOOK_PATH"
chmod +x "$PRE_COMMIT_HOOK_PATH"

echo "✅ Hook de pre-commit configurado en $PRE_COMMIT_HOOK_PATH"
echo "👉 Ahora, antes de cada commit, se ejecutarán las validaciones definidas en ./scripts/$PRE_COMMIT_HOOK_SCRIPT_NAME."
echo "📢 Recuerda configurar commitlint para una validación robusta de mensajes de commit usando el hook 'commit-msg'."