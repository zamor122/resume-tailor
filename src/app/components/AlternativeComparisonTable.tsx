import React from "react";
import { TIME_BASED_TIERS, FREE_RESUME_LIMIT } from "@/app/config/pricing";
import Breadcrumbs from "./Breadcrumbs";
import AlternativeFaq from "./AlternativeFaq";
import AlternativeDeepDive from "./AlternativeDeepDive";

interface AlternativeComparisonTableProps {
  /** Display name of the competitor, e.g. "Jobscan". */
  competitorName: string;
  /** Their published price, verbatim and verified. Never invent a figure. */
  competitorPrice: string;
  /** Whether their paid plan auto-renews. */
  competitorAutoRenews: boolean;
  /** Their free tier, as verified (or "Not verified" when we have no source). */
  competitorFreeTier: string;
  /** Optional honesty/source note rendered beneath the table. */
  note?: string;
}

/**
 * Shared competitor comparison table for the /alternatives/* pages.
 *
 * Our price is derived from TIME_BASED_TIERS (the single source of truth that
 * also carries the Stripe price id) so the advertised number can never drift
 * from what Stripe actually charges. Competitor figures are passed in by each
 * page from the verified set in RESEARCH.md — no price is hardcoded here.
 *
 * This one component also emits the page's BreadcrumbList and FAQPage
 * structured data (with the visible breadcrumb + FAQ block), so every
 * /alternatives/* page gets consistent, server-rendered markup from one place.
 */
export default function AlternativeComparisonTable({
  competitorName,
  competitorPrice,
  competitorAutoRenews,
  competitorFreeTier,
  note,
}: AlternativeComparisonTableProps) {
  // Entry price = the cheapest tier we sell (currently the one-time Sprint Pass).
  const entryPrice = Math.min(...TIME_BASED_TIERS.map((t) => t.price));

  const rows: { feature: string; competitor: string; ours: string }[] = [
    {
      feature: "Price",
      competitor: competitorPrice,
      ours: `$${entryPrice.toFixed(2)} one-time`,
    },
    {
      feature: "Auto-renew",
      competitor: competitorAutoRenews ? "Yes" : "No",
      ours: "No",
    },
    {
      feature: "Free score",
      competitor: competitorFreeTier,
      ours: "Yes — free, no card",
    },
    {
      feature: `First ${FREE_RESUME_LIMIT} free`,
      competitor: "—",
      ours: "Yes",
    },
  ];

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Alternatives", href: "/alternatives" },
          { name: competitorName },
        ]}
      />

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          AI Resume Tailor vs {competitorName}
        </h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-xs sm:text-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-3">Feature</th>
                <th className="p-3 text-gray-500">{competitorName}</th>
                <th className="p-3 text-cyan-600 dark:text-cyan-400">
                  AI Resume Tailor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.map((row) => (
                <tr key={row.feature}>
                  <td className="p-3 font-medium">{row.feature}</td>
                  <td className="p-3 text-gray-500">{row.competitor}</td>
                  <td className="p-3 text-cyan-600 dark:text-cyan-400">
                    {row.ours}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {note && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{note}</p>
        )}
      </section>

      <AlternativeDeepDive competitorName={competitorName} />

      <AlternativeFaq
        competitorName={competitorName}
        competitorPrice={competitorPrice}
        competitorAutoRenews={competitorAutoRenews}
        competitorFreeTier={competitorFreeTier}
      />
    </>
  );
}
