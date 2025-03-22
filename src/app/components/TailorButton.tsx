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
      {loading ? (
        <div className="animate-shimmer h-12 w-52 rounded-lg bg-surface"></div>
      ) : (
        <>
          <button
            onClick={onClick}
            className={`btn-primary relative group overflow-hidden
                        bg-gradient-to-r from-amber-500 via-fuchsia-500 to-purple-500 
                        hover:from-purple-500 hover:via-fuchsia-500 hover:to-amber-500
                        text-white font-bold py-4 px-8 rounded-lg shadow-lg 
                        transition-all duration-500 ease-in-out transform hover:scale-105 
                        flex items-center gap-2 
                        before:absolute before:inset-0 
                        before:bg-gradient-to-r before:from-white/20 before:to-transparent 
                        before:translate-x-[-100%] before:hover:translate-x-[100%]
                        before:transition-transform before:duration-700
                        ${timerActive && !isDevelopment ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={timerActive && !isDevelopment}
          >
            <span className="relative">
              {timerActive && !isDevelopment ? (
                <>
                  <span className="animate-pulse">⏳</span> Retry in {timeLeft}s
                </>
              ) : (
                <>
                  <span className="animate-float inline-block">✨</span> Tailor Your Resume
                </>
              )}
            </span>
            <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
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
        </>
      )}
    </div>
  );
};

export default TailorButton;
