interface TailorButtonProps {
  loading: boolean;
  onClick: () => void;
  timerActive: boolean;
  timeLeft: number;
}

const TailorButton: React.FC<TailorButtonProps> = ({ loading, onClick, timerActive, timeLeft }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return (
    <div className="flex flex-col items-center">
      {loading ? (
        <div className="animate-pulse bg-gradient-to-r from-gray-300 to-gray-100 dark:from-gray-700 dark:to-gray-900 h-16 w-52 rounded-lg"></div>
      ) : (
        <>
          <button
            onClick={onClick}
            className={`bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2 ${timerActive && !isDevelopment ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={timerActive && !isDevelopment}
          >
             {timerActive && !isDevelopment ? `Retry in ${timeLeft}s` : "✨ Tailor Your Resume"}
          </button>
          {!timerActive && (
            <span className="text-slate-500 mt-2 text-sm text-center mt-6">
              Please take a moment to review the tailored resume for any formatting or content adjustments. 😊
              {isDevelopment && <span className="block text-green-500 font-medium">Development mode: Rate limiting disabled</span>}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default TailorButton;
