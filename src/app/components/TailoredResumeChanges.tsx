import React from "react";

// Define the type for each change object
interface Change {
  changeDescription: string;
  changeDetails: string;
}

interface TailoredResumeChangesProps {
  changes: Change[];
  loading?: boolean;
}

const TailoredResumeChanges: React.FC<TailoredResumeChangesProps> = ({ changes, loading }) => {
  if (loading) {
    return (
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Changes Made:
        </h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    changes.length > 0 && (
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Changes Made:
        </h3>
        <ul className="list-disc pl-6 space-y-2">
          {changes.map((change, index) => (
            <li key={index} className="text-gray-900 dark:text-gray-100">
              <strong>{change.changeDescription}</strong>: {change.changeDetails}
            </li>
          ))}
        </ul>
      </div>
    )
  );
};

export default TailoredResumeChanges;
