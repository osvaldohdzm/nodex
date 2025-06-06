#!/bin/bash
set -euo pipefail

# --- Script Configuration ---
# Set to true to automatically accept the default commit message.
# Can be overridden by passing the -y flag.
AUTO_YES=false

# --- Color Codes for Output ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# --- Service Configuration ---
PORTS_TO_CLEAN=("6379" "8000" "4545")

# --- Function Definitions ---

# Logging functions for different message types
log_info()    { echo -e "${CYAN}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

# --- Argument Parsing ---
# Check for a "-y" flag to skip user prompts.
if [[ "${1:-}" == "-y" ]]; then
  AUTO_YES=true
  log_info "'-y' flag detected. Script will run in non-interactive mode."
fi

# --- Port Cleanup Function ---
cleanup_ports() {
  log_info "Checking and clearing required ports..."
  for port in "${PORTS_TO_CLEAN[@]}"; do
    # Find container ID using the port
    container_id=$(docker ps -q --filter "publish=${port}")

    if [[ -n "$container_id" ]]; then
      container_name=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/^\///')
      log_warning "Port $port is in use by container '$container_name' (ID: $container_id)."
      log_info "🔪 Stopping and removing container '$container_name' to free up the port..."

      if docker rm -f "$container_id" > /dev/null 2>&1; then
        log_success "Port $port has been successfully cleared."
      else
        log_error "Failed to remove container '$container_name'. Manual intervention may be required."
      fi
    else
      log_info "👍 Port $port is free."
    fi
  done
  echo "" # Add a newline for better readability
}

# --- Git Changes Handling Function ---
handle_git_changes() {
  # Check if there are any uncommitted changes
  if git diff-index --quiet HEAD --; then
    log_success "No pending changes in the working directory. Skipping commit."
    return
  fi

  log_warning "Changes detected in the working directory."

  # Get the current Git branch
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ -z "$current_branch" ]]; then
    log_error "Could not determine the current branch."
    exit 1
  fi
  log_info "Current branch is '$current_branch'."

  # Determine the target test branch name
  local target_test_branch
  if [[ "$current_branch" == */test || "$current_branch" == *-test ]]; then
    target_test_branch="$current_branch"
    log_info "Already on a test branch: '$target_test_branch'."
  else
    target_test_branch="${current_branch}-test"
    log_info "Target test branch will be '$target_test_branch'."

    # Create the test branch if it doesn't exist
    if ! git show-ref --verify --quiet "refs/heads/$target_test_branch"; then
      log_info "🌱 Creating new branch '$target_test_branch'..."
      git checkout -b "$target_test_branch"
    else
      log_info "Switching to existing test branch '$target_test_branch'..."
      git checkout "$target_test_branch"
    fi
  fi

  # Stage all changes
  git add .

  # --- Auto-generate Commit Message ---
  local base_branch short_name last_test_number next_test_number default_commit_msg commit_msg
  # Extract base branch name by removing '-test' or '/test' suffix
  base_branch="${current_branch%-test}"
  base_branch="${base_branch%/test}"

  # Extract a short name from the branch for the commit message
  case "$base_branch" in
    feature/*) short_name="${base_branch#feature/}" ;;
    hotfix/*)  short_name="${base_branch#hotfix/}"  ;;
    bugfix/*)  short_name="${base_branch#bugfix/}"  ;;
    dev)       short_name="dev" ;;
    *)         short_name="$base_branch" ;;
  esac

  # Find the last test number and increment it
  last_test_number=$(git log --pretty=format:"%s" "$target_test_branch" | grep -oP "^Test \K[0-9]+(?= for $short_name)" | sort -rn | head -n1 || echo 0)
  next_test_number=$((last_test_number + 1))
  default_commit_msg="Test $next_test_number for $short_name"

  # --- Commit Process ---
  if [[ "$AUTO_YES" = true ]]; then
    commit_msg="$default_commit_msg"
    log_info "Auto-committing with message: '$commit_msg'"
  else
    # Prompt the user for a commit message, with the default as a suggestion
    read -rp "$(echo -e "${YELLOW}Enter commit message (Press ENTER to use '${default_commit_msg}'): ${NC}")" user_commit_msg
    commit_msg="${user_commit_msg:-$default_commit_msg}"
  fi

  if git commit -m "$commit_msg"; then
    log_success "Changes committed: '$commit_msg' on branch '$target_test_branch'."
  else
    log_error "Commit failed. Verify there are changes to be committed."
    exit 1
  fi
  echo "" # Add a newline
}


# --- Main Execution ---
main() {
  local start_time
  start_time=$(date +%s)

  cleanup_ports
  handle_git_changes

  # Assuming ./scripts/start.sh is the script to start services
  if [ -f "./scripts/start.sh" ]; then
    log_info "Executing ./scripts/start.sh..."
    ./scripts/start.sh
  else
    log_warning "./scripts/start.sh not found. Skipping service start."
  fi

  log_success "🎉 Script finished successfully in $(($(date +%s) - start_time)) seconds."
  exit 0
}

# Run the main function
main
