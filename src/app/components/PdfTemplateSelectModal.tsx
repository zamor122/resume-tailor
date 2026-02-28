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
      className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-template-modal-title"
    >
      <div
        className="flex-1 flex flex-col min-h-0 bg-gray-900 border-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 sm:p-8 border-b border-gray-700 flex items-start justify-between gap-4">
          <div>
            <h2
              id="pdf-template-modal-title"
              className="text-2xl font-bold text-white mb-2"
            >
              Choose PDF template
            </h2>
            <p className="text-gray-400 text-sm">
              Select a layout. Your content stays the same; only the style
              changes. All templates are ATS-friendly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          <div className="space-y-2">
            {PDF_TEMPLATES.map((template) => {
              const isSelected = selectedId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500"
                          : "border-gray-500"
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
                      <h3 className="font-semibold text-white">
                        {template.name}
                      </h3>
                      {template.previewLabel && (
                        <p className="text-xs text-cyan-400/90 mt-0.5">
                          {template.previewLabel}
                        </p>
                      )}
                      <p className="text-sm text-gray-400 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!selectedId}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
