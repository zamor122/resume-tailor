"use client";

import {useState} from "react";
import JsonLd from './components/JsonLd';
import ResumeInput from "./components/ResumeInput";
import TailorButton from "./components/TailorButton";
import TailoredResumeChanges from "./components/TailoredResumeChanges";
import TailoredResumeOutput from "./components/TailoredResumeOutput";
import { analytics } from "./services/analytics";
import JobDescriptionInput from "./components/JobDescriptionInput";
import ParallaxContainer from "./components/ParallaxContainer";
import ParallaxBackground from "./components/ParallaxBackground";
import RelevancyScore, {RelevancyScores} from "./components/RelevancyScore";

const isDevelopment = process.env.NODE_ENV === 'development';

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [newResume, setNewResume] = useState("");
  const [changes, setChanges] = useState([]); // Store changes as an array of objects
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timer
  const [error, setError] = useState<string | null>(null);
  const [hasStartedTailoring, setHasStartedTailoring] = useState(false);
  const [detectedTitle, setDetectedTitle] = useState<string>("");
  const [titleConfidence, setTitleConfidence] = useState<number>(0);
  const [relevancyScores, setRelevancyScores] = useState<RelevancyScores | null>(null);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [showRelevancyScore, setShowRelevancyScore] = useState(() => {
    return !!relevancyScores || hasStartedTailoring;
  });

  // Frontend validation
  const validateInputs = () => {
    if (!resume || resume.length < 100) {
      setError("Please provide a more detailed resume (minimum 100 characters).");
      return false;
    }
    if (!jobDescription || jobDescription.length < 100) {
      setError("Please provide a more detailed job description (minimum 100 characters).");
      return false;
    }
    setError(null);
    return true;
  };

  const calculateRelevancy = async (tailoredResume: string) => {
    if (!resume || !tailoredResume || !jobDescription) {
      console.log('Missing required data:', {
        hasOriginalResume: !!resume,
        hasTailoredResume: !!tailoredResume,
        hasJobDescription: !!jobDescription
      });
      return;
    }

    try {
      console.log('Sending relevancy request with lengths:', {
        originalLength: resume.length,
        tailoredLength: tailoredResume.length,
        jobDescriptionLength: jobDescription.length
      });

      const response = await fetch('/api/relevancy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalResume: resume,
          tailoredResume,
          jobDescription
        })
      });

      console.log('Relevancy response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Relevancy error response:', errorData);
        throw new Error(`Failed to calculate relevancy scores: ${JSON.stringify(errorData)}`);
      }

      const scores = await response.json();
      console.log('Received relevancy scores:', scores);
      setRelevancyScores(scores);
      
      // Track relevancy scores
      if (scores && !scores.error) {
        analytics.trackEvent(analytics.events.RELEVANCY_SCORE, {
          success: true,
          before: scores.before,
          after: scores.after,
          improvement: scores.improvement.replace(/[+\-%]/g, ''),
          isPositive: scores.improvement.startsWith('+'),
          resumeLength: resume.length,
          jobDescriptionLength: jobDescription.length,
          detectedJobTitle: detectedTitle || 'none'
        });
      }
    } catch (error) {
      analytics.trackEvent(analytics.events.RELEVANCY_SCORE, {
        success: false,
        error: error instanceof Error ? error.message : error
      });
      console.error('Error calculating relevancy:', error);
      setScoringError(error instanceof Error ? error.message : 'Failed to calculate relevancy scores');
    }
  };

  const handleTailorResume = async () => {
    if (!isDevelopment && timerActive) return;
    if (!validateInputs()) return;

    const startTime = Date.now();

    // Track the initial tailor request
    analytics.trackEvent(analytics.events.RESUME_TAILOR, {
      resumeLength: resume.length,
      jobDescriptionLength: jobDescription.length,
      detectedJobTitle: detectedTitle || 'none'
    });

    setLoading(true);
    setHasStartedTailoring(true);
    setNewResume("");
    setChanges([]);
    setError(null);
    setRelevancyScores(null);
    setScoringError(null);
    setShowRelevancyScore(true);

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Handle rate limit specifically
        if (response.status === 429) {
          // If we get a timeRemaining value, use it to set the timer
          if (data.timeRemaining) {
            setTimeLeft(data.timeRemaining);
            startTimer();
          }
          
          // Track rate limit error
          analytics.trackEvent(analytics.events.RESUME_TAILOR_ERROR, {
            errorType: 'rate_limit',
            timeRemaining: data.timeRemaining,
            resumeLength: resume.length,
            jobDescriptionLength: jobDescription.length
          });
          
          throw new Error(data.message || "Rate limit exceeded. Please try again later.");
        }
        
        // Track other errors
        analytics.trackEvent(analytics.events.RESUME_TAILOR_ERROR, {
          errorType: 'api_error',
          statusCode: response.status,
          resumeLength: resume.length,
          jobDescriptionLength: jobDescription.length
        });
        
        throw new Error(data.message || "Error tailoring resume");
      }

      const data = await response.json();

      if (data.tailoredResume) {
        setNewResume(data.tailoredResume);
        
        // Calculate relevancy with the new resume
        calculateRelevancy(data.tailoredResume);
      }

      if (data.changes && Array.isArray(data.changes)) {
        setChanges(data.changes);
      }

      // Track successful tailoring
      analytics.trackEvent(analytics.events.RESUME_TAILOR_SUCCESS, {
        resumeLength: resume.length,
        jobDescriptionLength: jobDescription.length,
        processingTime: Date.now() - startTime,
        changesCount: data.changes?.length || 0,
        detectedJobTitle: detectedTitle || 'none'
      });

      setLoading(false);
      startTimer(); // Start the frontend timer as well
    } catch (error) {
      setLoading(false);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      console.error("Error:", error);
      
      // Track unhandled errors
      if (!(error instanceof Error && error.message?.includes("Rate limit"))) {
        analytics.trackEvent(analytics.events.RESUME_TAILOR_ERROR, {
          errorType: 'unhandled_error',
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          resumeLength: resume.length,
          jobDescriptionLength: jobDescription.length
        });
      }
    }
  };

  const startTimer = () => {
    if (isDevelopment) return;
    
    setTimerActive(true);
    setTimeLeft(60);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTitleDetected = (title: string, confidence: number) => {
    setDetectedTitle(title);
    setTitleConfidence(confidence);
  };

  return (
    <>
      <ParallaxBackground />
      <ParallaxContainer className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Hero Section with Parallax */}
        <div className="py-16 text-center" data-parallax="0.2">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text">
            AI Resume Tailor
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            Instantly customize your resume for any job posting using AI. 
            Get more interviews with perfectly tailored applications.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-8">
            <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full w-32 text-center">
              100% Free
            </span>
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full w-44 text-center">
              No Sign-up Required
            </span>
            <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full w-32 text-center">
              AI-Powered
            </span>
            <span className="px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded-full w-36 text-center">
              No Data Stored
            </span>
          </div>
        </div>

        {/* How it Works Section with Parallax */}
        <div className="mb-12" data-parallax="0.15">
          <h2 className="text-2xl font-semibold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">1</span>
              </div>
              <h3 className="font-medium mb-2">Paste Your Resume</h3>
              <p className="text-gray-600 dark:text-gray-300">Add your current resume to get started</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">2</span>
              </div>
              <h3 className="font-medium mb-2">Add Job Description</h3>
              <p className="text-gray-600 dark:text-gray-300">Paste the job posting you&apos;re targeting</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">3</span>
              </div>
              <h3 className="font-medium mb-2">Get Your Tailored Resume</h3>
              <p className="text-gray-600 dark:text-gray-300">Receive an optimized version instantly</p>
            </div>
          </div>
        </div>

        {/* Input Section with subtle parallax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-parallax="0.1">
          <ResumeInput
            label="Your Current Resume"
            placeholder="Paste your resume here..."
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          />
          <JobDescriptionInput
            label="Job Description for Tailoring"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            onTitleDetected={handleTitleDetected}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Tailor Button */}
        <TailorButton 
          loading={loading} 
          onClick={handleTailorResume} 
          timerActive={!isDevelopment && timerActive} 
          timeLeft={timeLeft} 
        />

        {/* Output Section - Only show if tailoring has started */}
        {hasStartedTailoring && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8" data-parallax="0.05">
            <div className="md:col-span-8">
              <TailoredResumeOutput 
                newResume={newResume} 
                loading={loading}
                detectedTitle={detectedTitle}
                confidence={titleConfidence}
              />
            </div>
            <div className="md:col-span-4">
              {(showRelevancyScore || relevancyScores) && (
                <RelevancyScore 
                  scores={relevancyScores} 
                  error={scoringError} 
                  loading={loading && showRelevancyScore} 
                  visible={showRelevancyScore}
                />
              )}
              <div className="mt-6">
                <TailoredResumeChanges changes={changes} loading={loading} />
              </div>
            </div>
          </div>
        )}
        <JsonLd />
      </ParallaxContainer>
    </>
  );
};

export default Home;
