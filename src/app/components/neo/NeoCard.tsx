"use client";

import React from "react";

export interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "white" | "ivory" | "dark" | "orange" | "yellow";
  compact?: boolean;
}

export default function NeoCard({
  children,
  variant = "white",
  compact = false,
  className = "",
  ...props
}: NeoCardProps) {
  const variantStyles = {
    white: "bg-[var(--design-surface)] text-[var(--design-ink)]",
    ivory: "bg-[var(--design-surface-tint)] text-[var(--design-ink)]",
    dark: "bg-[var(--design-ink)] text-white",
    orange: "bg-[var(--design-accent)] text-[var(--design-accent-ink)]",
    yellow: "bg-[#F7B93E] text-[#3A0C22]",
  };

  const boxClass = compact ? "neo-box-sm p-4" : "neo-box p-6";

  return (
    <div
      className={`${boxClass} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
