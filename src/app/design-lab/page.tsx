import type { Metadata } from "next";
import DesignLabClient from "./DesignLabClient";

export const metadata: Metadata = {
  title: "Design Approval Studio — Pomegranate vs Warm Paper Risograph | AI Resume Tailor",
  description:
    "Full interactive desktop and mobile site prototypes comparing Pomegranate Tactile and Warm Paper Risograph across all features.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLabPage() {
  return <DesignLabClient initialTheme="pomegranate" />;
}
