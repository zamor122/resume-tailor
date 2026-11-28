"use client";

import React from "react";
import { useTheme } from "@/app/components/ThemeProvider";

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
  const { design } = useTheme();
  const isPom = design === "pomegranate";
  const isHyped = state === "celebrating";
  const isScanning = state === "scanning";

  const ink = isPom ? "#3A0C22" : "#241F1A";
  const chassis = isPom ? "#FFFDF5" : "#FFFDF8";
  const screenBg = isPom ? "#2A0A19" : "#1C352D";
  const eyeColor = isScanning
    ? isPom
      ? "#F7B93E"
      : "#E6AD30"
    : isPom
    ? "#74D4A0"
    : "#7DD3A8";
  const beaconColor = isHyped
    ? isPom
      ? "#F7B93E"
      : "#2B6B5A"
    : isScanning
    ? isPom
      ? "#7BC6FA"
      : "#D69B24"
    : isPom
    ? "#EA375D"
    : "#D65A38";

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
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        {/* Risograph soft terracotta ink offset print halo */}
        {!isPom && (
          <rect
            x="31"
            y="47"
            width="108"
            height="92"
            rx="28"
            fill="#D65A38"
            opacity="0.18"
          />
        )}

        {/* Antenna Rod & Glowing Beacon */}
        <line
          x1="80"
          y1="16"
          x2="80"
          y2="42"
          stroke={ink}
          strokeWidth={isPom ? "5.5" : "4.5"}
          strokeLinecap="round"
        />
        <circle
          cx="80"
          cy="14"
          r="10"
          fill={beaconColor}
          stroke={ink}
          strokeWidth={isPom ? "4.5" : "3.5"}
        />

        {/* Rounded CRT Monitor Chassis */}
        <rect
          x="26"
          y="42"
          width="108"
          height="92"
          rx="28"
          fill={chassis}
          stroke={ink}
          strokeWidth={isPom ? "6" : "4.5"}
        />

        {/* CRT Inner Screen */}
        <rect
          x="40"
          y="55"
          width="80"
          height="46"
          rx="15"
          fill={screenBg}
          stroke={ink}
          strokeWidth={isPom ? "3.5" : "2.5"}
        />

        {/* Subtle Scanlines */}
        <line
          x1="46"
          y1="70"
          x2="114"
          y2="70"
          stroke={eyeColor}
          strokeWidth="1"
          opacity="0.14"
        />
        <line
          x1="46"
          y1="84"
          x2="114"
          y2="84"
          stroke={eyeColor}
          strokeWidth="1"
          opacity="0.14"
        />

        {/* Expressive Eyes */}
        {isHyped ? (
          <>
            <path
              d="M 54 80 Q 63 69 72 80"
              fill="none"
              stroke={eyeColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 88 80 Q 97 69 106 80"
              fill="none"
              stroke={eyeColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
          </>
        ) : isScanning ? (
          <>
            <rect x="55" y="74" width="16" height="8" rx="4" fill={eyeColor} />
            <rect x="89" y="74" width="16" height="8" rx="4" fill={eyeColor} />
          </>
        ) : (
          <>
            <circle cx="63" cy="78" r="7.5" fill={eyeColor} />
            <circle cx="97" cy="78" r="7.5" fill={eyeColor} />
          </>
        )}

        {/* Theme Signature Cheek / Dial Detail */}
        {isPom ? (
          <>
            <circle cx="48" cy="115" r="5" fill="#F284B6" opacity="0.7" />
            <circle cx="112" cy="115" r="5" fill="#F284B6" opacity="0.7" />
          </>
        ) : (
          <circle cx="112" cy="116" r="6" fill="#2B6B5A" opacity="0.85" />
        )}

        {/* Friendly Smile */}
        <path
          d={
            isHyped
              ? "M 64 114 Q 80 128 96 114"
              : "M 67 116 Q 80 124 93 116"
          }
          stroke={ink}
          strokeWidth={isPom ? "5" : "4"}
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {showPokeTag && (
        <span
          className={`neo-tag text-[10px] px-3 py-0.5 absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-bold pointer-events-none ${
            isPom
              ? "bg-[#F7B93E] text-[#3A0C22]"
              : "bg-[#FAEAE4] text-[#B94726]"
          }`}
        >
          Tap TailorBot ✦
        </span>
      )}
    </div>
  );
}
