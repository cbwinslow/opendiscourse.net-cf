#!/bin/bash
# Script to push to both GitHub and GitLab

echo "Pushing to GitHub..."
git push -u origin main

echo -e "\nPushing to GitLab..."
git push -u gitlab main

echo -e "\nPush complete!"
echo "GitHub: https://github.com/cbwinslow/opendiscourse.net-cf"
echo "GitLab: https://gitlab.com/cbwinslow/opendiscourse.net-cf"