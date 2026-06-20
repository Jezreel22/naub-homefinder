#!/usr/bin/env bash
set -e

REPO="https://${GITHUB_TOKEN}@github.com/Jezreel22/naub-homefinder.git"

if git remote get-url github &>/dev/null; then
  git remote set-url github "$REPO"
else
  git remote add github "$REPO"
fi

git push github main
echo "Done."
