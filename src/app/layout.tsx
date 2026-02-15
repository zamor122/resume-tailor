import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {Analytics} from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from './components/Footer';
import Navigation from "./components/Navigation";
import { ThemeProvider } from './components/ThemeProvider'
import { AuthProvider } from './contexts/AuthContext';
import UmamiVerifier from './components/UmamiVerifier';
import Script from "next/script";
import { RootStructuredData } from './components/StructuredData';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://airesumetailor.com'),
  title: {
    default: "AI Resume Tailor - Free Job Match Optimization with Relevancy Scoring",
    template: "%s | AI Resume Tailor"
  },
  description: "Free AI-powered resume tailoring tool with real-time relevancy scoring. Sign in for free to get started—your first 3 tailored resumes are free. Tailor your resume for each job so recruiters see the right match in seconds. No credit card required.",
  keywords: [
    "resume tailoring",
    "job match optimizer",
    "resume relevancy score",
    "job application tool",
    "resume builder",
    "free resume tool",
    "AI resume writer",
    "resume keyword optimization",
    "job description matcher",
    "resume scanner",
    "recruiter-friendly resume",
    "resume formatting tool",
    "job application helper",
    "resume keywords",
    "resume optimization",
    "career change resume",
    "professional resume builder",
    "resume improvement tool",
    "job search helper",
    "resume customization",
    "job-specific resume",
    "resume effectiveness measurement",
    "resume match percentage",
    "free resume analyzer",
    "resume checker",
    "resume score calculator",
    "job application optimizer",
    "resume AI tool",
    "ATS resume checker",
    "free alternative to Jobscan",
    "resume matcher",
    "job posting matcher"
  ],
  applicationName: "AI Resume Tailor",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "AI Resume Tailor - Free Job Match Optimization with Relevancy Scoring",
    description: "Free AI resume tool that tailors your resume for each job with real-time relevancy scoring. Your first 3 tailored resumes are free. See exactly how your resume matches job descriptions. Get more interviews with perfectly tailored applications.",
    type: "website",
    locale: "en_US",
    alternateLocale: ["en_GB", "en_CA", "en_AU"],
    siteName: "AI Resume Tailor",
    url: "https://airesumetailor.com",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AI Resume Tailor - Job Match Optimization Tool with Relevancy Scoring",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Resume Tailor - Free Job Match Optimization Tool",
    description: "Free AI resume tool that tailors your resume for each job and job description. Your first 3 tailored resumes are free. Get more interviews with perfectly tailored applications.",
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
  ...(process.env.GOOGLE_SITE_VERIFICATION && {
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
    other: { "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION },
  }),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Resume Tailor",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <RootStructuredData />
        <Script 
          id="umami-analytics"
          src="https://cloud.umami.is/script.js" 
          data-website-id="96fc4b45-d8c8-4941-8a4f-330723725623"
          strategy="afterInteractive"
        />
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5839711747501766"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <ThemeProvider>
          <AuthProvider>
          <UmamiVerifier />
          <div className="glass-background" />
          <Navigation />
          <main className="flex-grow pt-2 relative" role="main">
            {children}
          </main>
          <Footer />
          <Analytics />
          <SpeedInsights />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}