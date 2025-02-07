import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {Analytics} from "@vercel/analytics/next";
import Link from 'next/link';
import Footer from './components/Footer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Resume Tailor - Free ATS Resume Optimization Tool",
  description: "Free AI-powered resume tailoring tool. Optimize your resume for ATS systems, match job descriptions instantly, and increase interview chances. No sign-up required, no data stored. Perfect for job seekers, career changers, and professionals.",
  keywords: [
    "resume tailoring",
    "ATS resume optimizer",
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
    "applicant tracking system"
  ].join(', '),
  openGraph: {
    title: "AI Resume Tailor - Free ATS Resume Optimization Tool",
    description: "Free AI resume tool that optimizes your resume for ATS systems and job descriptions. Get more interviews with perfectly tailored applications. No sign-up needed.",
    type: "website",
    locale: "en_US",
    siteName: "AI Resume Tailor",
    url: "https://airesumetailor.com",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AI Resume Tailor - ATS Resume Optimization Tool",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300 min-h-screen flex flex-col`}
      >
        <Navbar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full flex justify-between items-center px-6 sm:px-10 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-md z-50">
      <Link 
        href="/" 
        className="text-lg font-bold tracking-wide text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200"
      >
        ai resume tailor
      </Link>
    </nav>
  );
}