#!/bin/bash
# Push to Gitee mirror for Chinese SEO
# Usage: bash scripts/push-to-gitee.sh

set -e

GITEE_REPO="https://gitee.com/das-rebel/a3m-router.git"

echo "🇨🇳 Pushing to Gitee mirror..."

# Add gitee remote if not already added
if ! git remote | grep -q gitee; then
    git remote add gitee "$GITEE_REPO"
fi

# Push main branch
git push gitee main --force 2>&1 || {
    echo "❌ Push failed. You may need to:"
    echo "  1. Create the repo on gitee.com first"
    echo "  2. Or authenticate with: git config credential.helper store"
    exit 1
}

echo "✅ Pushed to Gitee!"
echo "  https://gitee.com/das-rebel/a3m-router"
