# Local Stripe Webhook Setup

This guide helps you run the Stripe webhook locally for development and testing.

## Prerequisites

1. **Stripe CLI** installed:
   - macOS: `brew install stripe/stripe-cli/stripe`
   - Linux/Windows: https://stripe.com/docs/stripe-cli

2. **Stripe account** logged in: `stripe login`

3. **Dev server** running: `npm run dev` (in another terminal)

## Quick Start

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Forward webhooks to localhost
npm run webhook:listen
```

The `webhook:listen` script runs:
```
stripe listen --forward-to http://127.0.0.1:3000/api/stripe/webhook --events checkout.session.completed
```

## Configure Webhook Secret

When you run `npm run webhook:listen`, Stripe CLI outputs a signing secret:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

1. Copy the `whsec_...` value
2. Add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```
3. Restart your dev server (`npm run dev`)

**Note:** The secret changes each time you restart `stripe listen`. Update `.env.local` if you restart.

## Verify Endpoint is Reachable

Before checkout, verify the webhook endpoint works:

```bash
curl http://localhost:3000/api/stripe/webhook
```

You should see: `{"ok":true,"message":"Webhook endpoint is reachable...","hasSecret":true}`

## Test the Webhook

1. **Restart** `npm run webhook:listen` after any package.json changes (to pick up the latest forward URL).
2. Complete a test checkout (use card `4242 4242 4242 4242`).
3. **Watch the Stripe CLI terminal** – you MUST see:
   ```
   --> checkout.session.completed [evt_xxx]
   <-- [200] POST http://127.0.0.1:3000/api/stripe/webhook [evt_xxx]
   ```
   If you see `-->` but NOT `<-- [200]`, the forward is failing. If you see neither, the CLI isn't receiving events (check Stripe account matches your .env keys).
4. Check the Next.js dev server terminal for `[Webhook] POST received`.
5. Check the `access_grants` table in Supabase for the new row.

## Webhook Endpoint

- **Local:** `http://localhost:3000/api/stripe/webhook`
- **Production:** `https://yourdomain.com/api/stripe/webhook`

## Events Handled

- `checkout.session.completed` - Creates `access_grants` row and inserts into `payments` for audit

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Missing signature or webhook secret" | Add `STRIPE_WEBHOOK_SECRET` to `.env.local`, restart dev server |
| "Invalid signature" | Copy fresh secret from `stripe listen` output, update `.env.local`. **The secret changes every time you restart `stripe listen`.** |
| Connection refused | Ensure `npm run dev` is running on port 3000 |
| **Webhook never hit / no `-->` in Stripe CLI** | **Stripe account mismatch.** The CLI uses the account from `stripe login`; your app uses `STRIPE_SECRET_KEY`. They must be the same. Run `stripe login` and ensure you log into the same Stripe account that owns the keys in `.env.local`. Then restart `npm run webhook:listen`. |
| Resume doesn't unlock after payment | 1) Ensure `npm run webhook:listen` is running **before** checkout. 2) Copy the `whsec_...` from the CLI output into `.env.local`. 3) Restart dev server. 4) Check Stripe CLI terminal for `--> checkout.session.completed` and `<-- [200]` to confirm webhook received the event. |

## Verify Stripe CLI receives events

After completing a test checkout, you **must** see in the Stripe CLI terminal:

```
--> checkout.session.completed [evt_xxx]
<-- [200] POST http://127.0.0.1:3000/api/stripe/webhook [evt_xxx]
```

- If you see **neither**: The CLI isn't receiving events. Most likely cause: **different Stripe account**. Run `stripe login` and log into the same account as your `STRIPE_SECRET_KEY`.
- If you see `-->` but NOT `<-- [200]`: The forward is failing (e.g. webhook returns 500). Check the Next.js terminal for `[Webhook]` logs.

## Manual webhook test (without real checkout)

To verify the webhook endpoint works end-to-end:

```bash
npm run webhook:trigger
```

This triggers a test `checkout.session.completed` event. You should see `-->` and `<-- [200]` in the Stripe CLI, and `[Webhook] POST received` in the Next.js terminal. Note: test events may not have your metadata (userId, resumeId), so access won't be granted—but it confirms the webhook is reachable.
