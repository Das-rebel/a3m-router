#!/usr/bin/env bash
# 🚀 A3M Router — One-command posting script
# Set these env vars first:
#   DEV_TO_API_KEY=your_key_from_dev.to/settings
#   HN_USERNAME=your_hn_username
#   HN_PASSWORD=your_hn_password
#
# Or just run the ones you have keys for.

set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 📺 Posting to dev.to ==="
if [ -n "$DEV_TO_API_KEY" ]; then
  BODY=$(cat "$DIR/articles/FRESH_devto_2026_05.md")
  curl -s -X POST https://dev.to/api/articles \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DEV_TO_API_KEY" \
    -d "$(python3 -c "
import json
with open('$DIR/articles/FRESH_devto_2026_05.md') as f:
    body = f.read()
print(json.dumps({
    'article': {
        'title': 'Three LLM Infrastructure Problems That Shouldn't Exist in 2026',
        'body_markdown': body,
        'tags': ['llm', 'opensource', 'typescript', 'ai', 'devops'],
        'published': true,
        'main_image': 'https://raw.githubusercontent.com/Das-rebel/a3m-router/main/docs/benchmark-chart.png'
    }
}))")" | python3 -c "import json,sys;d=json.load(sys.stdin);print('  Published:', d.get('url','FAILED'))"
else
  echo "  Skipping (set DEV_TO_API_KEY)"
fi

echo ""
echo "=== 📺 Dev.to draft posted as private. Approve at dev.to/dashboard."
echo "=== 🐙 HN: Post manually at https://news.ycombinator.com/submit"
echo "=== 🔴 Reddit: Post manually at each subreddit"
echo ""
echo "Posting kit: $DIR/articles/POSTING_KIT_2026_05.md"