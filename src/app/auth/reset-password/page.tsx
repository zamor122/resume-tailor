"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/app/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [hasHash, setHasHash] = useState(false);

  useEffect(() => {
    setHasHash(typeof window !== "undefined" && window.location.hash.includes("type=recovery"));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !hasHash) {
      setInvalidLink(true);
    }
  }, [authLoading, user, hasHash]);

  // If hash present but no session after processing, token may be expired
  useEffect(() => {
    if (!hasHash || user) return;
    const t = setTimeout(() => setInvalidLink(true), 5000);
    return () => clearTimeout(t);
  }, [hasHash, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Processing recovery link (hash present, waiting for session)
  if (hasHash && !user && !authLoading && !invalidLink) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C2028] mx-auto mb-4"></div>
          <p className="text-gray-700 font-mono text-xs">PROCESSING SECURE RESET LINK...</p>
        </div>
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-6 sm:p-8 text-center text-[#1C2028]">
          <div className="text-amber-500 mb-3 text-2xl">⚠️</div>
          <h1 className="text-xl font-mono font-extrabold text-[#1C2028] mb-2">RESET LINK EXPIRED</h1>
          <p className="text-gray-700 font-mono text-xs mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/"
            className="neo-btn inline-block px-5 py-2.5 rounded-lg bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] font-mono font-bold text-xs uppercase"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-6 sm:p-8 text-center text-[#1C2028]">
          <div className="text-emerald-500 mb-3 text-2xl">✓</div>
          <h1 className="text-xl font-mono font-extrabold text-[#1C2028] mb-2">PASSWORD UPDATED</h1>
          <p className="text-gray-700 font-mono text-xs">Redirecting to console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
      <div className="max-w-md w-full neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-6 sm:p-8 text-[#1C2028]">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 neo-tag bg-[#FF5722] text-white text-[10px] px-2 py-0.5 font-mono font-bold uppercase mb-2">
            <span>🔐</span>
            <span>CREDENTIAL REKEY</span>
          </div>
          <h1 className="text-2xl font-mono font-extrabold text-[#1C2028]">SET NEW PASSWORD</h1>
          <p className="text-gray-700 text-xs font-mono mt-1">
            Enter your new password below to secure your operator profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-mono font-bold text-[#1C2028] uppercase mb-1">
              NEW PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#1C2028] text-xs font-mono text-[#1C2028] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-xs font-mono font-bold text-[#1C2028] uppercase mb-1">
              CONFIRM PASSWORD
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#1C2028] text-xs font-mono text-[#1C2028] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FEE2E2] border-2 border-[#EF4444] neo-box-sm shadow-none">
              <p className="text-xs font-mono font-bold text-[#991B1B]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || authLoading || !user}
            className="neo-btn w-full py-3 px-4 rounded-lg bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link href="/" className="text-xs font-mono font-bold text-[#FF5722] hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
