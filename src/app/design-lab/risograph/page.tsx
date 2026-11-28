import type { Metadata } from "next";
import DesignLabClient from "../DesignLabClient";

export const metadata: Metadata = {
  title: "Warm Paper Risograph — Full Desktop & Mobile Prototype | AI Resume Tailor",
  description:
    "Full interactive site prototype for the Warm Paper Risograph art direction across Tailor, Futureproof AI, Agent Talent Network, Pricing, Profile, and Agents API.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RisographPrototypePage() {
  return <DesignLabClient initialTheme="risograph" />;
}
