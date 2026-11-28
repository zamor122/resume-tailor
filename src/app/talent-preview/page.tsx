import type { Metadata } from "next";
import TalentPrototypeClient from "./TalentPrototypeClient";

export const metadata: Metadata = {
  title: "Agent Talent Network — Interactive Prototype | AI Resume Tailor",
  description:
    "Interactive mobile prototype of the opt-in Anonymous Talent Pool, Premium LinkedIn Agent Card, and Double-Opt-In Intro Relay.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TalentPreviewPage() {
  return <TalentPrototypeClient />;
}
