#!/bin/bash

# Check if we're in a git repo
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
  echo "❌ Not inside a Git repository."
  exit 1
fi

echo "📍 Git Repository Status"
echo "------------------------"

# Current branch
branch=$(git rev-parse --abbrev-ref HEAD)
echo "🧭 Branch: $branch"

# Last commit
echo "🔨 Last Commit:"
git log -1 --pretty=format:"  ↪ Hash: %h%n  👤 Author: %an%n  📝 Message: %s%n  🕒 Date: %cd" --date=short
echo

# Status summary
echo "📂 Working Tree Status:"
git status -s
echo

# Optional: Show what you might be working on (recent file changes)
echo "🧠 Recently modified files:"
git diff --name-only HEAD | head -n 5
#!/bin/bash

# Check if we're in a git repo
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
  echo "❌ Not inside a Git repository."
  exit 1
fi

echo "📍 Git Repository Status"
echo "------------------------"

# Current branch
branch=$(git rev-parse --abbrev-ref HEAD)
echo "🧭 Current Branch: $branch"
echo

# Beautified list of branches
echo "🌿 All Branches:"
git branch --color=always | sed "s/^\*/👉 &/; s/^ /   /"
echo

# Last commit
echo "🔨 Last Commit:"
git log -1 --pretty=format:"  ↪ Hash: %h%n  👤 Author: %an%n  📝 Message: %s%n  🕒 Date: %cd" --date=short
echo

# Status summary
echo "📂 Working Tree Status:"
git status -s
echo

# Recently modified files
echo "🧠 Recently modified files:"
git diff --name-only HEAD | head -n 5
