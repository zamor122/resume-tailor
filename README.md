# Resume Tailor
##  A microservice for tailoring your resume

## Vercel Preview Deployments (Auth)

For Supabase auth to work on Vercel preview URLs, add this in **Vercel Project Settings → Environment Variables**:

- **Name:** `NEXT_PUBLIC_VERCEL_URL`
- **Value:** `$VERCEL_URL` (or leave empty — Vercel may auto-populate for previews)
- **Environments:** Preview (optional: also Production if you want fallback)

Ensure these redirect URLs are in **Supabase Dashboard → Authentication → URL Configuration**:
- `https://airesumetailor.com/auth/callback`
- `https://airesumetailor.com/auth/reset-password`
- `https://*.vercel.app/auth/callback`
- `https://*.vercel.app/auth/reset-password`