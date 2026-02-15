"use client"

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-6 mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-4">
          {/* Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link 
              href="/faq" 
              className="text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
            >
              FAQ
            </Link>
            <Link 
              href="/blog" 
              className="text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
            >
              Blog
            </Link>
            <Link 
              href="/resume-optimizer" 
              className="text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
            >
              Resume Optimizer
            </Link>
            <Link 
              href="/alternatives/jobscan" 
              className="text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
            >
              Alternatives
            </Link>
            <Link 
              href="/privacy" 
              className="text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <a 
              href="mailto:hello@airesumetailor.com" 
              className="text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
            >
              Say Hi 👋
            </a>
          </div>

          {/* Disclaimer and Copyright combined */}
          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            <p className="inline">No data stored. Review results before use.</p>
            <span className="mx-2">•</span>
            <p className="inline">© {currentYear} AI Resume Tailor</p>
          </div>
        </div>
      </div>
    </footer>
  );
} 