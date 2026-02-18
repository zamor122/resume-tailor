import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Simple, Transparent Plans",
  description:
    "Your first 3 AI resume tailors are free. Unlimited access from $4.95. One-time payment, no subscription. Start tailoring in seconds.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
