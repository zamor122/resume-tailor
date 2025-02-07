export default function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "AI Resume Tailor",
    "url": "https://airesumetailor.com",
    "description": "Free AI-powered resume tailoring tool. Instantly customize your resume for any job description.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "AI-powered resume optimization",
      "ATS-friendly formatting",
      "No sign-up required",
      "Instant results",
      "No data storage"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
} 