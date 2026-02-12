import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getTierConfig } from "@/app/config/pricing";
import { getURL } from "@/app/utils/siteUrl";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

export const runtime = "nodejs";
export const maxDuration = 30;

async function getAuthenticatedUserId(token: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

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

    const token = accessToken || req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Session required. Please sign in to purchase access." },
        { status: 401 }
      );
    }

    const authenticatedUserId = await getAuthenticatedUserId(token);
    if (!authenticatedUserId) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }
    if (authenticatedUserId !== userId) {
      return NextResponse.json(
        { error: "User ID does not match authenticated session." },
        { status: 403 }
      );
    }

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
