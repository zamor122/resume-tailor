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
    green: "bg-[#10B981] text-white",
    orange: "bg-[#FF5722] text-white",
    yellow: "bg-[#F59E0B] text-[#1C2028]",
    dark: "bg-[#1C2028] text-white",
    white: "bg-white text-[#1C2028]",
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
