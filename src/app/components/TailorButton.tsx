"use client";

interface TailorButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
  ready?: boolean;
}

const TailorButton: React.FC<TailorButtonProps> = ({
  loading,
  onClick,
  disabled = false,
  ready = false,
}) => {
  const isDisabled = loading || disabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative px-8 py-4 rounded-xl text-lg font-semibold
        transition-all duration-300 ease-out
        min-h-[52px] min-w-[200px]
        ${isDisabled
          ? "bg-gray-500/50 text-gray-400 cursor-not-allowed dark:bg-gray-600/50 dark:text-gray-500 opacity-70"
          : ready
            ? "bg-gradient-to-r from-cyan-500 via-cyan-500 to-purple-500 hover:from-cyan-400 hover:via-cyan-400 hover:to-purple-400 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
            : "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
        }
      `}
    >
      {loading && (
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/80 to-purple-500/80 animate-pulse" aria-hidden />
      )}
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Tailoring...
          </>
        ) : (
          "Tailor My Resume"
        )}
      </span>
    </button>
  );
};

export default TailorButton;
