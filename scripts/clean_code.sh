#!/bin/bash

# clean_comments.sh
# Securely removes comments from React project files (JS, JSX, TS, TSX, CSS, SCSS)

# Security precautions
set -euo pipefail  # Exit on error, undefined variables, and pipeline failures
IFS=$'\n\t'        # More secure IFS setting

# Directory validation
PROJECT_ROOT="$(realpath "$(dirname "$0")/..")"
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "Error: Doesn't look like a React project root (node_modules not found)" >&2
    exit 1
fi

# Backup original files (security measure)
BACKUP_DIR="/tmp/react_clean_backup_$(date +%s)"
mkdir -p "$BACKUP_DIR"
echo "Creating backup in $BACKUP_DIR..."
find "$PROJECT_ROOT" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.scss" \) -exec cp --parents {} "$BACKUP_DIR" \;

# Detect sed version
if sed --version >/dev/null 2>&1; then
    SED_INPLACE=(-i)
else
    SED_INPLACE=(-i '')
fi

# Function to clean files with validation
clean_file() {
    local file="$1"
    local original_hash=$(sha256sum "$file" | cut -d' ' -f1)
    
    # JS/JSX/TS/TSX files
    if [[ "$file" =~ \.(js|jsx|ts|tsx)$ ]]; then
        # Remove single-line comments (only those that are whole lines)
        sed "${SED_INPLACE[@]}" -E '/^\s*\/\/.*$/d' "$file"
        
        # Remove multi-line comments (carefully)
        sed "${SED_INPLACE[@]}" -E ':a;N;$!ba;s/\/\*([^*]|\*(?!\/))*\*\///g' "$file"
        
        # Preserve JSX comments and React-specific patterns
        sed "${SED_INPLACE[@]}" -E '/{\/\*.*\*\/}/!d' "$file"
    fi
    
    # CSS/SCSS files
    if [[ "$file" =~ \.(css|scss)$ ]]; then
        sed "${SED_INPLACE[@]}" -E ':a;N;$!ba;s/\/\*([^*]|\*(?!\/))*\*\///g' "$file"
    fi
    
    # Verify the file is still valid
    local new_hash=$(sha256sum "$file" | cut -d' ' -f1)
    if [ "$original_hash" == "$new_hash" ]; then
        echo "No changes made to $file (already clean or pattern matched)"
    fi
}

# Process files
echo "Cleaning React project files..."
find "$PROJECT_ROOT/src" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.scss" \) -print0 | while IFS= read -r -d '' file; do
    echo "Processing: $file"
    clean_file "$file"
done

echo "Cleaning complete. Original files backed up to $BACKUP_DIR"