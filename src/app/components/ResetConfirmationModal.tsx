"use client";

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
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Reset and Start Over?</h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            You will lose all progress, including:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
            <li>Your uploaded resume</li>
            <li>Job description</li>
            <li>Tailored resume results</li>
            <li>All changes and optimizations</li>
          </ul>
          <p className="text-yellow-400 font-medium">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
              // Don't call onClose here - let handleReset close it to avoid race conditions
            }}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Reset & Start Over
          </button>
        </div>
      </div>
    </div>
  );
}



