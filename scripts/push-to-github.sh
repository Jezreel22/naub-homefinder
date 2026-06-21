#!/usr/bin/env bash
set -e

if [ -z "${GITHUB_TOKEN}" ]; then
  echo "ERROR: GITHUB_TOKEN is not set. Skipping GitHub push." >&2
  exit 1
fi

REPO="https://${GITHUB_TOKEN}@github.com/Jezreel22/naub-homefinder.git"

if git remote get-url github &>/dev/null; then
  git remote set-url github "$REPO"
else
  git remote add github "$REPO"
fi

git config user.email "replit-bot@users.noreply.github.com" 2>/dev/null || true
git config user.name "Replit Bot" 2>/dev/null || true

echo "Pushing to GitHub..."
git push github HEAD:main
echo "Done — pushed to github.com/Jezreel22/naub-homefinder main."
