"use client";

interface TailorButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
  ready?: boolean;
  statusText?: string;
}

const TailorButton: React.FC<TailorButtonProps> = ({
  loading,
  onClick,
  disabled = false,
  ready = false,
  statusText,
}) => {
  const isDisabled = loading || disabled;

  return (
    <button
      data-testid="tailor-button"
      onClick={onClick}
      disabled={isDisabled}
      className={`
        neo-btn relative px-8 py-4 text-base sm:text-lg font-mono font-bold uppercase tracking-wider
        min-h-[54px] min-w-[220px] inline-flex items-center justify-center gap-2
        ${isDisabled
          ? "bg-[#E5E0D8] text-gray-400 border-2 border-gray-400 shadow-none cursor-not-allowed opacity-70"
          : ready
            ? "bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#1C2028]"
            : "bg-[#1C2028] text-white hover:bg-black border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#1C2028]"
        }
      `}
    >
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{statusText || "TAILORING IN PROGRESS..."}</span>
          </>
        ) : (
          <>
            <span>⚡ TAILOR MY RESUME</span>
            <span className="bg-black/25 text-white text-[10px] px-2 py-0.5 rounded-sm font-mono">+150 XP</span>
          </>
        )}
      </span>
    </button>
  );
};

export default TailorButton;
