#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push latest checkpoint to GitHub
bash scripts/push-to-github.sh
