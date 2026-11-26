import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FutureproofClient from "../FutureproofClient";
import { FUTUREPROOF_VARIANTS } from "@/app/config/futureproofVariants";
import { AI_TOOL_REGISTRY } from "@/app/config/aiToolRegistry";
import type { IndustryCategory } from "@/app/config/domainTaxonomy";
import { safeJsonLd } from "@/app/utils/safeJsonLd";
import {
  BreadcrumbListStructuredData,
  FAQStructuredData,
} from "@/app/components/StructuredData";

const ROLE_TO_INDUSTRY: Record<string, IndustryCategory> = {
  doctor: "healthcare",
  nurse: "healthcare",
  admin: "general_business",
  finance: "finance_accounting",
  legal: "legal_compliance",
  teacher: "education_coaching",
  sales: "sales_marketing",
  trades: "trades_facilities",
};

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  doctor: "Physicians & Clinicians",
  nurse: "Nurses & Care Teams",
  admin: "Administrative & Executive Assistants",
  finance: "Finance & Accounting Professionals",
  legal: "Attorneys & Paralegals",
  teacher: "Teachers & Educators",
  sales: "Sales & Marketing Professionals",
  trades: "Trades & Field Operations",
};

export function generateStaticParams() {
  return Object.keys(FUTUREPROOF_VARIANTS).map((role) => ({ role }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const variant = FUTUREPROOF_VARIANTS[role];
  if (!variant) return { title: "Futureproof — AI Resume Experience" };

  const roleName = ROLE_DISPLAY_NAMES[role] || variant.badge;
  const url = `https://airesumetailor.com/futureproof/${role}`;

  return {
    title: `${variant.headline} | Futureproof`,
    description: variant.subheadline,
    alternates: { canonical: url },
    openGraph: {
      title: `${variant.headline} — Futureproof`,
      description: variant.subheadline,
      url,
      type: "website",
      siteName: "AI Resume Tailor",
    },
    keywords: [
      `add AI experience to ${role} resume`,
      `AI tools for ${roleName.toLowerCase()} resume`,
      `${role} AI skills resume examples`,
      "Futureproof AI Resume Tailor",
    ],
  };
}

export default async function FutureproofRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const variant = FUTUREPROOF_VARIANTS[role];
  if (!variant) {
    notFound();
  }

  const industry = ROLE_TO_INDUSTRY[role] || "general_business";
  const roleName = ROLE_DISPLAY_NAMES[role] || variant.badge;
  const domainTools = AI_TOOL_REGISTRY.filter((t) => t.category === industry);

  const faqItems = [
    {
      q: `What real AI tools should ${roleName.toLowerCase()} list on a resume in 2026?`,
      a: `Skip generic "ChatGPT" clichés. Hiring managers look for real, industry-standard tools such as ${domainTools
        .slice(0, 3)
        .map((t) => t.name)
        .join(", ")} tied directly to responsibilities already on your resume.`,
    },
    {
      q: `How do I add AI experience if I haven't formally used AI at work yet?`,
      a: `Futureproof analyzes your existing work history, matches verified ${roleName.toLowerCase()} AI tools to your daily workflows, protects your timeline (never placing 2023+ tools on older roles), and gives you plain-English 30-second interview scripts.`,
    },
    {
      q: `Does Futureproof require a monthly subscription?`,
      a: `No. You can analyze your resume and view 2 full before/after AI bullet upgrades for free, then unlock the full merged resume and interview scripts with a one-time pass starting at $9 (never auto-renews).`,
    },
  ];

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Futureproof for ${roleName}`,
    url: `https://airesumetailor.com/futureproof/${role}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: variant.subheadline,
  };

  const otherRoles = Object.keys(FUTUREPROOF_VARIANTS).filter((r) => r !== role);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(appSchema) }}
      />
      <BreadcrumbListStructuredData
        items={[
          { name: "Home", item: "https://airesumetailor.com" },
          { name: "Futureproof", item: "https://airesumetailor.com/futureproof" },
          { name: roleName, item: `https://airesumetailor.com/futureproof/${role}` },
        ]}
      />
      <FAQStructuredData items={faqItems} />

      <FutureproofClient initialRole={role} />

      {/* Server-Rendered SEO Content: Verified Industry AI Tool Guide + FAQs */}
      <section className="bg-[#FAF7F0] text-[#1C2028] pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-10 border-t-2 border-[#1C2028]/15 pt-10">
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-mono font-extrabold">
              Industry-Standard AI Tools for {roleName}
            </h2>
            <p className="text-sm sm:text-base font-sans text-[#374151] leading-relaxed">
              Every tool below is a real, widely adopted platform used by {roleName.toLowerCase()}.
              Futureproof anchors these tools directly to responsibilities already on your resume so
              recruiters see coherent, credible AI fluency.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {domainTools.map((tool) => (
                <article
                  key={tool.id}
                  className="neo-box bg-white p-4 border-2 border-[#1C2028] rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-mono font-extrabold text-sm text-[#1C2028]">
                      {tool.name}
                    </h3>
                    <span className="text-[11px] font-mono text-[#4B5563]">
                      {tool.complianceBadges[0] || tool.vendor}
                    </span>
                  </div>
                  <p className="text-sm font-sans text-[#374151] leading-relaxed">
                    {tool.shortDescription}
                  </p>
                  <p className="text-xs font-sans text-[#065F46] bg-[#ECFDF5] p-2.5 rounded-lg border border-[#10B981]/40">
                    <strong className="font-mono uppercase text-[10px] block mb-0.5">
                      Example Resume Phrasing:
                    </strong>
                    {tool.examplePhrasing}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-mono font-extrabold">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqItems.map((item) => (
                <div
                  key={item.q}
                  className="neo-box bg-white p-4 border-2 border-[#1C2028] rounded-xl space-y-1.5"
                >
                  <h3 className="font-mono font-bold text-sm text-[#1C2028]">{item.q}</h3>
                  <p className="text-sm font-sans text-[#374151] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#4B5563]">
              Explore Futureproof for Other Professions
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherRoles.map((r) => (
                <Link
                  key={r}
                  href={`/futureproof/${r}`}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#1C2028] font-mono text-xs font-bold text-[#1C2028] hover:bg-[#FF5722] hover:text-white transition-colors"
                >
                  {ROLE_DISPLAY_NAMES[r] || r}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
