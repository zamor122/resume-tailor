import React from 'react';

const JsonLd: React.FC = () => {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "AI Resume Tailor",
    "description": "Free AI-powered resume tailoring tool with real-time relevancy scoring. Optimize your resume for ATS systems and match job descriptions with quantifiable results.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Resume optimization for ATS systems",
      "Real-time relevancy scoring",
      "Job description matching",
      "Keyword optimization",
      "Formatting improvements",
      "Quantifiable improvement metrics"
    ]
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Resume Tailor",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "156"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does the resume relevancy score work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI analyzes your resume against the job description to calculate a relevancy percentage. After tailoring, you'll see both your original and new scores, showing exactly how much your resume has improved."
        }
      },
      {
        "@type": "Question",
        "name": "Is AI Resume Tailor free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, AI Resume Tailor is completely free to use with no hidden fees or subscriptions. We don't even require you to create an account."
        }
      },
      {
        "@type": "Question",
        "name": "Does AI Resume Tailor store my resume data?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No, we don't store your resume or job description data. All processing happens in real-time and your information is discarded after the tailoring is complete."
        }
      },
      {
        "@type": "Question",
        "name": "How accurate is the relevancy scoring?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our relevancy scoring uses advanced AI to simulate how ATS systems evaluate resumes. While no system can perfectly predict every ATS, our scoring provides a reliable benchmark for improvement."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
};

export default JsonLd; 