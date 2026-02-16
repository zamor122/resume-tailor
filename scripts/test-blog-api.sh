#!/bin/bash
# Test blog admin API and cron
# Usage: ./scripts/test-blog-api.sh [base-url]
# Requires CRON_SECRET or BLOG_ADMIN_SECRET in .env.local

set -e
BASE="${1:-http://localhost:3000}"

# Load .env.local if present
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

SECRET="${CRON_SECRET:-$BLOG_ADMIN_SECRET}"

if [ -z "$SECRET" ]; then
  echo "Set CRON_SECRET or BLOG_ADMIN_SECRET (e.g. export CRON_SECRET=your-secret)"
  exit 1
fi

echo "=== 1. Health check ==="
curl -s -H "Authorization: Bearer $SECRET" "$BASE/api/admin/blog?health=1"

echo ""
echo "=== 2. List posts ==="
curl -s -H "Authorization: Bearer $SECRET" "$BASE/api/admin/blog"

echo ""
echo "=== 3. Create test post ==="
curl -s -X POST -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post - How to Tailor Your Resume",
    "description": "A quick guide to resume tailoring.",
    "summary": "Test post for blog API verification.",
    "body": "## Introduction\n\nThis is a test post. [Try AI Resume Tailor](https://airesumetailor.com) to tailor your resume for any job.\n\n## Conclusion\n\nGet started today!"
  }' "$BASE/api/admin/blog"

echo ""
echo "=== 4. Trigger cron (generate new AI post) ==="
curl -s -H "Authorization: Bearer $SECRET" "$BASE/api/cron/generate-blog-post"
