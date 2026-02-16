import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getTierConfig } from "@/app/config/pricing";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";
import { getURL } from "@/app/utils/siteUrl";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, resumeId, userId, email, accessToken, returnUrl } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to purchase access." },
        { status: 401 }
      );
    }

    const authResult = await requireAuth(req, { accessToken });
    if ("error" in authResult) return authResult.error;

    const verifyResult = verifyUserIdMatch(authResult.userId, userId);
    if ("error" in verifyResult) return verifyResult.error;

    if (!tier) {
      return NextResponse.json(
        { error: "tier is required (2D, 7D, or 30D)" },
        { status: 400 }
      );
    }

    const tierConfig = getTierConfig(tier as "2D" | "7D" | "30D");
    if (!tierConfig?.priceId) {
      return NextResponse.json(
        { error: "Invalid tier or price not configured" },
        { status: 400 }
      );
    }

    const baseUrl = getURL().replace(/\/$/, "");

    // Validate returnUrl is same-origin to prevent open redirect
    let cancelUrl = `${baseUrl}/`;
    if (returnUrl && typeof returnUrl === "string") {
      try {
        const parsed = new URL(returnUrl);
        const base = new URL(baseUrl);
        if (parsed.origin === base.origin) {
          cancelUrl = returnUrl;
        }
      } catch {
        // Invalid URL, use default
      }
    }

    const paymentMethodTypes = ["card", "amazon_pay"];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      allow_promotion_codes: true,
      line_items: [
        {
          price: tierConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        tier,
        resumeId: resumeId || "",
        userId: userId || "",
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      ...(email && { customer_email: email }),
    });

    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/99fdcdcf-6af5-4738-8645-d0c7076b1a2a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "create-checkout/route.ts:session-created",
        message: "Checkout session created",
        data: {
          tier,
          priceId: tierConfig.priceId,
          sessionId: session.id,
          allowPromotionCodes: session.allow_promotion_codes,
          hypothesisId: "A",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
