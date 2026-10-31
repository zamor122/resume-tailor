import { NextRequest, NextResponse } from "next/server";
import { getTierConfig } from "@/app/config/pricing";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";
import { getURL } from "@/app/utils/siteUrl";
import { stripe } from "@/app/lib/stripe";

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

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
