"use client";

import React from "react";

export interface NeoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: "green" | "orange" | "yellow" | "dark" | "white" | "red";
}

export default function NeoBadge({
  children,
  variant = "white",
  className = "",
  ...props
}: NeoBadgeProps) {
  const variantStyles = {
    green: "bg-[var(--design-success-tint)] text-[var(--design-success)]",
    orange: "bg-[var(--design-accent)] text-[var(--design-accent-ink)]",
    yellow: "bg-[#F7B93E] text-[#3A0C22]",
    dark: "bg-[var(--design-ink)] text-white",
    white: "bg-[var(--design-surface)] text-[var(--design-ink)]",
    red: "bg-red-100 text-red-900 border-red-300",
  };

  return (
    <span
      className={`neo-tag px-2.5 py-0.5 text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
