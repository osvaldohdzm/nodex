#!/bin/bash

# --- Configuration ---
OUTPUT_FILE="code_context.txt"
REGEX_FILTER_LINES='^\s*#(?!.*\.py).*' # Exclude comment lines, unless they are in .py files

declare -A GROUP_FILES
GROUP_FILES[frontend]="frontend"
GROUP_FILES[backend]="backend"
GROUP_FILES[full]="frontend backend scripts docker-compose.yml"

EXCLUDE_DIRS=(.git node_modules __pycache__ venv scan_results)
EXCLUDE_FILES=(README.md LICENSE)

# Only include these extensions
INCLUDE_EXTENSIONS=(py js json yml yaml css html)

# Validate input
if [ $# -ne 1 ]; then
    echo "Usage: $0 <group>"
    echo "Available GROUP_FILES:"
    for group_name in "${!GROUP_FILES[@]}"; do
        echo "  - $group_name"
    done
    exit 1
fi

GROUP="$1"

if [[ -z "${GROUP_FILES[$GROUP]}" ]]; then
    echo "Invalid group: $GROUP"
    echo "Available GROUP_FILES:"
    for group_name in "${!GROUP_FILES[@]}"; do
        echo "  - $group_name"
    done
    exit 1
fi

echo -n > "$OUTPUT_FILE" # Clear or create the output file

# Process each item in the group
for item in ${GROUP_FILES[$GROUP]}; do
    TARGET="$PWD/$item"

    if [ -d "$TARGET" ]; then
        find "$TARGET" \( \
            $(for dir in "${EXCLUDE_DIRS[@]}"; do echo -n "-name $dir -o "; done | sed 's/ -o $//') \
        \) -prune -o -type f \( \
            $(for ext in "${INCLUDE_EXTENSIONS[@]}"; do echo -n "-iname '*.$ext' -o "; done | sed 's/ -o $//') \
        \) ! \( \
            $(for file_pattern in "${EXCLUDE_FILES[@]}"; do echo -n "-name '$file_pattern' -o "; done | sed 's/ -o $//') \
        \) -print0 | while IFS= read -r -d $'\0' file; do
            echo "===== ${file#$PWD/} =====" >> "$OUTPUT_FILE"
            cat "$file" >> "$OUTPUT_FILE"
            echo -e "\n\n" >> "$OUTPUT_FILE"
        done
    elif [ -f "$TARGET" ]; then
        ext="${TARGET##*.}"
        is_allowed=false
        for inc_ext in "${INCLUDE_EXTENSIONS[@]}"; do
            if [[ "$ext" == "$inc_ext" ]]; then
                is_allowed=true
                break
            fi
        done

        excluded_by_filename=false
        for excluded_file in "${EXCLUDE_FILES[@]}"; do
            if [[ "$(basename "$TARGET")" == "$excluded_file" ]]; then
                excluded_by_filename=true
                break
            fi
        done

        if $is_allowed && ! $excluded_by_filename; then
            echo "===== ${item} =====" >> "$OUTPUT_FILE"
            cat "$TARGET" >> "$OUTPUT_FILE"
            echo -e "\n\n" >> "$OUTPUT_FILE"
        fi
    else
        echo "Warning: '$item' specified in group '$GROUP' is not a directory or file, skipping."
    fi
done

echo "Context successfully written to $OUTPUT_FILE"
