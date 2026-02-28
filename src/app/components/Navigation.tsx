"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAccessInfo, formatRemainingTime } from '@/app/utils/accessManager';

function AccessBadge() {
  const { user } = useAuth();
  const [accessInfo, setAccessInfo] = useState<{ hasAccess: boolean; expiresAt: Date | null; tierLabel: string | null } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAccessInfo(null);
      return;
    }
    getAccessInfo(user.id).then((info) => {
      if (info) {
        setAccessInfo({
          hasAccess: info.hasAccess && !info.isExpired,
          expiresAt: info.expiresAt,
          tierLabel: info.tierLabel,
        });
      } else {
        setAccessInfo(null);
      }
    });
  }, [user?.id]);

  if (!accessInfo?.hasAccess || !accessInfo.expiresAt) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-500/50 text-emerald-400 text-xs font-medium shrink-0"
      title={`${accessInfo.tierLabel || 'Access'} - ${formatRemainingTime(accessInfo.expiresAt)}`}
    >
      <span className="hidden sm:inline">Active</span>
      <span className="text-emerald-300 font-medium">{formatRemainingTime(accessInfo.expiresAt)}</span>
    </div>
  );
}

const navLinks = [
  { href: '/', label: 'Resume Tailor' },
  { href: '/profile', label: 'Profile' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navBackground = 'backdrop-blur-md bg-gray-900/30 border-gray-800';

  if (!mounted) {
    return <nav className="h-16 backdrop-blur-md bg-transparent"></nav>;
  }

  return (
    <nav className={`sticky top-0 z-50 ${navBackground} border-b shadow-sm transition-all duration-300`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center gap-3">
          <Link
            href="/"
            className="text-xl font-bold inline-flex items-center gap-2 transition-all"
            title="AI Resume Tailor"
          >
            <span className="text-2xl" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>🙋‍♀️</span>
            <span className="hidden md:inline bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text hover:from-purple-500 hover:to-blue-400 transition-all">
              AI Resume Tailor
            </span>
          </Link>

          {/* Mobile: AccessBadge prominent, then hamburger */}
          <div className="flex items-center gap-2 md:gap-6 flex-1 justify-end">
            <AccessBadge />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="hidden md:flex items-center gap-4">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`transition-colors ${
                    (href === '/' ? pathname === '/' : pathname?.startsWith(href))
                      ? 'text-green-500 font-medium'
                      : 'text-gray-300 hover:text-green-500'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-700">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text hover:from-purple-500 hover:to-blue-400"
            >
              AI Resume Tailor
            </Link>
            <div className="flex flex-col gap-1 mt-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    (href === '/' ? pathname === '/' : pathname?.startsWith(href))
                      ? 'text-green-500 font-medium bg-gray-800/50'
                      : 'text-gray-300 hover:text-green-500 hover:bg-gray-800/50'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 