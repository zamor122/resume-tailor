import React from 'react';

interface JobSchemaProps {
  title: string;
  description: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization?: string;
  jobLocation?: string;
  applicantLocationRequirements?: string;
  jobLocationType?: string;
  baseSalary?: {
    currency: string;
    value: number | [number, number];
    unitText: string;
  };
}

const JobSchema: React.FC<JobSchemaProps> = ({
  title,
  description,
  datePosted = new Date().toISOString(),
  validThrough,
  employmentType = "FULL_TIME",
  hiringOrganization = "Example Organization",
  jobLocation = "Remote",
  applicantLocationRequirements = "US",
  jobLocationType = "TELECOMMUTE",
  baseSalary,
}) => {
  const schema = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title,
    description,
    datePosted,
    ...(validThrough && { validThrough }),
    employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: hiringOrganization,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: jobLocation,
      },
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: applicantLocationRequirements,
    },
    jobLocationType,
    ...(baseSalary && {
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: baseSalary.currency,
        value: {
          "@type": "QuantitativeValue",
          value: baseSalary.value,
          unitText: baseSalary.unitText,
        },
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default JobSchema; 