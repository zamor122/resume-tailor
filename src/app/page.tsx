"use client";

import { useState } from "react";
import ResumeInput from "./components/ResumeInput";
import TailorButton from "./components/TailorButton";
import TailoredResumeOutput from "./components/TailoredResumeOutput";
import TailoredResumeChanges from "./components/TailoredResumeChanges";

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [newResume, setNewResume] = useState("");
  const [changes, setChanges] = useState([]); // Store changes as an array of objects
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timer

  const handleTailorResume = async () => {
    if (timerActive) return; // Prevent action if timer is active

    setLoading(true);
    setNewResume("");
    setChanges([]); // Reset changes when tailoring

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set the tailored resume and changes
        setNewResume(data.tailoredResume || "Error: No resume generated.");
        setChanges(data.changes || []); // Set changes as an empty array if none exist
        startTimer(); // Start the timer after a successful request
      } else {
        setNewResume("Error tailoring resume. Try again.");
      }
    } catch (error) {
      setNewResume("Server error. Please try again later.");
      console.error("Error tailoring resume:", error);
    }

    setLoading(false);
  };

  const startTimer = () => {
    setTimerActive(true);
    setTimeLeft(60); // Reset timer to 60 seconds

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
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Input Section */}
      <div className="grid md:grid-cols-2 gap-6">
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

      {/* Tailor Button */}
      <TailorButton 
        loading={loading} 
        onClick={handleTailorResume} 
        timerActive={timerActive} 
        timeLeft={timeLeft} 
      />

      {/* Output Section - Updated Grid Layout */}
      <div className="grid md:grid-cols-12 gap-8">
        {/* Resume Component - Takes up 8 columns */}
        <div className="md:col-span-8">
          <TailoredResumeOutput newResume={newResume} />
        </div>

        {/* Changes Component - Takes up 4 columns */}
        {newResume && changes.length > 0 && (
          <div className="md:col-span-4 bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700 h-fit sticky top-24">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Changes Made:
            </h3>
            <TailoredResumeChanges changes={changes} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
