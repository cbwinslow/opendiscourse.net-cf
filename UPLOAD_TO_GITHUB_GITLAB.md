# How to Upload to GitHub and GitLab

This repository is ready to be uploaded to both GitHub and GitLab. Follow these steps:

## Prerequisites

1. Create accounts on both GitHub (https://github.com) and GitLab (https://gitlab.com) if you don't have them already
2. Make sure you have git installed and configured on your system

## Option 1: Using the Automated Script

Run the setup script which will guide you through the process:

```bash
./setup_github_gitlab.sh
```

The script will ask for:
1. Your GitHub username
2. Your GitHub repository name (create this on GitHub first)
3. Your GitLab username
4. Your GitLab repository name (create this on GitLab first)

## Option 2: Manual Setup

### Step 1: Create Repositories

1. **GitHub**:
   - Go to https://github.com and log in
   - Click the "+" icon and select "New repository"
   - Name your repository (e.g., "opendiscourse")
   - Choose public or private
   - Do NOT initialize with a README
   - Click "Create repository"

2. **GitLab**:
   - Go to https://gitlab.com and log in
   - Click "New Project"
   - Select "Create blank project"
   - Name your project (e.g., "opendiscourse")
   - Choose public or private
   - Do NOT initialize with a README
   - Click "Create project"

### Step 2: Add Remotes and Push

```bash
# Add the GitHub remote
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

# Add the GitLab remote
git remote add gitlab https://gitlab.com/YOUR_GITLAB_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main

# Push to GitLab
git push -u gitlab main
```

## Verification

After pushing, you should be able to access your repositories at:
- GitHub: https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME
- GitLab: https://gitlab.com/YOUR_GITLAB_USERNAME/YOUR_REPO_NAME

## Troubleshooting

If you encounter authentication issues:
1. Make sure you're using the correct URLs
2. Check that your credentials are correct
3. Consider using SSH keys for authentication instead of HTTPS