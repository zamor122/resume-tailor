import React, { useState, useEffect, useRef } from "react";

// Define the type for each change object
interface Change {
  changeDescription: string;
  changeDetails: string;
}

interface TailoredResumeChangesProps {
  changes: Change[];
  loading?: boolean;
}

const TailoredResumeChanges: React.FC<TailoredResumeChangesProps> = ({ changes = [], loading }) => {
  const [displayedChanges, setDisplayedChanges] = useState<Change[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (Array.isArray(changes) && changes.length > 0) {
      setIsTyping(true);
      let currentIndex = 0;

      const typeNextChange = () => {
        if (currentIndex < changes.length && changes[currentIndex]) {
          setDisplayedChanges(prev => [...prev, changes[currentIndex]]);
          currentIndex++;
          timeoutRef.current = setTimeout(typeNextChange, 500);
        } else {
          setIsTyping(false);
        }
      };

      setDisplayedChanges([]);
      typeNextChange();

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [changes]);

  return (
    <div className="glass-card">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Changes Made:
      </h3>
      {loading && !changes.length ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded"
            />
          ))}
        </div>
      ) : (
        <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
          {displayedChanges.filter(change => change?.changeDescription).map((change, index) => (
            <li key={index}>
              <strong>{change.changeDescription}</strong>: {change.changeDetails}
            </li>
          ))}
          {isTyping && (
            <span className="inline-block w-1 h-4 ml-1 bg-gray-900 dark:bg-gray-100 animate-pulse" />
          )}
        </ul>
      )}
    </div>
  );
};

export default TailoredResumeChanges;
