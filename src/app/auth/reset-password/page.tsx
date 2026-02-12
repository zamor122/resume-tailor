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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Processing your reset link...</p>
        </div>
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-xl border border-gray-700 p-6 text-center">
          <div className="text-amber-400 mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-2">Reset link expired</h1>
          <p className="text-gray-400 mb-4">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-xl border border-gray-700 p-6 text-center">
          <div className="text-green-400 mb-4">✓</div>
          <h1 className="text-xl font-bold text-white mb-2">Password updated</h1>
          <p className="text-gray-400">Redirecting you to the app...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl border border-gray-700 p-6">
        <h1 className="text-xl font-bold text-white mb-2">Set new password</h1>
        <p className="text-gray-400 text-sm mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || authLoading || !user}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
