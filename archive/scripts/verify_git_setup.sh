#!/bin/bash
# Script to verify Git setup

echo "Verifying Git setup..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Show current branch
echo "Current branch: $(git branch --show-current)"

# Show commit history
echo -e "\nRecent commit history:"
git log --oneline -5

# Show current remotes
echo -e "\nCurrent remotes:"
git remote -v

# Show status
echo -e "\nRepository status:"
git status --porcelain | wc -l | xargs -I {} echo "Uncommitted changes: {} files"

echo -e "\nGit setup verification complete."