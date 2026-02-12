"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/app/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const hasHash = typeof window !== "undefined" && window.location.hash.length > 0;

      if (errorParam) {
        setError(errorParam);
        setTimeout(() => router.push("/?auth_error=true"), 2000);
        return;
      }

      if (code) {
        // OAuth: exchange code for session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Error exchanging code for session:", exchangeError);
          setError(exchangeError.message);
          setTimeout(() => router.push("/?auth_error=true"), 2000);
          return;
        }
        setTimeout(() => router.push("/"), 500);
        return;
      }

      // Email confirmation: Supabase redirects with hash (#access_token=...&type=signup)
      // Client auto-processes hash; wait for session to be established
      if (hasHash && user) {
        router.push("/");
        return;
      }
      if (hasHash && !user) {
        // Hash present but no session yet - give client time to process
        return;
      }

      if (!loading) {
        if (user) {
          router.push("/");
        } else {
          router.push("/?auth_error=true");
        }
      }
    };

    handleCallback();
  }, [searchParams, router, user, loading]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️</div>
          <p className="text-gray-400 mb-2">Authentication Error</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-600 mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}

