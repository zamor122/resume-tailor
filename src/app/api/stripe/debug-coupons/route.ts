import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getTierConfig } from "@/app/config/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/stripe/debug-coupons
 * Returns Stripe coupon/promotion code setup and eligibility for our prices.
 * Use this to debug why promotion codes don't work.
 */
export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY not configured" },
        { status: 500 }
      );
    }

    const tiers: ("2D" | "7D" | "30D")[] = ["2D", "7D", "30D"];
    const priceInfo: Array<{
      tier: string;
      priceId: string;
      productId: string | null;
      currency: string;
    }> = [];

    for (const tier of tiers) {
      const config = getTierConfig(tier);
      const priceId = config?.priceId;
      if (!priceId || !priceId.startsWith("price_")) {
        priceInfo.push({
          tier,
          priceId: priceId || "(missing or invalid)",
          productId: null,
          currency: "usd",
        });
        continue;
      }

      try {
        const price = await stripe.prices.retrieve(priceId);
        priceInfo.push({
          tier,
          priceId,
          productId:
            typeof price.product === "string" ? price.product : price.product?.id || null,
          currency: price.currency,
        });
      } catch (err) {
        priceInfo.push({
          tier,
          priceId,
          productId: null,
          currency: "usd",
        });
      }
    }

    const promotionCodes: Array<{
      code: string;
      active: boolean;
      couponId: string;
      couponPercentOff: number | null;
      couponAmountOff: number | null;
      couponCurrency: string | null;
      appliesToProducts: string[] | null;
      redeemBy: number | null;
      maxRedemptions: number | null;
      timesRedeemed: number;
      eligibility: Record<string, string>;
    }> = [];

    const ourProductIds = new Set(
      priceInfo.map((p) => p.productId).filter(Boolean) as string[]
    );

    for await (const promo of stripe.promotionCodes.list({
      active: true,
      limit: 100,
      expand: ["data.promotion.coupon"],
    })) {
      const couponRef = promo.promotion?.coupon;
      const coupon =
        typeof couponRef === "string"
          ? await stripe.coupons.retrieve(couponRef)
          : couponRef;

      if (!coupon) continue;

      const appliesToProducts =
        coupon.applies_to?.products && coupon.applies_to.products.length > 0
          ? coupon.applies_to.products
          : null;

      const eligibility: Record<string, string> = {};
      if (appliesToProducts) {
        const overlap = appliesToProducts.filter((pid: string) =>
          ourProductIds.has(pid)
        );
        if (overlap.length === 0) {
          eligibility.status = "excluded";
          eligibility.reason = `Coupon applies only to products [${appliesToProducts.join(", ")}] but our products are [${[...ourProductIds].join(", ")}]`;
        } else {
          eligibility.status = "eligible";
          eligibility.reason = `Coupon applies to our products: ${overlap.join(", ")}`;
        }
      } else {
        eligibility.status = "eligible";
        eligibility.reason = "Coupon applies to all products";
      }

      promotionCodes.push({
        code: promo.code,
        active: promo.active,
        couponId: coupon.id,
        couponPercentOff: coupon.percent_off,
        couponAmountOff: coupon.amount_off,
        couponCurrency: coupon.currency || null,
        appliesToProducts,
        redeemBy: coupon.redeem_by ?? null,
        maxRedemptions: coupon.max_redemptions ?? null,
        timesRedeemed: promo.times_redeemed,
        eligibility,
      });
    }

    const inactivePromos: Array<{ code: string; active: boolean }> = [];
    for await (const promo of stripe.promotionCodes.list({ active: false, limit: 20 })) {
      inactivePromos.push({ code: promo.code, active: promo.active });
    }

    return NextResponse.json({
      message: "Stripe coupon debug info",
      livemode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false,
      prices: priceInfo,
      activePromotionCodes: promotionCodes,
      inactivePromotionCodes: inactivePromos,
      recommendations: buildRecommendations(priceInfo, promotionCodes),
    });
  } catch (error) {
    console.error("Stripe debug-coupons error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch coupon info",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function buildRecommendations(
  priceInfo: Array<{ tier: string; priceId: string; productId: string | null }>,
  promotionCodes: Array<{ code: string; eligibility: Record<string, string> }>
): string[] {
  const recs: string[] = [];

  if (priceInfo.some((p) => !p.priceId.startsWith("price_") || !p.productId)) {
    recs.push(
      "Fix: Price IDs must start with 'price_' (not 'prod_'). Update STRIPE_PRICE_ID_* in .env."
    );
  }

  const excluded = promotionCodes.filter((p) => p.eligibility.status === "excluded");
  if (excluded.length > 0) {
    recs.push(
      `Fix: Remove product restrictions from these coupons in Stripe Dashboard, or add our product IDs to applies_to: ${excluded.map((p) => p.code).join(", ")}`
    );
  }

  if (promotionCodes.length === 0) {
    recs.push(
      "Fix: Create a Coupon in Stripe Dashboard (Products > Coupons), then create a Promotion Code on top of it."
    );
  }

  return recs;
}
