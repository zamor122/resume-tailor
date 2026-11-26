import type { Metadata } from "next";
import Link from "next/link";
import FutureproofClient from "./FutureproofClient";
import { safeJsonLd } from "@/app/utils/safeJsonLd";
import {
  BreadcrumbListStructuredData,
  FAQStructuredData,
} from "@/app/components/StructuredData";

export const metadata: Metadata = {
  title: "Futureproof — Add Real, Industry-Standard AI Experience to Your Resume",
  description:
    "Haven't formally used AI at work? Futureproof matches real, industry-standard AI tools (like HIPAA-compliant clinical scribes or Claude Enterprise) to your exact job history—plus 30-second interview scripts.",
  alternates: {
    canonical: "https://airesumetailor.com/futureproof",
  },
  openGraph: {
    title: "Futureproof — Add Real AI Experience to Your Resume",
    description:
      "Match real, industry-standard AI tools to your work history and generate coherent, interview-ready resume upgrades in 30 seconds.",
    url: "https://airesumetailor.com/futureproof",
    type: "website",
    siteName: "AI Resume Tailor",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Futureproof by AI Resume Tailor",
  url: "https://futureproof.airesumetailor.com",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Standalone AI Experience Builder that matches real, industry-standard AI tools to your profession and weaves coherent, interview-ready AI usage into your resume.",
};

const ROLE_HUBS = [
  { slug: "doctor", label: "Physicians & Clinicians (HIPAA AI)" },
  { slug: "nurse", label: "Nurses & Care Teams" },
  { slug: "admin", label: "Admin & Executive Assistants" },
  { slug: "finance", label: "Finance & Accounting" },
  { slug: "legal", label: "Attorneys & Paralegals" },
  { slug: "teacher", label: "Teachers & Educators (FERPA AI)" },
  { slug: "sales", label: "Sales & Marketing" },
  { slug: "trades", label: "Trades & Field Operations" },
];

const FUTUREPROOF_FAQS = [
  {
    q: "How do I add AI experience to my resume if I haven't used AI at work?",
    a: "Futureproof analyzes your existing job history and matches real, widely adopted AI tools for your exact profession (such as HIPAA-compliant ambient scribes for doctors or Claude Enterprise & Microsoft 365 Copilot for admins), weaving them naturally into your real duties alongside 30-second interview scripts.",
  },
  {
    q: "Will Futureproof put 2025 AI tools on older pre-2023 jobs?",
    a: "No. Futureproof includes automatic timeline protection: modern AI tools are only woven into recent roles (2023–Present), or placed cleanly into a dedicated Modern AI Workflows section if your listed roles are older.",
  },
  {
    q: "Is Futureproof free to try, and does it require a subscription?",
    a: "Yes — analyzing your resume, discovering your industry-standard AI tools, and viewing your first 2 before/after bullet upgrades is free with no credit card. Full exports and interview scripts unlock with a one-time AI Resume Tailor pass starting at $9 (zero subscriptions).",
  },
];

export default function FutureproofPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(softwareSchema) }}
      />
      <BreadcrumbListStructuredData
        items={[
          { name: "Home", item: "https://airesumetailor.com" },
          { name: "Futureproof AI Experience Builder", item: "https://airesumetailor.com/futureproof" },
        ]}
      />
      <FAQStructuredData items={FUTUREPROOF_FAQS} />

      <FutureproofClient />

      {/* Server-rendered SEO guide & role directory for crawlers and visitors */}
      <section className="bg-[#FAF7F0] text-[#1C2028] pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-10 border-t-2 border-[#1C2028]/15 pt-10">
          <div className="space-y-3">
            <h2 className="text-xl font-mono font-extrabold">
              AI Experience Guides by Profession
            </h2>
            <p className="text-sm sm:text-base font-sans text-[#374151] leading-relaxed">
              Generic &ldquo;ChatGPT&rdquo; bullets get ignored by recruiters. Explore verified,
              industry-standard AI tools matched to your specific career:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLE_HUBS.map((hub) => (
                <Link
                  key={hub.slug}
                  href={`/futureproof/${hub.slug}`}
                  className="px-4 py-3 rounded-xl bg-white border-2 border-[#1C2028] font-mono text-xs sm:text-sm font-bold text-[#1C2028] hover:bg-[#FFF4EF] hover:border-[#FF5722] transition-colors flex items-center justify-between"
                >
                  <span>{hub.label}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-mono font-extrabold">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FUTUREPROOF_FAQS.map((item) => (
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
        </div>
      </section>
    </>
  );
}
