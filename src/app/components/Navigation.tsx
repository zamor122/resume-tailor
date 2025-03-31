"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useEffect, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Use useEffect to handle client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleTheme = () => {
    console.log("Current theme before toggle:", theme);
    toggleTheme();
    // Log current classes after toggle
    setTimeout(() => {
      console.log("Current HTML classes after toggle:", document.documentElement.className);
    }, 100);
  };

  // Force the correct background based on current theme
  const navBackground = theme === 'dark' 
    ? 'backdrop-blur-md bg-gray-900/30 border-gray-800' 
    : 'backdrop-blur-md bg-white/30 border-gray-200';

  // Don't render with correct theme data until component is mounted
  if (!mounted) {
    return <nav className="h-16 backdrop-blur-md bg-transparent"></nav>;
  }

  return (
    <nav className={`sticky top-0 z-50 ${navBackground} border-b shadow-sm transition-all duration-300`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link 
            href="/" 
            className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text"
          >
            AI Resume Tailor
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className={`transition-colors ${
                pathname === '/' 
                  ? 'text-green-500 font-medium' 
                  : theme === 'dark' ? 'text-gray-300 hover:text-green-500' : 'text-gray-600 hover:text-green-500'
              }`}
            >
              Resume Tailor
            </Link>
            <Link 
              href="/jobs" 
              className={`transition-colors ${
                pathname === '/jobs' 
                  ? 'text-green-500 font-medium' 
                  : theme === 'dark' ? 'text-gray-300 hover:text-green-500' : 'text-gray-600 hover:text-green-500'
              }`}
            >
              Job Search
            </Link>
            <Link 
              href="/faq" 
              className={`transition-colors ${
                pathname === '/faq' 
                  ? 'text-green-500 font-medium' 
                  : theme === 'dark' ? 'text-gray-300 hover:text-green-500' : 'text-gray-600 hover:text-green-500'
              }`}
            >
              FAQ
            </Link>
            <button
              onClick={handleToggleTheme}
              className={`p-2 rounded-lg transition-colors backdrop-blur-sm ${
                theme === 'dark' 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80' 
                  : 'bg-gray-100/80 hover:bg-gray-200/80'
              }`}
              aria-label="Toggle theme"
              type="button"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 