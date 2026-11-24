import type { Metadata } from "next";
import FutureproofClient from "./FutureproofClient";
import { safeJsonLd } from "@/app/utils/safeJsonLd";

export const metadata: Metadata = {
  title: "Futureproof — Add Real, Industry-Standard AI Experience to Your Resume",
  description:
    "Haven't formally used AI at work? Futureproof matches real, industry-standard AI tools (like HIPAA-compliant clinical scribes or Claude Enterprise) to your exact job history—plus interview talking points.",
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

export default function FutureproofPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(softwareSchema) }}
      />
      <FutureproofClient />
    </>
  );
}
