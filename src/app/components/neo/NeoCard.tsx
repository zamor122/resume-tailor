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
    white: "bg-white text-[#1C2028]",
    ivory: "bg-[#FAF8F5] text-[#1C2028]",
    dark: "bg-[#1C2028] text-white",
    orange: "bg-[#FF5722] text-white",
    yellow: "bg-[#F59E0B] text-[#1C2028]",
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
