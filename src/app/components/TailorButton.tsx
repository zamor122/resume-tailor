import React from "react";

interface TailorButtonProps {
  loading: boolean;
  onClick: () => void;
}

const TailorButton: React.FC<TailorButtonProps> = ({ loading, onClick }) => {
  return (
    <div className="flex justify-center">
      {loading ? (
        <div className="animate-pulse bg-gradient-to-r from-gray-300 to-gray-100 dark:from-gray-700 dark:to-gray-900 h-16 w-52 rounded-lg"></div>
      ) : (
        <button
          onClick={onClick}
          className="bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2"
        >
          ✂️ Tailor Resume
        </button>
      )}
    </div>
  );
};

export default TailorButton;
