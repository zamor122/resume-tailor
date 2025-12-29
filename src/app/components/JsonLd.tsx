import React from 'react';

const JsonLd: React.FC = () => {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "AI Resume Tailor",
    "description": "Free AI-powered resume tailoring tool with real-time relevancy scoring. Optimize your resume for ATS systems and match job descriptions with quantifiable results.",
    "url": "https://airesumetailor.com",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "softwareVersion": "2.0",
    "releaseNotes": "Latest version with AI-powered resume optimization and relevancy scoring",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "validFrom": "2024-01-01"
    },
    "featureList": [
      "Resume optimization for ATS systems",
      "Real-time relevancy scoring",
      "Job description matching",
      "Keyword optimization",
      "Formatting improvements",
      "Quantifiable improvement metrics",
      "AI-powered content analysis",
      "Multi-job comparison",
      "Resume version control",
      "Interview preparation tools"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "156",
      "bestRating": "5",
      "worstRating": "1"
    },
    "author": {
      "@type": "Organization",
      "name": "AI Resume Tailor",
      "url": "https://airesumetailor.com"
    }
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Resume Tailor",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "156",
      "bestRating": "5",
      "worstRating": "1"
    },
    "screenshot": "https://airesumetailor.com/og-image.jpg",
    "softwareVersion": "2.0"
  };
  
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AI Resume Tailor",
    "url": "https://airesumetailor.com",
    "logo": "https://airesumetailor.com/og-image.jpg",
    "description": "Free AI-powered resume optimization and ATS compatibility tool",
    "sameAs": [
      "https://twitter.com/airesumetailor"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "availableLanguage": ["English"]
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
};

export default JsonLd; 