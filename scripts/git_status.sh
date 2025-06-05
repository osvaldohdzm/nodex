#!/bin/bash

clear

# Check if inside a Git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "❌ Not inside a Git repository."
  exit 1
fi

# --- Configuration ---
ICON_REPO="📍"
ICON_BRANCH="🧭"
ICON_COMMIT="🔨"
ICON_AUTHOR="👤"
ICON_MESSAGE="📝"
ICON_DATE="🕒"
ICON_BRANCHES="🌿"
ICON_CURRENT_BRANCH="⭐"
ICON_OTHER_BRANCH=" ○"
ICON_STATUS="📂"
ICON_CLEAN="✅"
ICON_MODIFIED="⚠️"
ICON_RECENT="🧠"
ICON_NONE="🤷"
ICON_CONTEXT_TEST="🔬" # Icon for test context message

# --- Get Git Information ---
current_branch=$(git rev-parse --abbrev-ref HEAD)
last_commit_raw=$(git log -1 --pretty=format:"%h|%an|%s|%cr") # Using %cr for relative commit date
all_branches=$(git branch --color=never | sed 's/^[ *]*//') # Clean branch names
git_status_output=$(git status -s)
# Get top 5 most recently changed files in the commit history (not just uncommitted changes)
recent_files=$(git log --pretty=format:"" --name-only -n 5 HEAD | grep -v '^$' | head -n 5 | sort -u)

# --- Header ---
echo ""
echo -e "${ICON_REPO} Git Repository Status"
echo "==================================="

# --- Current Branch & Context Message ---
printf "${ICON_BRANCH} Current Branch: \033[1;32m%s\033[0m\n" "$current_branch" # Bold Green


# New dynamic message logic for test branches
CONTEXT_MESSAGE=""
ICON_CONTEXT="" # Will be set if a context message is generated

LOWER_CURRENT_BRANCH=$(echo "$current_branch" | tr '[:upper:]' '[:lower:]')

if [[ "$LOWER_CURRENT_BRANCH" == *test* ]]; then
    ICON_CONTEXT="$ICON_CONTEXT_TEST" # Set icon for test
    SUBJECT_OF_TESTING=""
    processed_special_case=false

    # Handle cases where the branch name itself is very simple like "test", "test-", "test/"
    if [[ "$LOWER_CURRENT_BRANCH" == "test" || "$LOWER_CURRENT_BRANCH" == "test-" || "$LOWER_CURRENT_BRANCH" == "test/" ]]; then
        CONTEXT_MESSAGE="You are performing general TESTING."
        processed_special_case=true
    fi

    if ! $processed_special_case; then
        # Try to extract subject by removing "test" parts, preserving case from original current_branch
        if [[ "$current_branch" == test/* ]]; then
            SUBJECT_OF_TESTING="${current_branch#test/}"
        elif [[ "$current_branch" == test-* ]]; then
            SUBJECT_OF_TESTING="${current_branch#test-}"
        elif [[ "$current_branch" == *-test ]]; then
            SUBJECT_OF_TESTING="${current_branch%-test}"
        elif [[ "$current_branch" == */test ]]; then # e.g., some/path/test
            SUBJECT_OF_TESTING="${current_branch%/test}"
        fi

        if [[ -n "$SUBJECT_OF_TESTING" ]]; then
            # Check if the extracted subject contains a slash (e.g., "feature/A")
            if [[ "$SUBJECT_OF_TESTING" == */* ]]; then
                CONTEXT_MESSAGE="You are TESTING ${SUBJECT_OF_TESTING}."
            else # Simple name (e.g., "dev")
                CONTEXT_MESSAGE="You are TESTING ${SUBJECT_OF_TESTING} branch."
            fi
        else
            # Fallback if 'test' is in the name but not as a recognized prefix/suffix,
            # or if extraction resulted in an empty subject from a more complex name.
            CONTEXT_MESSAGE="You are on a TEST branch (${current_branch})." # Previous generic message
        fi
    fi
fi

if [[ -n "$CONTEXT_MESSAGE" ]]; then
    # Printing the context message in yellow with an icon
    printf "  %s \033[0;33m%s\033[0m\n" "$ICON_CONTEXT" "$CONTEXT_MESSAGE"
fi

echo "-----------------------------------"

# --- Branches ---
echo -e "${ICON_BRANCHES} Branches:"
found_current=false
while IFS= read -r branch_name; do
  if [[ "$branch_name" == "$current_branch" ]]; then
    printf "  ${ICON_CURRENT_BRANCH} \033[1;32m%s\033[0m\n" "$branch_name" # Bold Green for current
    found_current=true
  elif [[ -n "$branch_name" ]]; then # Check if branch_name is not empty
    printf "  ${ICON_OTHER_BRANCH} %s\n" "${branch_name}"
  fi
done <<< "$all_branches"

# Fallback if current branch wasn't listed (e.g., detached HEAD)
if ! $found_current && [[ "$current_branch" =~ '\(HEAD detached at .* \)' ]]; then
  printf "  ${ICON_CURRENT_BRANCH} \033[1;33m%s\033[0m\n" "$current_branch" # Bold Yellow for detached
fi
echo "-----------------------------------"

git log -5 --oneline


# --- Last Commit ---
echo "-----------------------------------"
IFS='|' read -r hash author message date <<< "$last_commit_raw"
printf "${ICON_COMMIT} Last Commit:    %-10s\n" "$hash"
printf "    ${ICON_AUTHOR} Author:       %-20s\n" "$author"
printf "    ${ICON_MESSAGE} Message:      %-40s\n" "$message"
printf "    ${ICON_DATE} Date:         %s\n" "$date"
echo "-----------------------------------"

# --- Working Tree Status ---
echo -e "${ICON_STATUS} Working Tree Status:"
if [ -z "$git_status_output" ]; then
  echo -e "  ${ICON_CLEAN} Clean - No changes to commit."
else
  while IFS= read -r line; do
    status_icon="${ICON_MODIFIED}"
    if [[ "$line" == " M "* ]]; then
        status_icon="📝" # Modified
    elif [[ "$line" == " A "* ]]; then
        status_icon="✨" # Added
    elif [[ "$line" == " D "* ]]; then
        status_icon="🗑️" # Deleted
    elif [[ "$line" == " R "* ]]; then
        status_icon="🔄" # Renamed
    elif [[ "$line" == " C "* ]]; then
        status_icon="📄" # Copied
    elif [[ "$line" == "?? "* ]]; then
        status_icon="❓" # Untracked
    fi
    echo -e "  ${status_icon} ${line}"
  done <<< "$git_status_output"
fi
echo "-----------------------------------"

# --- Recently Modified Files (from last 5 commits) ---
echo -e "${ICON_RECENT} Recently Changed Files (in last 5 commits):"
if [ -z "$recent_files" ]; then
  echo -e "  ${ICON_NONE} No recent files found in the last 5 commits."
else
  while IFS= read -r file; do
    printf "  ↳ %s\n" "$file"
  done <<< "$recent_files"
fi
echo "==================================="
echo ""

