import React from "react";
import { Fredoka, Plus_Jakarta_Sans, Fraunces } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-pomegranate-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-prototype-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-riso-serif",
  display: "swap",
});

export default function DesignLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fredoka.variable} ${plusJakarta.variable} ${fraunces.variable}`}
      style={{
        fontFamily: "var(--font-prototype-sans), system-ui, sans-serif",
      }}
    >
      <style>{`
        .font-pom-display {
          font-family: var(--font-pomegranate-display), var(--font-prototype-sans), sans-serif;
        }
        .font-pom-sans {
          font-family: var(--font-prototype-sans), system-ui, sans-serif;
        }
        .font-riso-serif {
          font-family: var(--font-riso-serif), Georgia, serif;
        }
        .font-riso-sans {
          font-family: var(--font-prototype-sans), system-ui, sans-serif;
        }
        /* Subtle tactile cotton paper grain for Warm Paper Risograph */
        .riso-paper-bg {
          background-color: #F6F0E4;
          background-image:
            radial-gradient(rgba(36, 31, 26, 0.032) 1px, transparent 0),
            radial-gradient(rgba(43, 107, 90, 0.025) 1px, transparent 0);
          background-size: 22px 22px, 34px 34px;
          background-position: 0 0, 11px 11px;
        }
        /* Smooth reduced-motion guard */
        @media (prefers-reduced-motion: reduce) {
          .proto-animate {
            animation: none !important;
            transition: none !important;
          }
        }
        /* Custom clean scrollbars inside prototype viewport */
        .proto-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .proto-scroll::-webkit-scrollbar-thumb {
          background: rgba(58, 12, 34, 0.18);
          border-radius: 9999px;
        }
        /* Container query hook for responsive prototype panels */
        .proto-container {
          container-type: inline-size;
        }
      `}</style>
      {children}
    </div>
  );
}
