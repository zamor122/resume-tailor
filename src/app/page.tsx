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
  const [relevancyScores, setRelevancyScores] =
    useState<RelevancyScores | null>(null);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [showRelevancyScore, setShowRelevancyScore] = useState(() => {
    return !!relevancyScores || hasStartedTailoring;
  });

  // Function to scroll to a section
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
    if (analytics && analytics.trackEvent) {
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_ANALYSIS, {
        title,
        confidence,
        success: true
      });
    }
  };

  return (
    <>
      <ParallaxBackground />
      <ParallaxContainer className="container mx-auto px-4 py-8 max-w-9xl space-y-8">
        {/* Hero Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Tailor Your Resume <span className="gradient-text-cyan">Instantly</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl">
              Match your resume to job descriptions with AI precision. Get more interviews
              with tailored content that highlights your most relevant skills and experience.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-lg transition-all duration-300 font-medium"
                onClick={() => scrollToSection('tailorResume')}
              >
                Get Started
              </button>
              <button 
                className="px-8 py-3 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg transition-all duration-300 font-medium border border-gray-200 dark:border-gray-700"
                onClick={() => scrollToSection('howItWorks')}
              >
                How It Works
              </button>
            </div>
          </div>
        </section>

        {/* How it Works Section with Parallax */}
        <div id="howItWorks" className="mb-12 rounded-xl p-8" data-parallax="0.15">
          <h2 className="text-4xl font-bold mb-8 text-center">
            How It <span className="gradient-text-amber">Works</span>
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-all duration-300 border border-cyan-200 dark:border-cyan-800/30">
              <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center rounded-full bg-cyan-400 dark:bg-cyan-900">
                <span className="text-2xl text-cyan-900 dark:text-cyan-400 font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-cyan-600 dark:text-cyan-400">
                Paste Your Resume
              </h3>
              <p className="text-base text-gray-700 dark:text-gray-300 font-normal">
                Add your current resume to get started
              </p>
            </div>
            <div className=" p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-all duration-300 border border-pink-200 dark:border-pink-800/30">
              <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
                <span className="text-2xl text-pink-600 dark:text-pink-400 font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-pink-600 dark:text-pink-400">
                Add Job Description
              </h3>
              <p className="text-base text-gray-700 dark:text-gray-300 font-normal">
                Paste the job posting you&apos;re targeting
              </p>
            </div>
            <div className=" p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-all duration-300 border border-amber-200 dark:border-amber-800/30">
              <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <span className="text-2xl text-amber-600 dark:text-amber-400 font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-amber-600 dark:text-amber-400">
                Get Your Tailored Resume
              </h3>
              <p className="text-base text-gray-700 dark:text-gray-300 font-normal">
                Receive an optimized version instantly
              </p>
            </div>
            <div className=" p-6 rounded-xl shadow-md text-center hover:shadow-lg transition-all duration-300 border border-emerald-200 dark:border-emerald-800/30">
              <div className="w-12 h-12 mx-auto mb-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <span className="text-2xl text-emerald-600 dark:text-emerald-400 font-bold">4</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-emerald-600 dark:text-emerald-400">
                See Your Relevancy Score
              </h3>
              <p className="text-base text-gray-700 dark:text-gray-300 font-normal">
                Track how well your resume matches the job
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="py-12 md:py-20" data-parallax="0.15">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900 dark:text-gray-100">
              <span className="gradient-text-emerald">Smart Features</span> For Your Job Search
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="feature-card">
                <div className="w-14 h-14 mb-4 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                  <svg className="w-8 h-8 text-cyan-900 dark:text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">AI-Powered Analysis</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Our AI engine analyzes job descriptions and your resume to identify the perfect match points and improvement opportunities.
                </p>
              </div>
              
              {/* Feature 2 */}
              <div className="feature-card">
                <div className="w-14 h-14 mb-4 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-pink-500 dark:text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Instant Tailoring</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Get a perfectly tailored resume in seconds, highlighting your most relevant skills and experience for each job application.
                </p>
              </div>
              
              {/* Feature 3 */}
              <div className="feature-card">
                <div className="w-14 h-14 mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-500 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">ATS-Friendly Output</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Our tailored resumes are optimized for Applicant Tracking Systems, ensuring your application passes through digital filters.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Input Section with subtle parallax */}
        <div
          id="tailorResume"
          className="grid grid-cols-1 md:grid-cols-2 gap-12"
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
            className="bg-pink-50 border border-pink-200 text-pink-700 px-4 py-3 rounded-lg relative dark:bg-pink-900/20 dark:border-pink-800/30 dark:text-pink-400"
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
              <div className="output-container">
                <h3 className="text-3xl font-semibold mb-4 gradient-text-emerald">
                  Your Tailored Resume
                </h3>
                <TailoredResumeOutput
                  newResume={newResume}
                  loading={loading}
                  detectedTitle={detectedTitle}
                />
              </div>
            </div>
            <div className="md:col-span-4">
              {(showRelevancyScore || relevancyScores) && (
                <div className="output-container mb-12">
                  <h3 className="text-lg font-semibold mb-3 text-emerald-600 dark:text-emerald-400">
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
              <div className="improvement-container">
                <h3 className="text-lg font-semibold mb-3 text-amber-600 dark:text-amber-400">
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
