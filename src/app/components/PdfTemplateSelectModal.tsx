"use client";

import React, { useEffect, useState } from "react";
import {
  PDF_TEMPLATES,
  DEFAULT_PDF_TEMPLATE_ID,
} from "@/app/constants/pdfTemplates";

interface PdfTemplateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export default function PdfTemplateSelectModal({
  isOpen,
  onClose,
  onSelect,
}: PdfTemplateSelectModalProps) {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_PDF_TEMPLATE_ID);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(DEFAULT_PDF_TEMPLATE_ID);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (selectedId) {
      onSelect(selectedId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C2028]/70 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-template-modal-title"
    >
      <div
        className="w-full max-w-xl flex flex-col max-h-[90vh] bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-5 sm:p-6 border-b-2 border-[#1C2028] bg-[#F4F1EA] dark:bg-[#1A1F2C] flex items-start justify-between gap-4">
          <div>
            <h2
              id="pdf-template-modal-title"
              className="text-xl sm:text-2xl font-bold font-mono text-[#1C2028] dark:text-[#FAF7F0] flex items-center gap-2"
            >
              <span>CHOOSE PDF TEMPLATE</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 font-mono text-xs mt-1">
              Select a layout. Your content stays the same; only the style changes. All templates are ATS-friendly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neo-btn p-1.5 rounded-lg border-1.5 border-[#1C2028] bg-white text-[#1C2028] hover:bg-[#FFE0B2] shadow-[2px_2px_0px_#1C2028] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          <div className="space-y-3">
            {PDF_TEMPLATES.map((template) => {
              const isSelected = selectedId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#1C2028] bg-[#FFE0B2] text-[#1C2028] shadow-[3px_3px_0px_#1C2028]"
                      : "border-[#1C2028]/40 hover:border-[#1C2028] bg-white dark:bg-[#21262D] text-[#1C2028] dark:text-gray-200 shadow-[1px_1px_0px_rgba(28,32,40,0.15)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 border-[#1C2028] flex-shrink-0 flex items-center justify-center ${
                        isSelected
                          ? "bg-[#FF5722]"
                          : "bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l5 5L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono font-bold text-sm sm:text-base text-[#1C2028] dark:text-[#FAF7F0]">
                          {template.name}
                        </h3>
                        {template.previewLabel && (
                          <span className="neo-tag text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FF5722] text-white border border-[#1C2028]">
                            {template.previewLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-gray-700 dark:text-gray-300 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t-2 border-[#1C2028]/20">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn flex-1 px-4 py-2.5 rounded-xl font-mono font-bold text-xs sm:text-sm text-[#1C2028] bg-[#FAF7F0] border-2 border-[#1C2028] hover:bg-[#F0EDE6] shadow-[2px_2px_0px_#1C2028] transition-colors"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!selectedId}
              className="neo-btn flex-1 px-4 py-2.5 rounded-xl font-mono font-bold text-xs sm:text-sm text-white bg-[#FF5722] border-2 border-[#1C2028] hover:bg-[#F4511E] shadow-[3px_3px_0px_#1C2028] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              DOWNLOAD PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
