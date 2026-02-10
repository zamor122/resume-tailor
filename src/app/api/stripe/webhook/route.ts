import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { getTierConfig } from "@/app/config/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

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
  console.log("[Webhook] POST received");
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
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const metadata = session.metadata || {};
    const tier = metadata.tier as "2D" | "7D" | "30D" | undefined;
    const userId = metadata.userId as string | undefined;
    const resumeId = metadata.resumeId as string | undefined;

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

    if (userId) {
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
            console.warn("[Webhook] Duplicate session, skipping:", session.id);
          } else {
            console.error("[Webhook] Failed to insert access_grants:", grantError);
          }
        }
      } catch (err) {
        console.error("[Webhook] Error inserting access_grants:", err);
      }
    }

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id || "";
      const amountTotal = session.amount_total ?? 0;

      await supabaseAdmin.from("payments").insert({
        user_id: userId || null,
        resume_id: resumeId && resumeId.trim() ? resumeId.trim() : null,
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripe_price_id: priceId,
        amount_cents: amountTotal,
        currency: "usd",
        status: "completed",
        metadata: { tier, source: "access_grant" },
      });
    } catch (err) {
      console.warn("[Webhook] Optional payments insert failed:", err);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
