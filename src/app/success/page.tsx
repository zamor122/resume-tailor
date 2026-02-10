"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getTierConfig } from "@/app/config/pricing";
import { getAccessInfo } from "@/app/utils/accessManager";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessActivated, setAccessActivated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    const verify = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stripe/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to verify payment");
        }

        if (data.paid) {
          setPaid(true);
          const meta = data.metadata || {};
          const tierCode = meta.tier as "2D" | "7D" | "30D" | undefined;
          const rid = meta.resumeId as string | undefined;
          const uid = meta.userId as string | undefined;

          if (uid && typeof uid === "string" && uid.trim()) {
            setUserId(uid.trim());
          }
          if (tierCode) {
            setTier(tierCode);
            const tierConfig = getTierConfig(tierCode);
            if (tierConfig) {
              const exp = new Date();
              exp.setDate(exp.getDate() + tierConfig.durationDays);
              setExpiresAt(exp.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
            }
          }
          if (rid && typeof rid === "string" && rid.trim()) {
            setResumeId(rid.trim());
          }
        } else {
          setPaid(false);
          setError("Payment was not completed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify payment");
        setPaid(false);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [sessionId]);

  // Poll for access activation (webhook may lag)
  useEffect(() => {
    if (!paid || !userId) return;

    const checkAccess = async () => {
      const info = await getAccessInfo(userId);
      if (info?.hasAccess && !info.isExpired) {
        setAccessActivated(true);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    checkAccess();
    pollRef.current = setInterval(checkAccess, 2000);

    const maxPoll = setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setAccessActivated((prev) => (prev === null ? false : prev));
    }, 15000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(maxPoll);
    };
  }, [paid, userId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="inline-block w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Verifying your payment...</p>
      </div>
    );
  }

  if (error || !paid) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="p-6 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30">
          <h1 className="text-xl font-bold text-pink-600 dark:text-pink-400">Payment Issue</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {error || "Your payment could not be verified. If you completed a purchase, please contact support."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-400 transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }

  const tierConfig = tier ? getTierConfig(tier as "2D" | "7D" | "30D") : null;

  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-lg">
      <div className="p-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          Payment Successful
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Your payment was processed successfully.
        </p>
        {accessActivated === true && (
          <p className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium">
            Access activated! You can now view your full resumes.
          </p>
        )}
        {accessActivated === false && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your access is being activated. If you don&apos;t see it within a minute, refresh the page.
          </p>
        )}
        {accessActivated === null && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your access is being activated. If you don&apos;t see it within a minute, refresh the page.
          </p>
        )}
        {tierConfig && (
          <div className="mt-6 p-4 rounded-lg bg-white/50 dark:bg-gray-900/50">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {tierConfig.label}
            </p>
            {expiresAt && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Access until {expiresAt}
              </p>
            )}
          </div>
        )}
        <div className="mt-8 space-y-3">
          {resumeId ? (
            <Link
              href={`/resume/${resumeId}`}
              className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:from-cyan-400 hover:to-purple-400 transition-all"
            >
              View your resume
            </Link>
          ) : (
            <Link
              href="/profile"
              className="block w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:from-cyan-400 hover:to-purple-400 transition-all"
            >
              View your resumes
            </Link>
          )}
          <Link
            href="/"
            className="block w-full py-2 text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
          >
            Tailor another resume
          </Link>
        </div>
      </div>
    </div>
  );
}
