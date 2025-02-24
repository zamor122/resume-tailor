"use client";

import {useState} from "react";
import JsonLd from './components/JsonLd';
import ResumeInput from "./components/ResumeInput";
import TailorButton from "./components/TailorButton";
import TailoredResumeChanges from "./components/TailoredResumeChanges";
import TailoredResumeOutput from "./components/TailoredResumeOutput";

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

  const handleTailorResume = async () => {
    if (!isDevelopment && timerActive) return;
    if (!validateInputs()) return;

    setLoading(true);
    setHasStartedTailoring(true);
    setNewResume("");
    setChanges([]);
    setError(null);

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error tailoring resume");
      }

      // Handle the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      console.log('Starting stream processing');

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          console.log('Stream chunk received:', done ? 'DONE' : 'NEW DATA');
          
          if (done) {
            console.log('Stream complete');
            setLoading(false);
            break;
          }

          const chunk = decoder.decode(value);
          accumulatedContent += chunk;
          
          // Try to extract and parse complete JSON objects during streaming
          if (accumulatedContent.includes('```json') && accumulatedContent.includes('}')) {
            try {
              let contentToParse = accumulatedContent;
              contentToParse = contentToParse.replace(/```json\n/, '');
              contentToParse = contentToParse.substring(0, contentToParse.lastIndexOf('}') + 1);
              contentToParse = contentToParse.trim();

              console.log('Attempting to parse streaming content');
              const parsedData = JSON.parse(contentToParse);
              console.log('Streaming parse successful:', {
                hasResume: Boolean(parsedData.tailoredResume),
                resumeLength: parsedData.tailoredResume?.length,
                changesCount: parsedData.changes?.length
              });
              
              if (parsedData.tailoredResume) {
                setLoading(false);
                // Send the complete chunk at once to maintain markdown formatting
                setNewResume(parsedData.tailoredResume);
              }
              if (parsedData.changes && Array.isArray(parsedData.changes)) {
                setChanges(parsedData.changes);
              }
            } catch (e) {
              console.log('Streaming parse attempt failed:', (e as Error).message);
            }
          }
        }
        startTimer();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Server error. Please try again later.");
      console.error("Error tailoring resume:", error);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Hero Section */}
      <div className="py-16 text-center">
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

      {/* How it Works Section */}
      <div className="mb-12">
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

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResumeInput
          label="Your Current Resume"
          placeholder="Paste your resume here..."
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
        <ResumeInput
          label="Job Description for Tailoring"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8">
            <TailoredResumeOutput newResume={newResume} loading={loading} />
          </div>
          <div className="md:col-span-4">
            <TailoredResumeChanges changes={changes} loading={loading} />
          </div>
        </div>
      )}
      <JsonLd />
    </div>
  );
};

export default Home;
