"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link 
            href="/" 
            className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text"
          >
            AI Resume Tailor
          </Link>
          
          <div className="flex gap-6">
            <Link 
              href="/" 
              className={`transition-colors ${
                pathname === '/' 
                  ? 'text-green-500 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-500'
              }`}
            >
              Resume Tailor
            </Link>
            <Link 
              href="/jobs" 
              className={`transition-colors ${
                pathname === '/jobs' 
                  ? 'text-green-500 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-green-500'
              }`}
            >
              Job Search
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 