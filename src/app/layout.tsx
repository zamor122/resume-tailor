import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {Analytics} from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from './components/Footer';
import Navigation from "./components/Navigation";
import { ThemeProvider } from './components/ThemeProvider'
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Resume Tailor - Free ATS Resume Optimization with Relevancy Scoring",
  description: "Free AI-powered resume tailoring tool with real-time relevancy scoring. Optimize your resume for ATS systems, match job descriptions with quantifiable results, and increase interview chances by up to 60%. No sign-up required, no data stored.",
  keywords: [
    "resume tailoring",
    "ATS resume optimizer",
    "resume relevancy score",
    "job application tool",
    "resume builder",
    "free resume tool",
    "AI resume writer",
    "resume keyword optimization",
    "job description matcher",
    "resume scanner",
    "ATS friendly resume",
    "resume formatting tool",
    "job application helper",
    "resume keywords",
    "resume optimization",
    "career change resume",
    "professional resume builder",
    "resume improvement tool",
    "job search helper",
    "resume customization",
    "applicant tracking system",
    "job-specific resume",
    "resume effectiveness measurement",
    "resume match percentage"
  ].join(', '),
  openGraph: {
    title: "AI Resume Tailor - Free ATS Resume Optimization with Relevancy Scoring",
    description: "Free AI resume tool that optimizes your resume for ATS systems with real-time relevancy scoring. See exactly how your resume matches job descriptions with quantifiable metrics. Get more interviews with perfectly tailored applications. No sign-up needed.",
    type: "website",
    locale: "en_US",
    siteName: "AI Resume Tailor",
    url: "https://airesumetailor.com",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AI Resume Tailor - ATS Resume Optimization Tool with Relevancy Scoring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Resume Tailor - Free ATS Resume Optimization Tool",
    description: "Free AI resume tool that optimizes your resume for ATS systems and job descriptions. Get more interviews with perfectly tailored applications. No sign-up needed.",
    site: "@airesumetailor",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://airesumetailor.com",
  },
  authors: [{ name: "AI Resume Tailor" }],
  category: "Career Tools",
  classification: "Resume Builder",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-site-verification", // Add your verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <Script 
          src="https://cloud.umami.is/script.js" 
          data-website-id="96fc4b45-d8c8-4941-8a4f-330723725623"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <div className="glass-background" />
          <Navigation />
          <main className="flex-grow pt-2">
            {children}
          </main>
          <Footer />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}