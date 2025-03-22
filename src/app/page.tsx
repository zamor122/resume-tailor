"use client";

import { useState } from "react";
import JsonLd from "./components/JsonLd";
import ResumeInput from "./components/ResumeInput";
import TailorButton from "./components/TailorButton";
import TailoredResumeChanges from "./components/TailoredResumeChanges";
import TailoredResumeOutput from "./components/TailoredResumeOutput";
import { analytics } from "./services/analytics";
import JobDescriptionInput from "./components/JobDescriptionInput";
import ParallaxContainer from "./components/ParallaxContainer";
import ParallaxBackground from "./components/ParallaxBackground";
import RelevancyScore, { RelevancyScores } from "./components/RelevancyScore";

const isDevelopment = process.env.NODE_ENV === "development";

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
  const [relevancyScores, setRelevancyScores] =
    useState<RelevancyScores | null>(null);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [showRelevancyScore, setShowRelevancyScore] = useState(() => {
    return !!relevancyScores || hasStartedTailoring;
  });

  // Frontend validation
  const validateInputs = () => {
    if (!resume || resume.length < 100) {
      setError(
        "Please provide a more detailed resume (minimum 100 characters)."
      );
      return false;
    }
    if (!jobDescription || jobDescription.length < 100) {
      setError(
        "Please provide a more detailed job description (minimum 100 characters)."
      );
      return false;
    }
    setError(null);
    return true;
  };

  const calculateRelevancy = async (tailoredResume: string) => {
    if (!resume || !tailoredResume || !jobDescription) {
      console.log("Missing required data:", {
        hasOriginalResume: !!resume,
        hasTailoredResume: !!tailoredResume,
        hasJobDescription: !!jobDescription,
      });
      return;
    }

    try {
      console.log("Sending relevancy request with lengths:", {
        originalLength: resume.length,
        tailoredLength: tailoredResume.length,
        jobDescriptionLength: jobDescription.length,
      });

      const response = await fetch("/api/relevancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalResume: resume,
          tailoredResume,
          jobDescription,
        }),
      });

      console.log("Relevancy response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Relevancy error response:", errorData);
        throw new Error(
          `Failed to calculate relevancy scores: ${JSON.stringify(errorData)}`
        );
      }

      const scores = await response.json();
      console.log("Received relevancy scores:", scores);
      setRelevancyScores(scores);

      // Track relevancy scores
      if (scores && !scores.error) {
        analytics.trackEvent(analytics.events.RELEVANCY_SCORE, {
          success: true,
          before: scores.before,
          after: scores.after,
          improvement: scores.improvement.replace(/[+\-%]/g, ""),
          isPositive: scores.improvement.startsWith("+"),
          resumeLength: resume.length,
          jobDescriptionLength: jobDescription.length,
          detectedJobTitle: detectedTitle || "none",
        });
      }
    } catch (error) {
      analytics.trackEvent(analytics.events.RELEVANCY_SCORE, {
        success: false,
        error: error instanceof Error ? error.message : error,
      });
      console.error("Error calculating relevancy:", error);
      setScoringError(
        error instanceof Error
          ? error.message
          : "Failed to calculate relevancy scores"
      );
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
      detectedJobTitle: detectedTitle || "none",
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
            errorType: "rate_limit",
            timeRemaining: data.timeRemaining,
            resumeLength: resume.length,
            jobDescriptionLength: jobDescription.length,
          });

          throw new Error(
            data.message || "Rate limit exceeded. Please try again later."
          );
        }

        // Track other errors
        analytics.trackEvent(analytics.events.RESUME_TAILOR_ERROR, {
          errorType: "api_error",
          statusCode: response.status,
          resumeLength: resume.length,
          jobDescriptionLength: jobDescription.length,
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
        detectedJobTitle: detectedTitle || "none",
      });

      setLoading(false);
      startTimer(); // Start the frontend timer as well
    } catch (error) {
      setLoading(false);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      console.error("Error:", error);

      // Track unhandled errors
      if (!(error instanceof Error && error.message?.includes("Rate limit"))) {
        analytics.trackEvent(analytics.events.RESUME_TAILOR_ERROR, {
          errorType: "unhandled_error",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          resumeLength: resume.length,
          jobDescriptionLength: jobDescription.length,
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
      <ParallaxContainer className="container mx-auto px-4 py-8 max-w-9xl space-y-8">
        {/* Hero Section with Parallax */}
        <div className="py-16 text-center" data-parallax="0.2">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 inline-block text-transparent bg-clip-text">
            AI Resume Tailor
          </h1>
          <p className="text-xl font-medium text-foreground-darker dark:text-foreground-light mb-6 max-w-2xl mx-auto">
            Instantly customize your resume for any job posting using AI. Get
            more interviews with perfectly tailored applications that score
            higher on ATS systems.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-8">
            <span className="px-3 py-1 text-sm font-medium bg-green-200 text-green-800 rounded-full w-32 text-center shadow-sm hover:bg-green-300 transition-colors">
              100% Free
            </span>
            <span className="px-3 py-1 text-sm font-medium bg-cyan-200 text-cyan-800 rounded-full w-44 text-center shadow-sm hover:bg-cyan-300 transition-colors">
              No Sign-up Required
            </span>
            <span className="px-3 py-1 text-sm font-medium bg-fuchsia-200 text-fuchsia-800 rounded-full w-32 text-center shadow-sm hover:bg-fuchsia-300 transition-colors">
              AI-Powered
            </span>
            <span className="px-3 py-1 text-sm font-medium bg-amber-200 text-amber-800 rounded-full w-36 text-center shadow-sm hover:bg-amber-300 transition-colors">
              No Data Stored
            </span>
          </div>
        </div>

        {/* How it Works Section with Parallax */}
        <div className="mb-12" data-parallax="0.15">
          <h2 className="text-3xl font-bold gradient-how-it-works mb-8">
            How It Works
          </h2>{" "}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="neu-flat p-6 text-center hover:scale-105 transition-all duration-300">
              <div className="neu-circle-cyan w-12 h-12 mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl text-white font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2 gradient-text-cyan">
                Paste Your Resume
              </h3>
              <p className="text-base neu-text font-normal">
                Add your current resume to get started
              </p>
            </div>
            <div className="neu-flat p-6 text-center hover:scale-105 transition-all duration-300">
              <div className="neu-circle-pink w-12 h-12 mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl text-white font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2 gradient-text-pink">
                Add Job Description
              </h3>
              <p className="text-base neu-text font-normal">
                Paste the job posting you&apos;re targeting
              </p>
            </div>
            <div className="neu-flat p-6 text-center hover:scale-105 transition-all duration-300">
              <div className="neu-circle-amber w-12 h-12 mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl text-white font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2 gradient-text-amber">
                Get Your Tailored Resume
              </h3>
              <p className="text-base neu-text font-normal">
                Receive an optimized version instantly
              </p>
            </div>
            <div className="neu-flat p-6 text-center hover:scale-105 transition-all duration-300">
              <div className="neu-circle-emerald w-12 h-12 mx-auto mb-6 flex items-center justify-center">
                <span className="text-2xl text-white font-bold">4</span>
              </div>
              <h3 className="text-xl font-bold mb-2 gradient-text-emerald">
                See Your Relevancy Score
              </h3>
              <p className="text-base neu-text font-normal">
                Track how well your resume matches the job
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-12" data-parallax="0.12">
          <h2 className="text-2xl font-semibold text-center mb-8 bg-gradient-to-r from-amber-500 to-fuchsia-500 inline-block text-transparent bg-clip-text">
            Smart Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="neu-flat bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold text-lg mb-2 text-cyan-700 dark:text-cyan-300">
                Relevancy Scoring
              </h3>
              <p className="text-base neu-text font-normal">
                See exactly how your original and tailored resumes match the job
                description with quantifiable scores.
              </p>
            </div>
            <div className="neu-flat bg-gradient-to-br from-fuchsia-50 to-purple-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold text-lg mb-2 text-fuchsia-700 dark:text-fuchsia-300">
                Job Title Detection
              </h3>
              <p className="text-base neu-text font-normal">
                Our AI automatically identifies the job position from the
                description to better tailor your resume.
              </p>
            </div>
            <div className="neu-flat bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold text-lg mb-2 text-amber-700 dark:text-amber-300">
                Change Summary
              </h3>
              <p className="text-base neu-text font-normal">
                Review a detailed list of changes made to your resume and
                understand why they improve your application.
              </p>
            </div>
          </div>
        </div>

        {/* Input Section with subtle parallax */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          data-parallax="0.1"
        >
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
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Tailor Button */}
        <div className="text-center" data-parallax="0.08">
          <TailorButton
            loading={loading}
            onClick={handleTailorResume}
            timerActive={!isDevelopment && timerActive}
            timeLeft={timeLeft}
          />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Get instant ATS-friendly resume optimization with relevancy scoring
          </p>
        </div>

        {/* Output Section - Only show if tailoring has started */}
        {hasStartedTailoring && (
          <div
            className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8"
            data-parallax="0.05"
          >
            <div className="md:col-span-8">
              <div className="output-container rounded-lg shadow-lg p-6 border border-cyan-200 dark:border-cyan-800">
                <h3 className="text-3xl font-semibold mb-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 inline-block text-transparent bg-clip-text">
                  Your Tailored Resume
                </h3>
                <TailoredResumeOutput
                  newResume={newResume}
                  loading={loading}
                  detectedTitle={detectedTitle}
                  //confidence={titleConfidence}
                />
              </div>
            </div>
            <div className="md:col-span-4">
              {(showRelevancyScore || relevancyScores) && (
                <div className="output-container rounded-lg shadow-lg p-6 mb-6 border border-fuchsia-200 dark:border-fuchsia-800">
                  <h3 className="text-lg font-semibold mb-3 bg-gradient-to-r from-amber-500 to-pink-500 inline-block text-transparent bg-clip-text">
                    Resume Relevancy
                  </h3>
                  <RelevancyScore
                    scores={relevancyScores}
                    error={scoringError}
                    loading={loading && showRelevancyScore}
                    visible={showRelevancyScore}
                  />
                </div>
              )}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-amber-200 dark:border-amber-800">
                <h3 className="text-lg font-semibold mb-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 inline-block text-transparent bg-clip-text">
                  Improvement Summary
                </h3>
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
