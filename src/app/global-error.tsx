"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalErrorBoundary] Fatal layout error:", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#F4F1EA] text-[#1C2028] min-h-screen flex items-center justify-center p-4 font-mono">
        <div className="bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[5px_5px_0px_#1C2028] p-8 rounded-2xl max-w-lg w-full space-y-4">
          <span className="inline-block bg-[#EF4444] text-white text-[10px] font-bold px-2.5 py-0.5 border border-[#1C2028]">
            RECOVERY MODE
          </span>
          <h1 className="text-xl font-bold">
            We hit an unexpected glitch
          </h1>
          <p className="text-sm text-gray-700 leading-relaxed">
            Your account, pass, and saved resumes are safe. Click below to reload the workspace.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 text-xs font-bold uppercase bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] rounded-lg cursor-pointer"
            >
              Reload Workspace
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 text-xs font-bold uppercase bg-white text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] rounded-lg"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
