"use client";

import JobSearch from "../components/JobSearch";

export default function JobsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Hero Section */}
      <div className="py-16 text-center">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text">
          Job Search
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          Find the perfect job across LinkedIn, Indeed, and Glassdoor.
          Tailor your resume with one click.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-8">
          <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full w-32 text-center">
            Multi-source
          </span>
          <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full w-44 text-center">
            Real-time Search
          </span>
          <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full w-36 text-center">
            Jobs and More
          </span>
        </div>
      </div>

      <JobSearch />
    </div>
  );
} 