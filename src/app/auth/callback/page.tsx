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
      // Check for OAuth code in URL
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(errorParam);
        setTimeout(() => router.push("/?auth_error=true"), 2000);
        return;
      }

      if (code) {
        // Exchange code for session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error("Error exchanging code for session:", exchangeError);
          setError(exchangeError.message);
          setTimeout(() => router.push("/?auth_error=true"), 2000);
          return;
        }

        // Success - redirect will happen via auth state change
        // Wait a moment for auth state to update
        setTimeout(() => {
          router.push("/");
        }, 500);
      } else if (!loading) {
        // No code and not loading - check if user is already authenticated
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

