import { Metadata } from "next";
import { ProductOfferStructuredData } from "@/app/components/StructuredData";
import { TIME_BASED_TIERS, FREE_RESUME_LIMIT, FREE_AUDIT_LIMIT } from "@/app/config/pricing";

// Derived, never hardcoded. This description previously advertised "from $4.95" long after the
// tiers changed to $9/$19/$29, so Google was showing searchers a price we do not charge.
// Keep it derived: a literal here is the bug this comment exists to prevent.
const ENTRY_PRICE = Math.min(...TIME_BASED_TIERS.map((t) => t.price)).toFixed(2);

export const metadata: Metadata = {
  title: "Pricing - Simple, Transparent Plans",
  description:
    FREE_RESUME_LIMIT > 0
      ? `Your first ${FREE_RESUME_LIMIT} AI resume tailor is free. Unlimited access from $${ENTRY_PRICE}. One-time payment, no subscription. Start tailoring in seconds.`
      : `Get ${FREE_AUDIT_LIMIT} free ATS audits & previews. Unlock full tailored resume downloads from $${ENTRY_PRICE}. One-time payment, no subscription.`,
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProductOfferStructuredData />
      {children}
    </>
  );
}
