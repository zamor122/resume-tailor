import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getURL } from "@/app/utils/siteUrl";
import { requireAuthWithEmail } from "@/app/utils/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, email, returnUrl, accessToken } = body;

    const authResult = await requireAuthWithEmail(req, { accessToken });
    if ("error" in authResult) return authResult.error;

    const emailToUse = email && email === authResult.email ? email : authResult.email;
    if (!customerId && !emailToUse) {
      return NextResponse.json(
        { error: "Unable to resolve customer. Email is required." },
        { status: 400 }
      );
    }

    let resolvedCustomerId = customerId;

    if (!resolvedCustomerId && emailToUse) {
      const existing = await stripe.customers.list({
        email: emailToUse,
        limit: 1,
      });

      if (existing.data.length > 0) {
        resolvedCustomerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email: emailToUse,
        });
        resolvedCustomerId = created.id;
      }
    }

    if (!resolvedCustomerId) {
      return NextResponse.json(
        { error: "Unable to resolve Stripe customer" },
        { status: 400 }
      );
    }

    const baseUrl = getURL().replace(/\/$/, "");
    let safeReturnUrl = `${baseUrl}/profile`;
    if (returnUrl && typeof returnUrl === "string") {
      try {
        const parsed = new URL(returnUrl);
        const base = new URL(baseUrl);
        if (parsed.origin === base.origin) safeReturnUrl = returnUrl;
      } catch {
        // Invalid URL, use default
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: resolvedCustomerId,
      return_url: safeReturnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}





