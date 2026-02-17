"use client";

import React, { useState, useCallback } from "react";
import { analytics } from "@/app/services/analytics";

interface FileDropZoneProps {
  onFileAccepted: (text: string) => void;
  onError?: (message: string) => void;
  accept?: string;
  extractText: (file: File) => Promise<string>;
}

export default function FileDropZone({
  onFileAccepted,
  onError,
  accept = ".pdf,.txt",
  extractText,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      if (!file) return;
      const isPdf = file.type === "application/pdf";
      const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
      const fileType = isPdf ? "pdf" : isTxt ? "txt" : "other";

      if (!isPdf && !isTxt) {
        analytics.trackEvent(analytics.events.UPLOAD_ERROR, {
          source: "file",
          fileType,
          errorMessage: "Invalid file type",
          timestamp: new Date().toISOString(),
        });
        onError?.("Please upload a PDF or TXT file.");
        return;
      }

      analytics.trackEvent(analytics.events.UPLOAD_ATTEMPT, {
        source: "file",
        fileType,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
      });

      setIsProcessing(true);
      setUploadedFile({ name: file.name, size: file.size });

      try {
        const text = await extractText(file);
        analytics.trackEvent(analytics.events.UPLOAD_SUCCESS, {
          source: "file",
          charCount: text?.length ?? 0,
          timestamp: new Date().toISOString(),
        });
        onFileAccepted(text);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to extract text from file.";
        analytics.trackEvent(analytics.events.UPLOAD_ERROR, {
          source: "file",
          fileType,
          errorMessage: errorMessage.slice(0, 200),
          timestamp: new Date().toISOString(),
        });
        onError?.(errorMessage);
        setUploadedFile(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [extractText, onFileAccepted, onError]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleReplace = () => {
    setUploadedFile(null);
    const input = document.getElementById("file-drop-input") as HTMLInputElement;
    if (input) input.click();
  };

  const handleClear = () => {
    setUploadedFile(null);
    onFileAccepted("");
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-2xl border-2 border-dashed p-6 md:p-8
        transition-all duration-300 cursor-pointer
        ${isDragging
          ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
          : "border-gray-300 dark:border-gray-600 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
        }
      `}
    >
      <input
        id="file-drop-input"
        type="file"
        accept={accept}
        onChange={handleChange}
        className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${uploadedFile ? "pointer-events-none" : ""}`}
        disabled={isProcessing}
      />

      {uploadedFile ? (
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/20 dark:bg-cyan-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-cyan-500 dark:text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleReplace();
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center gap-2">
          {isProcessing ? (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Extracting text...
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 dark:bg-cyan-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-cyan-500 dark:text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drag PDF or click to upload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supports .pdf and .txt
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
