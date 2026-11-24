"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppErrorBoundary] Unhandled client error:", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    });
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[5px_5px_0px_#1C2028] p-8 rounded-2xl space-y-5">
        <div className="flex items-center gap-2">
          <span className="neo-tag bg-[#EF4444] text-white text-[10px] font-mono font-bold px-2.5 py-0.5 border border-[#1C2028]">
            RECOVERABLE ERROR
          </span>
          {error?.digest && (
            <span className="text-[10px] font-mono text-gray-500">
              Ref: {error.digest}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-mono font-bold text-[#1C2028]">
          Something went wrong on this screen
        </h1>
        <p className="text-sm font-mono text-gray-700 leading-relaxed">
          Your saved resumes and paid access are completely safe. Click below to retry without losing your account data.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="neo-btn px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider bg-[#FF5722] hover:bg-[#F4511E] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] rounded-lg"
          >
            Try Again
          </button>
          <Link
            href="/profile"
            className="neo-btn px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider bg-white hover:bg-[#F4F1EA] text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] rounded-lg"
          >
            My Resumes
          </Link>
          <Link
            href="/"
            className="neo-btn px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider bg-white hover:bg-[#F4F1EA] text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] rounded-lg"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
