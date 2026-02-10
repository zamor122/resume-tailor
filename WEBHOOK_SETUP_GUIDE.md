# Stripe Webhook Setup Guide

This guide walks you through configuring your Stripe webhook step-by-step.

## Understanding Webhooks

Webhooks allow Stripe to notify your application when events happen (like when a payment is completed). Your app needs to:
1. **Receive** the webhook at a public URL
2. **Verify** the webhook came from Stripe (using the signing secret)
3. **Process** the event (grant access, update database, etc.)

---

## Step-by-Step: Configure Stripe Webhook

### Option A: For Production (Deployed App)

If your app is already deployed (e.g., on Vercel, Netlify, etc.):

#### 1. Get Your Production URL

Your webhook endpoint will be:
```
https://yourdomain.com/api/stripe/webhook
```

**Examples:**
- Vercel: `https://your-app.vercel.app/api/stripe/webhook`
- Custom domain: `https://airesumetailor.com/api/stripe/webhook`
- Netlify: `https://your-app.netlify.app/api/stripe/webhook`

#### 2. Go to Stripe Dashboard

1. Open: https://dashboard.stripe.com/webhooks
2. Make sure you're in **Test mode** (toggle in top right) for testing, or **Live mode** for production
3. Click the **"Add endpoint"** button (top right)

#### 3. Configure the Endpoint

**Endpoint URL:**
```
https://yourdomain.com/api/stripe/webhook
```
*(Replace `yourdomain.com` with your actual domain)*

**Description (optional):**
```
Resume Tailor - Payment Processing
```

#### 4. Select Events to Listen To

Click **"Select events"** and choose these three events:

- ✅ **`checkout.session.completed`** - When a customer completes checkout
- ✅ **`payment_intent.succeeded`** - When payment succeeds
- ✅ **`payment_intent.payment_failed`** - When payment fails

You can either:
- Select **"Select events"** and check these three boxes, OR
- Select **"Send all events"** (less efficient but works)

#### 5. Create the Endpoint

Click **"Add endpoint"** at the bottom

#### 6. Copy the Signing Secret

After creating the endpoint, you'll see a page with:
- Endpoint URL
- **"Signing secret"** - This is what you need!

Click **"Reveal"** next to "Signing secret" and copy it. It starts with `whsec_`

#### 7. Add to .env.local

Open your `.env.local` file and update:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

Replace the placeholder with the actual secret you copied.

---

### Option B: For Local Development

For local development, you'll use **Stripe CLI** to forward webhooks to your local server.

**Quick reference:** See [scripts/setup-webhook-local.md](scripts/setup-webhook-local.md) for a condensed local setup guide.

#### 1. Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux/Windows:**
Download from: https://stripe.com/docs/stripe-cli

#### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authorize the CLI.

#### 3. Start Your Local Server

In one terminal, start your Next.js app:
```bash
npm run dev
```

Your app should be running on `http://localhost:3000`

#### 4. Forward Webhooks to Local Server

In another terminal, run:
```bash
npm run webhook:listen
```

Or directly:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Output will look like:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

#### 5. Copy the Webhook Secret

Copy the `whsec_...` secret from the CLI output.

#### 6. Add to .env.local

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_secret_from_cli
```

**Important:** Keep the `stripe listen` command running while developing. Each time you restart it, you'll get a new secret.

---

## Verify Webhook is Working

### Test the Webhook

1. **Trigger a test payment** in your app (use Stripe test card: `4242 4242 4242 4242`)
2. **Check Stripe Dashboard** > Webhooks > Your endpoint > "Recent events"
3. You should see events being received

### Check Your Logs

If using Stripe CLI locally, you'll see events in the terminal:
```
2024-01-15 10:30:45  --> checkout.session.completed [evt_xxx]
2024-01-15 10:30:45  <-- [200] POST http://localhost:3000/api/stripe/webhook [evt_xxx]
```

### Common Issues

**"Missing signature or webhook secret"**
- Make sure `STRIPE_WEBHOOK_SECRET` is set in `.env.local`
- Restart your dev server after adding it

**"Invalid signature"**
- Make sure you're using the correct secret for the correct mode (test vs live)
- If using Stripe CLI, make sure you copied the secret from the CLI output

**Webhook not receiving events**
- Check your endpoint URL is correct
- Make sure your app is running and accessible
- For local dev, ensure `stripe listen` is running

---

## Quick Reference

**Production Webhook URL:**
```
https://yourdomain.com/api/stripe/webhook
```

**Local Development:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Required Events:**
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

**Environment Variable:**
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```





