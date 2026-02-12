# Supabase Email Templates

Custom email templates for AI Resume Tailor, styled to match the app.

## Confirm Signup

**File:** `confirm-signup.html`

### How to use

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**
2. Select **Confirm signup**
3. Paste the contents of `confirm-signup.html` into the template editor
4. Ensure the **Subject** line is set (e.g. `Confirm your signup - AI Resume Tailor`)
5. Save

### Template variables used

- `{{ .ConfirmationURL }}` - The confirmation link (required)

### Design

- Dark theme matching the app (gray-900, gray-800)
- Cyan accent (#00f0ff) for branding
- Purple CTA button
- Includes first steps / how-to guide
- Plain link fallback for clients that block buttons

---

## Magic Link

**File:** `magic-link.html`

### How to use

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**
2. Select **Magic Link**
3. Paste the contents of `magic-link.html` into the template editor
4. Ensure the **Subject** line is set (e.g. `Log in to AI Resume Tailor`)
5. Save

### Template variables used

- `{{ .ConfirmationURL }}` - The magic link (required)

### Design

- Same dark theme and styling as Confirm Signup
- Brief security note (link expires, one-time use)
- Plain link fallback for clients that block buttons

---

## Reset Password

**File:** `reset-password.html`

### How to use

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**
2. Select **Reset Password**
3. Paste the contents of `reset-password.html` into the template editor
4. Ensure the **Subject** line is set (e.g. `Reset your password - AI Resume Tailor`)
5. Save

### Template variables used

- `{{ .ConfirmationURL }}` - The reset link (required)

### Design

- Same dark theme and styling as other templates
- Brief security note (link expires, one-time use)
- Plain link fallback for clients that block buttons

---

## Changed Password

**File:** `changed-password.html`

### How to use

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**
2. Find the **Change Password** or **Password changed** security notification template (under Email Templates)
3. Paste the contents of `changed-password.html` into the template editor
4. Ensure the **Subject** line is set (e.g. `Your password has been changed - AI Resume Tailor`)
5. Save

### Template variables used

- `{{ .Email }}` - The user's email address

### Design

- Same dark theme and styling as other templates
- No link/button — informational confirmation only
