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
    "Free AI-powered resume tailoring tool with LangGraph agent intelligence and real-time relevancy scoring. Tailor your resume for each job in under 4 seconds. Your first 3 tailored resumes are free.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "LangGraph AI resume tailoring agent",
    "Job description matcher & live job discovery",
    "Controlling levers: Minimal polish to complete experience overhaul",
    "Smart metrics and impact placeholder generator",
    "Free ATS resume checker & score scanner",
    "Human-sounding output with zero formatting drift",
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

export function BlogArticleStructuredData({
  title,
  description,
  slug,
  publishedAt,
  modifiedAt,
}: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  modifiedAt?: string;
}) {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `${BASE_URL}/blog/${slug}`,
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    author: {
      "@type": "Organization",
      name: "AI Resume Tailor",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "AI Resume Tailor",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
    />
  );
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

export function HowToStructuredData({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}) {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: step.name,
      text: step.text,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(howToSchema),
      }}
    />
  );
}
