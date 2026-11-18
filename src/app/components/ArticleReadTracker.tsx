"use client";

import { useEffect, useRef } from "react";
import { useGamification } from "@/app/contexts/GamificationContext";

interface ArticleReadTrackerProps {
  slug: string;
  title: string;
}

export default function ArticleReadTracker({ slug, title }: ArticleReadTrackerProps) {
  const { readArticle } = useGamification();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      const timer = setTimeout(() => {
        readArticle(slug, title);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [slug, title, readArticle]);

  return null;
}
