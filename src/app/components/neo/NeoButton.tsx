"use client";

import React from "react";
import { playAudioSfx } from "@/app/utils/audioSfx";

export interface NeoButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "orange" | "green" | "yellow" | "dark" | "white";
  size?: "sm" | "md" | "lg";
  xpReward?: number;
  playSfxOnClick?: boolean;
}

export default function NeoButton({
  children,
  variant = "orange",
  size = "md",
  xpReward,
  playSfxOnClick = true,
  onClick,
  className = "",
  ...props
}: NeoButtonProps) {
  const variantStyles = {
    orange: "bg-[var(--design-accent)] text-[var(--design-accent-ink)] hover:bg-[var(--design-accent-hover)]",
    green: "bg-[var(--design-success)] text-white hover:opacity-95",
    yellow: "bg-[#F7B93E] text-[#3A0C22] hover:bg-[#e5a832]",
    dark: "bg-[var(--design-ink)] text-white hover:opacity-90",
    white: "bg-[var(--design-surface)] text-[var(--design-ink)] hover:bg-[var(--design-surface-tint)]",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (playSfxOnClick) {
      playAudioSfx("click");
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`neo-btn inline-flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-wider ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      <span>{children}</span>
      {typeof xpReward === "number" && (
        <span className="bg-black/25 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
          +{xpReward} XP
        </span>
      )}
    </button>
  );
}
