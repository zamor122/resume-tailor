"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for a link to reset your password.");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
      <div className="max-w-md w-full neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-6 sm:p-8 text-[#1C2028]">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 neo-tag bg-[#FF5722] text-white text-[10px] px-2 py-0.5 font-mono font-bold uppercase mb-2">
            <span>🔑</span>
            <span>ACCOUNT RECOVERY</span>
          </div>
          <h1 className="text-2xl font-mono font-extrabold text-[#1C2028]">RESET PASSWORD</h1>
          <p className="text-gray-700 text-xs font-mono mt-1">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-mono font-bold text-[#1C2028] uppercase mb-1">
              EMAIL ADDRESS
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#1C2028] text-xs font-mono text-[#1C2028] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FEE2E2] border-2 border-[#EF4444] neo-box-sm shadow-none">
              <p className="text-xs font-mono font-bold text-[#991B1B]">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg bg-[#ECFDF5] border-2 border-[#10B981] neo-box-sm shadow-none">
              <p className="text-xs font-mono font-bold text-[#065F46]">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn w-full py-3 px-4 rounded-lg bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "TRANSMITTING..." : "SEND RESET LINK"}
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
