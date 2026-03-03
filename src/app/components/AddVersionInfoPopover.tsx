"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_WIDTH = 400;

interface AddVersionInfoPopoverProps {
  content: React.ReactNode;
  /** Optional class for the info icon (e.g. text-white/80 on gradient buttons) */
  iconClassName?: string;
  ariaLabel?: string;
}

export default function AddVersionInfoPopover({
  content,
  iconClassName = "text-gray-400 hover:text-gray-300",
  ariaLabel,
}: AddVersionInfoPopoverProps) {
  const [tooltipRect, setTooltipRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  }, []);

  const hide = useCallback(() => setTooltipRect(null), []);

  return (
    <>
      <span
        ref={triggerRef}
        className="relative inline-flex flex-shrink-0 cursor-help"
        aria-label={ariaLabel}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <svg
          className={`w-4 h-4 ${iconClassName}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </span>
      {tooltipRect && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[200] px-6 py-6 text-sm font-normal text-white bg-gray-800 rounded-lg shadow-xl text-left leading-relaxed box-border"
            style={{
              width: TOOLTIP_WIDTH,
              left: (() => {
                const center = tooltipRect.left + tooltipRect.width / 2;
                const minLeft = 12;
                const maxLeft = typeof window !== "undefined" ? window.innerWidth - TOOLTIP_WIDTH - 12 : 9999;
                return Math.min(maxLeft, Math.max(minLeft, center - TOOLTIP_WIDTH / 2));
              })(),
              top: tooltipRect.top - 8,
              transform: "translateY(-100%)",
            }}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
