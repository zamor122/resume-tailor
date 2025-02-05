import React from "react";

// Define the type for each change object
interface Change {
  changeDescription: string;
  changeDetails: string;
}

interface TailoredResumeChangesProps {
  changes: Change[];
}

const TailoredResumeChanges: React.FC<TailoredResumeChangesProps> = ({ changes }) => {
  return (
    changes.length > 0 && (
      <div className="glass-card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 pb-4">Changes Made</h2>
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
