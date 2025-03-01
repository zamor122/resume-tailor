import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "Frequently Asked Questions - AI Resume Tailor",
  description: "Get answers to common questions about AI Resume Tailor's relevancy scoring, ATS optimization, and job-specific resume tailoring features.",
};

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Frequently Asked Questions</h1>
      
      <div className="space-y-8">

      <section>
          <h2 className="text-2xl font-semibold mb-4">Using AI Resume Tailor</h2>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Is AI Resume Tailor free to use?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Yes, AI Resume Tailor is completely free to use with no hidden fees or subscriptions. 
                We don&apos;t even require you to create an account.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Does AI Resume Tailor store my resume data?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                No, we don&apos;t store your resume or job description data. All processing happens in real-time 
                and your information is discarded after the tailoring is complete. Your privacy is our priority.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">How often can I use the tool?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                To ensure fair usage for all users, there&apos;s a 60-second cooldown period between tailoring requests. 
                This gives you time to review your tailored resume and make any additional adjustments.
              </p>
            </div>
          </div>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">About Resume Relevancy Scoring</h2>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">How does the resume relevancy score work?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Our AI analyzes your resume against the job description to calculate a relevancy percentage. 
                After tailoring, you&apos;ll see both your original and new scores, showing exactly how much your 
                resume has improved. The score considers keyword matching, skills alignment, experience relevance, 
                and formatting optimization.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">How accurate is the relevancy scoring?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Our relevancy scoring uses advanced AI to simulate how ATS systems evaluate resumes. 
                While no system can perfectly predict every ATS, our scoring provides a reliable benchmark 
                for improvement. Users typically see a 30-60% increase in relevancy after tailoring.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">What&apos;s a good relevancy score?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                A score above 70% is generally considered good, while 85%+ is excellent. 
                However, even a 20% improvement can significantly increase your chances of getting 
                past ATS filters and into the hands of a hiring manager.
              </p>
            </div>
          </div>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Job-Specific Features</h2>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">How does job title detection work?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Our AI automatically analyzes the job description to detect the most likely job title. 
                This helps tailor your resume specifically for that role and provides more accurate 
                relevancy scoring.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Can I use this for any job type?</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Yes! AI Resume Tailor works for virtually any job type across industries. Whether you&apos;re 
                applying for technical roles, creative positions, management jobs, or entry-level positions, 
                our tool can help optimize your resume.
              </p>
            </div>
          </div>
        </section>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-lg mb-4">Ready to improve your resume&apos;s relevancy score?</p>
        <Link href="/" className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          Tailor Your Resume Now
        </Link>
      </div>
    </div>
  );
} 