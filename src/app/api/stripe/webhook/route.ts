import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { getTierConfig } from "@/app/config/pricing";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET: Verify webhook endpoint is reachable (for local setup debugging) */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook endpoint is reachable. Use POST for Stripe events.",
    hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("[Webhook] Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  // Refunds and chargebacks must revoke access, otherwise a refunded customer
  // keeps paid access until natural expiry (revenue leakage).
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    return handleRevocation(event);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ---------------------------------------------------------------
// Fulfilment: checkout.session.completed
// ---------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<NextResponse> {
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const metadata = session.metadata || {};
  const tier = metadata.tier as "2D" | "7D" | "30D" | undefined;
  const userId = metadata.userId as string | undefined;
  const resumeId = metadata.resumeId as string | undefined;

  // A malformed tier is our own config problem, not a transient failure —
  // retrying cannot fix it, so we intentionally acknowledge and log.
  if (!tier || !["2D", "7D", "30D"].includes(tier)) {
    console.error("[Webhook] Invalid or missing tier in metadata:", tier);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const tierConfig = getTierConfig(tier);
  if (!tierConfig) {
    console.error("[Webhook] Unknown tier:", tier);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + tierConfig.durationDays);

  // A paid session with no user cannot be fulfilled. Checkout requires auth
  // (see create-checkout/route.ts), so this signals a real anomaly — fail loudly
  // so Stripe retries and the failure surfaces in the dashboard rather than
  // silently taking money for nothing.
  if (!userId) {
    console.error(
      "[Webhook] Paid session missing userId — cannot fulfil:",
      session.id
    );
    return NextResponse.json(
      { error: "Paid session missing userId" },
      { status: 500 }
    );
  }

  try {
    const { error: grantError } = await supabaseAdmin.from("access_grants").insert({
      user_id: userId,
      stripe_session_id: session.id,
      payment_timestamp: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      tier_purchased: tier,
      is_active: true,
    });

    if (grantError) {
      if (grantError.code === "23505") {
        // Idempotency: this session was already fulfilled by an earlier delivery.
        console.warn("[Webhook] Duplicate session, skipping:", session.id);
      } else {
        // Transient infrastructure failure — return 5xx so Stripe retries
        // instead of leaving a paying customer with no access.
        console.error("[Webhook] Failed to insert access_grants:", grantError);
        return NextResponse.json(
          { error: "Failed to grant access" },
          { status: 500 }
        );
      }
    }
  } catch (err) {
    console.error("[Webhook] Error inserting access_grants:", err);
    return NextResponse.json(
      { error: "Failed to grant access" },
      { status: 500 }
    );
  }

  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id || "";
    const amountTotal = session.amount_total ?? 0;
    const amountDiscount = session.total_details?.amount_discount ?? 0;

    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      resume_id: resumeId && resumeId.trim() ? resumeId.trim() : null,
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_price_id: priceId,
      amount_cents: amountTotal,
      currency: "usd",
      status: "completed",
      metadata: { tier, source: "access_grant", amount_discount: amountDiscount },
    });
  } catch (err) {
    // The grant is what matters commercially; a missing ledger row is logged
    // loudly but does not fail the delivery.
    console.warn("[Webhook] Optional payments insert failed:", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ---------------------------------------------------------------
// Revocation: charge.refunded / charge.dispute.created
// ---------------------------------------------------------------

/** Extract the payment intent id from a Charge or Dispute event object. */
function paymentIntentIdOf(obj: unknown): string | undefined {
  const value = (obj as { payment_intent?: unknown })?.payment_intent;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

async function handleRevocation(event: Stripe.Event): Promise<NextResponse> {
  const reason = event.type === "charge.refunded" ? "refunded" : "disputed";
  const paymentIntentId = paymentIntentIdOf(event.data.object);

  if (!paymentIntentId) {
    console.error("[Webhook] Revocation event missing payment_intent:", event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    // access_grants is keyed by checkout session id, so resolve it via the
    // payment ledger (payments carries both ids).
    const { data: payment, error: lookupError } = await supabaseAdmin
      .from("payments")
      .select("stripe_session_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (lookupError) {
      console.error("[Webhook] Revocation lookup failed:", lookupError);
      return NextResponse.json(
        { error: "Revocation lookup failed" },
        { status: 500 }
      );
    }

    const sessionId = payment?.stripe_session_id;
    if (!sessionId) {
      console.warn(
        "[Webhook] No payment record for revoked intent; nothing to revoke:",
        paymentIntentId
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { error: revokeError } = await supabaseAdmin
      .from("access_grants")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq("stripe_session_id", sessionId);

    if (revokeError) {
      console.error("[Webhook] Failed to revoke access grant:", revokeError);
      return NextResponse.json(
        { error: "Failed to revoke access" },
        { status: 500 }
      );
    }

    console.warn(
      `[Webhook] Revoked access (${reason}) for session:`,
      sessionId
    );
  } catch (err) {
    console.error("[Webhook] Error handling revocation:", err);
    return NextResponse.json({ error: "Revocation error" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
