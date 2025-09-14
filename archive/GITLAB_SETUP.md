# GitLab Repository Setup Instructions

## Steps to create and push to GitLab:

1. Go to https://gitlab.com and log in to your account
2. Click the "New Project" button
3. Select "Create blank project"
4. Name your project (e.g., "opendiscourse")
5. Choose to make it public or private
6. Do NOT initialize with a README
7. Click "Create project"

## After creating the repository, run these commands in your terminal:

```bash
# Add the GitLab remote
git remote add gitlab https://gitlab.com/cbwinslow/opendiscourse.git

# Push to GitLab
git push -u gitlab main
```

Replace "cbwinslow" with your actual GitLab username and "opendiscourse" with your actual project name.
