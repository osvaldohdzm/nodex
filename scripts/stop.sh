#!/bin/bash

# --- Colores para la Salida ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # Sin color

set -euo pipefail

./script/stop.sh
./script/clean_project.sh
./clean_containters.sh
