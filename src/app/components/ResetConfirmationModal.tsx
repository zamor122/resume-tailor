"use client";

import React from "react";
import { useGamification } from "@/app/contexts/GamificationContext";

interface ResetConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: ResetConfirmationModalProps) {
  const { playSfx } = useGamification();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playSfx("boop");
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div 
        className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-6 max-w-md w-full text-[#1C2028]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#FF5722] border-2 border-[#1C2028] flex items-center justify-center text-white shrink-0 shadow-[2px_2px_0px_#1C2028]">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <span className="neo-tag bg-[#FF5722] text-white text-[9px] px-2 py-0.5 font-mono font-bold uppercase">
              CONFIRM RESET
            </span>
            <h3 id="reset-modal-title" className="text-lg font-mono font-bold text-[#1C2028] mt-0.5">
              Reset and Start Over?
            </h3>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-lg bg-[#F4F1EA] border border-[#1C2028] text-xs font-mono space-y-2">
          <p className="font-bold text-[#1C2028]">
            You will clear the following active session data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Your uploaded resume text</li>
            <li>Job description</li>
            <li>Tailored suggestion diffs</li>
            <li>ATS score calculations</li>
          </ul>
          <p className="text-[#FF5722] font-bold pt-1">
            ⚠️ This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              playSfx("boop");
              onClose();
            }}
            className="neo-btn flex-1 px-4 py-2.5 font-mono font-bold text-xs uppercase bg-white text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px]"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playSfx("click");
              onConfirm();
            }}
            className="neo-btn flex-1 px-4 py-2.5 font-mono font-bold text-xs uppercase bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#E64A19] active:translate-x-[1px] active:translate-y-[1px]"
          >
            Reset Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
