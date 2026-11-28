import type { Metadata } from "next";
import DesignLabClient from "../DesignLabClient";

export const metadata: Metadata = {
  title: "Pomegranate Tactile — Full Desktop & Mobile Prototype | AI Resume Tailor",
  description:
    "Full interactive site prototype for the Pomegranate Tactile art direction across Tailor, Futureproof AI, Agent Talent Network, Pricing, Profile, and Agents API.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PomegranatePrototypePage() {
  return <DesignLabClient initialTheme="pomegranate" />;
}
