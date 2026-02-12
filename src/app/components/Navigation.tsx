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
      className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-medium"
      title={`${accessInfo.tierLabel || 'Access'} - ${formatRemainingTime(accessInfo.expiresAt)}`}
    >
      <span className="hidden sm:inline">Active</span>
      <span className="text-emerald-300">{formatRemainingTime(accessInfo.expiresAt)}</span>
    </div>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navBackground = 'backdrop-blur-md bg-gray-900/30 border-gray-800';

  if (!mounted) {
    return <nav className="h-16 backdrop-blur-md bg-transparent"></nav>;
  }

  return (
    <nav className={`sticky top-0 z-50 ${navBackground} border-b shadow-sm transition-all duration-300`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link 
            href="/" 
            className="text-xl font-bold inline-flex items-center gap-2 transition-all"
          >
            <span className="text-2xl" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>🙋‍♀️</span>
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text hover:from-purple-500 hover:to-blue-400 transition-all">
              AI Resume Tailor
            </span>
          </Link>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <AccessBadge />
            <Link 
              href="/" 
              className={`transition-colors ${
                pathname === '/' 
                  ? 'text-green-500 font-medium' 
                  : 'text-gray-300 hover:text-green-500'
              }`}
            >
              Resume Tailor
            </Link>
            <Link 
              href="/profile" 
              className={`transition-colors ${
                pathname === '/profile' 
                  ? 'text-green-500 font-medium' 
                  : 'text-gray-300 hover:text-green-500'
              }`}
            >
              Profile
            </Link>
            <Link 
              href="/faq" 
              className={`transition-colors ${
                pathname === '/faq' 
                  ? 'text-green-500 font-medium' 
                  : 'text-gray-300 hover:text-green-500'
              }`}
            >
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 