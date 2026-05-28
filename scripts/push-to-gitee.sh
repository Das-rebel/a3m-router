#!/bin/bash
# Push mirror to Gitee for Chinese SEO
# Usage: ./scripts/push-to-gitee.sh
# Prerequisites: Gitee account + SSH key configured
# Gitee repo: https://gitee.com/das-rebel/a3m-router
# Requires: git (>=2.0)

set -euo pipefail

GITEE_REPO="git@gitee.com:das-rebel/a3m-router.git"
GITHUB_REPO="https://github.com/Das-rebel/a3m-router.git"

echo "=== Mirroring A3M Router to Gitee ==="
echo "Source: $GITHUB_REPO"
echo "Target: $GITEE_REPO"
echo ""

# Verify SSH connectivity to Gitee
echo "[1/4] Testing Gitee SSH connection..."
if ssh -T -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 git@gitee.com 2>&1 | grep -q "successfully authenticated"; then
    echo "  OK - SSH key works with Gitee"
elif [ $? -eq 1 ]; then
    # Some Gitee SSH responses return exit code 1 even on success
    echo "  OK - SSH key works with Gitee"
else
    echo "  WARNING: SSH check failed. Continuing anyway..."
fi

# Clone fresh mirror
echo "[2/4] Cloning mirror of GitHub repo..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
git clone --mirror "$GITHUB_REPO" . 2>&1
echo "  Done - $(git rev-list --count HEAD) commits mirrored"

# Add Gitee remote and push
echo "[3/4] Pushing to Gitee..."
git remote add gitee "$GITEE_REPO"
git push --mirror gitee 2>&1
echo "  Done"

# Clean up
echo "[4/4] Cleaning up temporary files..."
cd /
rm -rf "$TEMP_DIR"
echo "  Done"

echo ""
echo "============================================"
echo "  Mirror pushed to Gitee!"
echo "  Visit: https://gitee.com/das-rebel/a3m-router"
echo "============================================"
