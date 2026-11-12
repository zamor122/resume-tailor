import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { paid: false, status: session.payment_status },
        { status: 200 }
      );
    }

    // Deliberately does NOT return customer_email. This endpoint is reachable without a
    // session (the post-payment /success page is intentionally sessionless and cannot send
    // a bearer token), so it must not hand back buyer PII for any session id passed in.
    // Session ids are cryptographically random and this route is rate-limited by middleware,
    // which is what bounds the residual exposure here.
    return NextResponse.json({
      paid: true,
      status: session.payment_status,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
