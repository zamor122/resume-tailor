/**
 * JSON-LD structured data for SEO (schema.org).
 * Injected into layout/pages for rich results in search.
 */
const BASE_URL = "https://airesumetailor.com";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AI Resume Tailor",
  url: BASE_URL,
  logo: `${BASE_URL}/icon-512.png`,
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AI Resume Tailor",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: BASE_URL,
  description:
    "Free AI-powered resume tailoring tool with real-time relevancy scoring. Tailor your resume for each job so recruiters see the right match in seconds. Your first 3 tailored resumes are free.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI resume tailoring",
    "Job description matcher",
    "ATS resume optimization",
    "Relevancy scoring",
    "Human-sounding output",
  ],
};

export function RootStructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
    </>
  );
}

interface FAQItem {
  q: string;
  a: string;
}

export function FAQStructuredData({ items }: { items: FAQItem[] }) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqSchema),
      }}
    />
  );
}
