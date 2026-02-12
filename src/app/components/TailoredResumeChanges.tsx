"use client";

import React from "react";

interface Change {
  changeDescription: string;
  changeDetails: string;
}

interface TailoredResumeChangesProps {
  changes: Change[];
  loading?: boolean;
}

const TailoredResumeChanges: React.FC<TailoredResumeChangesProps> = ({
  changes = [],
  loading,
}) => {
  if (loading && !changes.length) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="mt-1.5 h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" />
            <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
      {changes
        .filter((change) => change?.changeDescription)
        .map((change, index) => (
          <li key={index}>
            <strong>{change.changeDescription}</strong>: {change.changeDetails}
          </li>
        ))}
      {changes.length === 0 && !loading && (
        <li className="text-gray-500 dark:text-gray-400">No changes to display.</li>
      )}
    </ul>
  );
};

export default TailoredResumeChanges;
