"use client";

import React from "react";

export interface TailorBotProps {
  state?: "idle" | "scanning" | "celebrating";
  onPoke?: () => void;
  size?: number;
  className?: string;
  showPokeTag?: boolean;
}

export default function TailorBot({
  state = "idle",
  onPoke,
  size = 140,
  className = "",
  showPokeTag = false,
}: TailorBotProps) {
  const isHyped = state === "celebrating";
  const isScanning = state === "scanning";

  return (
    <div
      role={onPoke ? "button" : undefined}
      tabIndex={onPoke ? 0 : undefined}
      aria-label="Poke TailorBot MK-II Mascot"
      onClick={onPoke}
      onKeyDown={(e) => {
        if (onPoke && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onPoke();
        }
      }}
      className={`relative inline-block select-none ${
        onPoke
          ? "cursor-pointer transition-transform hover:scale-105 active:scale-95"
          : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full drop-shadow-[4px_4px_0px_#1C2028]"
        aria-hidden="true"
      >
        {/* Antenna Rod & Glowing Warm Beacon */}
        <line
          x1="80"
          y1="14"
          x2="80"
          y2="42"
          stroke="#FAF8F5"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle
          cx="80"
          cy="12"
          r="10"
          fill={isHyped ? "#10B981" : isScanning ? "#FFE600" : "#FF5722"}
          stroke="#1C2028"
          strokeWidth="3.5"
        />

        {/* CRT Monitor Chassis (Warm Ivory) */}
        <rect
          x="26"
          y="42"
          width="108"
          height="94"
          rx="26"
          fill="#FAF7F0"
          stroke="#1C2028"
          strokeWidth="6"
        />

        {/* Bezel Screws */}
        <circle cx="36" cy="52" r="2.5" fill="#1C2028" />
        <circle cx="124" cy="52" r="2.5" fill="#1C2028" />
        <circle cx="36" cy="126" r="2.5" fill="#1C2028" />
        <circle cx="124" cy="126" r="2.5" fill="#1C2028" />

        {/* CRT Inner Screen (Phosphor Dark Green) */}
        <rect
          x="40"
          y="56"
          width="80"
          height="48"
          rx="14"
          fill="#0D1F17"
          stroke="#1C2028"
          strokeWidth="3"
        />

        {/* Scanlines / Cathode Ray Glow */}
        <line
          x1="44"
          y1="70"
          x2="116"
          y2="70"
          stroke="#10B981"
          strokeWidth="1"
          opacity="0.15"
        />
        <line
          x1="44"
          y1="82"
          x2="116"
          y2="82"
          stroke="#10B981"
          strokeWidth="1"
          opacity="0.15"
        />

        {/* Eyes (Phosphor Green Glowing Discs) */}
        <circle
          cx="62"
          cy="80"
          r={isHyped ? 9 : 7}
          fill="#10B981"
        />
        <circle
          cx="98"
          cy="80"
          r={isHyped ? 9 : 7}
          fill="#10B981"
        />

        {/* Analog Tuning Dial Knob on Lower Right */}
        <circle cx="112" cy="118" r="8" fill="#1C2028" />
        <line
          x1="112"
          y1="112"
          x2="112"
          y2="118"
          stroke="#FFFFFF"
          strokeWidth="2"
        />

        {/* Friendly Smile */}
        <path
          d={
            isHyped
              ? "M 62 118 Q 80 134 98 118"
              : "M 66 120 Q 80 128 94 120"
          }
          stroke="#1C2028"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {showPokeTag && (
        <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono font-bold pointer-events-none">
          TAP TO INTERACT 👆
        </span>
      )}
    </div>
  );
}
