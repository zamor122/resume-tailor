import type { Metadata } from "next";
import DesignLabClient from "./DesignLabClient";

export const metadata: Metadata = {
  title: "Design Direction Lab — 5 Art Styles | AI Resume Tailor",
  description:
    "Preview 5 distinct, low-cognitive-load art directions for AI Resume Tailor & Futureproof.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLabPage() {
  return <DesignLabClient />;
}
