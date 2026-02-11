import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { customerId, email, returnUrl } = await req.json();

    if (!customerId && !email) {
      return NextResponse.json(
        { error: "customerId or email is required" },
        { status: 400 }
      );
    }

    let resolvedCustomerId = customerId;

    // If no customerId but we have an email, try to find or create a customer
    if (!resolvedCustomerId && email) {
      const existing = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existing.data.length > 0) {
        resolvedCustomerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email,
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

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: resolvedCustomerId,
      return_url:
        returnUrl ||
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/profile`,
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





