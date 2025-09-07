#!/bin/bash
# Script to set up Git remotes and push to GitHub and GitLab

echo "Setting up Git remotes for GitHub and GitLab..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Ask for GitHub username and repository name
echo "GitHub Setup:"
read -p "Enter your GitHub username: " github_username
read -p "Enter your GitHub repository name (e.g., opendiscourse): " github_repo

# Ask for GitLab username and repository name
echo -e "\nGitLab Setup:"
read -p "Enter your GitLab username: " gitlab_username
read -p "Enter your GitLab repository name (e.g., opendiscourse): " gitlab_repo

# Add GitHub remote
echo -e "\nAdding GitHub remote..."
git remote add origin https://github.com/$github_username/$github_repo.git

# Add GitLab remote
echo "Adding GitLab remote..."
git remote add gitlab https://gitlab.com/$gitlab_username/$gitlab_repo.git

# Show current remotes
echo -e "\nCurrent remotes:"
git remote -v

# Push to both repositories
echo -e "\nPushing to GitHub..."
git push -u origin main

echo -e "\nPushing to GitLab..."
git push -u gitlab main

echo -e "\nSetup complete! Your repository has been pushed to both GitHub and GitLab."
echo "GitHub: https://github.com/$github_username/$github_repo"
echo "GitLab: https://gitlab.com/$gitlab_username/$gitlab_repo"