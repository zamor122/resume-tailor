# Blog System

The blog is powered by the `blog_posts` table in Supabase. Posts can be added via:

1. **Cron job** (automated) – AI-generated posts daily
2. **Admin API** (manual) – Add posts via REST API

## Database

Run the migration if the table doesn't exist:

```bash
# If using Supabase CLI
supabase db push

# Or run the migration manually
psql $DATABASE_URL -f supabase/migrations/20250213000000_create_blog_posts.sql
```

## Admin API (Manual Posts)

**Base URL:** `POST /api/admin/blog`

**Auth:** `Authorization: Bearer <CRON_SECRET or BLOG_ADMIN_SECRET>`

**Body:**
```json
{
  "title": "Your Post Title",
  "slug": "optional-url-slug",
  "description": "Meta description for SEO",
  "summary": "One-line summary",
  "body": "## Markdown content\n\nYour post body..."
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/admin/blog \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"How to Tailor Your Resume","description":"A guide.","summary":"Guide.","body":"## Intro\n\nContent..."}'
```

**List posts:** `GET /api/admin/blog` (same auth)

**Health check:** `GET /api/admin/blog?health=1` (same auth)

## Cron (Automated Posts)

The cron runs daily at 1:00 AM UTC (`0 1 * * *` in `vercel.json`).

**Requirements:**
- `CRON_SECRET` in Vercel env (Vercel sends this when invoking the cron)
- AI provider keys (OpenAI, Anthropic, etc.) for `generateContentWithFallback`
- `blog_posts` table exists

**Manual trigger (for testing):**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/generate-blog-post
```

## Test Script

```bash
# Load .env.local and run all checks
./scripts/test-blog-api.sh

# Against production
./scripts/test-blog-api.sh https://airesumetailor.com
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "blog_posts table unreachable" | Run migration `20250213000000_create_blog_posts.sql` |
| Cron returns 401 | Set `CRON_SECRET` in Vercel project env |
| Cron returns 500 "Failed to generate" | Check AI provider keys (OPENAI_API_KEY, etc.) |
| Posts not showing on /blog | Verify `getAllPosts()` in `blog.ts` – uses `supabaseAdmin` (service role) |
