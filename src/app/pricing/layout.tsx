import { Metadata } from "next";
import { ProductOfferStructuredData } from "@/app/components/StructuredData";
import { TIME_BASED_TIERS, FREE_RESUME_LIMIT, FREE_AUDIT_LIMIT } from "@/app/config/pricing";

// Derived, never hardcoded. This description previously advertised "from $4.95" long after the
// tiers changed to $9/$19/$29, so Google was showing searchers a price we do not charge.
// Keep it derived: a literal here is the bug this comment exists to prevent.
const ENTRY_PRICE = Math.min(...TIME_BASED_TIERS.map((t) => t.price)).toFixed(2);

export const metadata: Metadata = {
  title: "All-Access Passes — Simple, Transparent One-Time Pricing",
  description:
    FREE_RESUME_LIMIT > 0
      ? `Your first ${FREE_RESUME_LIMIT} AI resume tailor is free. One-time All-Access Passes from $${ENTRY_PRICE} unlock every service we offer (Tailor + Futureproof AI) with zero subscriptions.`
      : `Get ${FREE_AUDIT_LIMIT} free ATS audits & previews. Unlock every service we offer (Tailor + Futureproof AI + exports) with an All-Access Pass from $${ENTRY_PRICE}. One-time payment, no subscription.`,
  alternates: {
    canonical: "https://airesumetailor.com/pricing",
  },
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
