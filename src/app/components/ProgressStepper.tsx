"use client";

import { useEffect, useState } from "react";

interface ProgressStepperProps {
  isActive: boolean;
  onComplete?: () => void;
}

const STEPS = [
  "Scanning for keywords...",
  "Removing AI jargon...",
  "Injecting human tone...",
  "Optimizing ATS compatibility...",
];

export default function ProgressStepper({ isActive, onComplete }: ProgressStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [showStillProcessing, setShowStillProcessing] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setIsComplete(false);
      setCycleCount(0);
      setShowStillProcessing(false);
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          setCycleCount((c) => {
            const newCount = c + 1;
            if (newCount === 1) {
              setShowStillProcessing(true);
            }
            return newCount;
          });
          return 0;
        }
      });
    }, 3000);

    return () => clearInterval(stepInterval);
  }, [isActive, onComplete]);

  if (!isActive && !isComplete) {
    return null;
  }

  return (
    <div className="input-container w-full max-w-2xl mx-auto p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent animate-pulse" aria-hidden />
      <div className="space-y-4">
        {STEPS.map((step, index) => {
          const isActiveStep = index === currentStep && isActive;
          const isCompleted = index < currentStep || (isComplete && index === STEPS.length - 1);

          return (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                ) : isActiveStep ? (
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                    <div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-500 dark:border-gray-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm transition-colors duration-200 ${
                    isCompleted
                      ? "text-cyan-400 dark:text-cyan-400"
                      : isActiveStep
                        ? "text-cyan-500 dark:text-cyan-400 font-medium"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {showStillProcessing && isActive && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-cyan-500 dark:text-cyan-400 font-medium">
              Still processing... This may take 30-60 seconds
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            AI is analyzing your resume and optimizing it for the job description
          </p>
        </div>
      )}
    </div>
  );
}
