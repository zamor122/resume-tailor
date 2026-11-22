"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { useGamification } from "@/app/contexts/GamificationContext";
import { FREE_RESUME_LIMIT, FREE_AUDIT_LIMIT } from "@/app/config/pricing";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "signin" | "signup";
  title?: string;
  description?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  mode: initialMode = "signin",
  title,
  description,
}: AuthModalProps) {
  const { signIn, signUp, signInWithOAuth, resetPassword, user } = useAuth();
  const { playSfx } = useGamification();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      onSuccess?.();
      handleClose();
    }
  }, [user, isOpen, onSuccess]);

  const handleClose = () => {
    playSfx("boop");
    setEmail("");
    setPassword("");
    setError(null);
    setMessage(null);
    setMode(initialMode);
    onClose();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    playSfx("click");
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
        playSfx("alert");
      } else {
        setMessage("Check your email for a link to reset your password.");
        playSfx("success");
      }
    } catch {
      setError("An unexpected error occurred");
      playSfx("alert");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    playSfx("click");
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
          playSfx("alert");
        } else {
          setMessage("Check your email to confirm your account!");
          playSfx("success");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
          playSfx("alert");
        } else {
          playSfx("success");
        }
      }
    } catch {
      setError("An unexpected error occurred");
      playSfx("alert");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google") => {
    playSfx("click");
    setLoading(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch {
      setError("An unexpected error occurred");
      playSfx("alert");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-md neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl text-[#1C2028]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-sm border border-[#1C2028] bg-white hover:bg-[#F4F1EA] text-[#1C2028] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6 sm:p-7">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="neo-tag bg-[#FF5722] text-white text-[9px] px-2 py-0.5 font-mono font-bold uppercase">
                AUTHENTICATION
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                {FREE_AUDIT_LIMIT} FREE AUDITS INCLUDED
              </span>
            </div>
            <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028]">
              {title ||
                (mode === "forgot"
                  ? "Reset Password"
                  : mode === "signup"
                    ? "Create Account"
                    : "Sign In")}
            </h2>
            <p className="text-gray-600 text-xs font-mono mt-1 leading-relaxed">
              {description ||
                (mode === "forgot"
                  ? "Enter your email and we'll dispatch a secure recovery link."
                  : mode === "signup"
                    ? FREE_RESUME_LIMIT > 0
                      ? `Your first ${FREE_RESUME_LIMIT} tailored resume is 100% free. No card needed.`
                      : `Run ${FREE_AUDIT_LIMIT} free ATS audits & bullet previews. No card needed.`
                    : "Sign in to access your saved resumes and tailored documents.")}
            </p>
          </div>

          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="neo-btn w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white text-[#1C2028] font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1C2028]/20"></div>
            </div>
            <div className="relative flex justify-center text-xs font-mono">
              <span className="px-2 bg-[#FAF7F0] text-gray-500 font-bold uppercase">Or with email</span>
            </div>
          </div>

          {/* Forgot Password Form */}
          {mode === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-mono font-bold text-[#1C2028] mb-1">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-white border-2 border-[#1C2028] text-[#1C2028] placeholder-gray-400 font-mono text-xs shadow-[2px_2px_0px_#1C2028] focus:outline-none focus:ring-0"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-100 border-2 border-red-500 text-red-700 font-mono text-xs font-bold">
                  {error}
                </div>
              )}

              {message && (
                <div className="p-2.5 rounded-lg bg-emerald-100 border-2 border-[#10B981] text-emerald-800 font-mono text-xs font-bold">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="neo-btn w-full px-4 py-2.5 rounded-lg bg-[#FF5722] hover:bg-[#E64A19] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "DISPATCHING..." : "SEND RECOVERY LINK"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs font-mono font-bold text-[#1C2028] hover:text-[#FF5722] underline"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Email/Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                <div>
                  <label htmlFor="email" className="block text-xs font-mono font-bold text-[#1C2028] mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-[#1C2028] text-[#1C2028] placeholder-gray-400 font-mono text-xs shadow-[2px_2px_0px_#1C2028] focus:outline-none focus:ring-0"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="text-xs font-mono font-bold text-[#1C2028]">
                      Password
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[11px] font-mono font-bold text-gray-500 hover:text-[#1C2028] underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 rounded-lg bg-white border-2 border-[#1C2028] text-[#1C2028] placeholder-gray-400 font-mono text-xs shadow-[2px_2px_0px_#1C2028] focus:outline-none focus:ring-0"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-red-100 border-2 border-red-500 text-red-700 font-mono text-xs font-bold">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="p-2.5 rounded-lg bg-emerald-100 border-2 border-[#10B981] text-emerald-800 font-mono text-xs font-bold">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="neo-btn w-full px-4 py-2.5 rounded-lg bg-[#FF5722] hover:bg-[#E64A19] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "CONNECTING..." : mode === "signup" ? "⚡ CREATE FREE ACCOUNT" : "⚡ SIGN IN"}
                </button>
              </form>

              {/* Toggle Mode */}
              <div className="mt-4 text-center text-xs font-mono text-gray-600">
                {mode === "signin" ? (
                  <>
                    New to AI Resume Tailor?{" "}
                    <button
                      onClick={() => setMode("signup")}
                      className="text-[#FF5722] font-bold hover:underline"
                    >
                      Create account
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{" "}
                    <button
                      onClick={() => setMode("signin")}
                      className="text-[#FF5722] font-bold hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Continue as Guest */}
          <div className="mt-4 pt-3 border-t border-[#1C2028]/15 text-center">
            <button
              onClick={handleClose}
              className="text-xs font-mono text-gray-500 hover:text-[#1C2028] transition-colors"
            >
              Continue as guest (preview mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
