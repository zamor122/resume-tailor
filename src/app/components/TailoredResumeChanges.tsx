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
  const [hasTyped, setHasTyped] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousChangesRef = useRef<Change[] | null>(null);
  
  // Helper function to check if changes are the same
  const areChangesSame = (a: Change[], b: Change[]) => {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  };

  useEffect(() => {
    if (Array.isArray(changes) && changes.length > 0) {
      // Only animate if these are new changes or we haven't typed them yet
      const isSameChanges = previousChangesRef.current && 
                           areChangesSame(changes, previousChangesRef.current);
                           
      if (!hasTyped || !isSameChanges) {
        previousChangesRef.current = [...changes];
        setIsTyping(true);
        let currentIndex = 0;

        const typeNextChange = () => {
          if (currentIndex < changes.length && changes[currentIndex]) {
            setDisplayedChanges(prev => [...prev, changes[currentIndex]]);
            currentIndex++;
            timeoutRef.current = setTimeout(typeNextChange, 500);
          } else {
            setIsTyping(false);
            setHasTyped(true);
          }
        };

        setDisplayedChanges([]);
        typeNextChange();

        return () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      } else if (hasTyped && isSameChanges) {
        // If we've already typed these changes, just display them immediately
        setDisplayedChanges(changes);
      }
    }
  }, [changes, hasTyped]);

  return (
    <div className="glass-card">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Changes Made:
      </h3>
      {loading && !changes.length ? (
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start space-x-2">
              <div className="mt-1 h-3 w-3 rounded-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 animate-pulse animation-delay-100"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer"></div>
                <div className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-300"></div>
                <div className="h-4 w-5/6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer animation-delay-500"></div>
              </div>
            </div>
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
