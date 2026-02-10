"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "./AuthModal";

interface AuthGateProps {
  children: React.ReactNode;
  onAuthSuccess?: () => void;
  sessionId?: string;
  resumeId?: string;
  action?: string; // e.g., "save", "download"
}

export default function AuthGate({
  children,
  onAuthSuccess,
  sessionId,
  resumeId,
  action = "save",
}: AuthGateProps) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (user) {
      // User is authenticated, allow action
      return;
    }

    // User not authenticated, show auth modal
    e.preventDefault();
    e.stopPropagation();
    setShowAuthModal(true);
  };

  // Link resume when user becomes available
  useEffect(() => {
    const linkResume = async () => {
      if (user && (sessionId || resumeId)) {
        setIsLinking(true);
        try {
          const response = await fetch("/api/resume/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              resumeId,
              userId: user.id,
            }),
          });

          if (!response.ok) {
            console.error("Failed to link resume to user");
          }
        } catch (error) {
          console.error("Error linking resume:", error);
        } finally {
          setIsLinking(false);
        }
      }
    };

    linkResume();
  }, [user, sessionId, resumeId]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    onAuthSuccess?.();
  };

  if (loading) {
    return (
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    );
  }

  if (user) {
    // User is authenticated, render children normally
    return <>{children}</>;
  }

  // User not authenticated, wrap children with click handler
  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title={`Sign in to ${action}`}
        description={`Create a free account to ${action} your tailored resume and access it anytime.`}
      />
    </>
  );
}

