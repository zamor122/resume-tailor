interface TailorButtonProps {
  loading: boolean;
  onClick: () => void;
  timerActive: boolean;
  timeLeft: number;
}

const TailorButton: React.FC<TailorButtonProps> = ({ loading, onClick, timerActive, timeLeft }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onClick}
        disabled={loading || timerActive}
        className={`px-6 py-3 rounded-lg transition-all duration-300 text-lg font-medium shadow-md hover:shadow-lg ${
          loading || timerActive
            ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
            : "bg-cyan-500 hover:bg-cyan-600 text-white transform hover:-translate-y-1"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Tailoring...
          </span>
        ) : timerActive ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-pulse -ml-1 mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Try again in {timeLeft}s
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg
              className="mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Tailor My Resume
          </span>
        )}
      </button>
      {!timerActive && (
        <p className="text-muted text-sm text-center max-w-md">
          Please take a moment to review the tailored resume for any formatting or content adjustments. 😊
          {isDevelopment && (
            <span className="block text-secondary font-medium mt-1">
              Development mode: Rate limiting disabled
            </span>
          )}
        </p>
      )}
    </div>
  );
};

export default TailorButton;
