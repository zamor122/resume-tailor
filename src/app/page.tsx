"use client";

import { useState } from "react";
import ResumeInput from "./components/ResumeInput";
import TailorButton from "./components/TailorButton";
import TailoredResumeOutput from "./components/TailoredResumeOutput";
import TailoredResumeChanges from "./components/TailoredResumeChanges"; // Import the new component

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [newResume, setNewResume] = useState("");
  const [changes, setChanges] = useState<string[]>([]); // Store changes as an array of strings
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const handleTailorResume = async () => {
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
      } else {
        setNewResume("Error tailoring resume. Try again.");
      }
    } catch (error) {
      setNewResume("Server error. Please try again later.");
      console.error("Error tailoring resume:", error);
    }
  
    setLoading(false);
  };
  

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
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
      <TailorButton loading={loading} onClick={handleTailorResume} />

      {/* Output Section */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Resume Component */}
        <div className="md:col-span-1">
          <TailoredResumeOutput newResume={newResume} />
        </div>

        {/* Changes Component */}
        {newResume && changes.length > 0 && (
          <div className="md:col-span-1 bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Changes Made:</h3>
            <TailoredResumeChanges changes={changes} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
