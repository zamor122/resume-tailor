"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "./AuthModal";

interface AuthGateProps {
  children: React.ReactNode | ((showAuthModal: () => void) => React.ReactNode);
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

  const openAuthModal = () => setShowAuthModal(true);

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

  const tailorCopy = action === "tailor";
  const title = tailorCopy ? "Sign in to tailor your resume" : `Sign in to ${action}`;
  const description = tailorCopy ? "Your first 3 resumes are free. Create a free account to get started." : `Create a free account to ${action} your tailored resume and access it anytime.`;

  if (loading) {
    return (
      <div className="opacity-50 pointer-events-none">
        {typeof children === "function" ? children(openAuthModal) : children}
      </div>
    );
  }

  if (user) {
    // User is authenticated, render children normally
    return <>{typeof children === "function" ? children(openAuthModal) : children}</>;
  }

  // User not authenticated: use render prop so the button's onClick is explicitly
  // set to openAuthModal (avoids Safari onClickCapture/stopPropagation issues)
  if (typeof children === "function") {
    return (
      <>
        {children(openAuthModal)}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          title={title}
          description={description}
        />
      </>
    );
  }

  // Fallback for non-function children: wrap with click handler
  return (
    <>
      <div onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); setShowAuthModal(true); }} className="cursor-pointer">
        {children}
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        title={title}
        description={description}
      />
    </>
  );
}

