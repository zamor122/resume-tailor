"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Use</h1>
          <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing the website at https://airesumetailor.com and all subdomains, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Use License</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Permission is granted to temporarily use AI Resume Tailor's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Modify or copy the source materials;</li>
                <li>Attempt to decompile or reverse engineer any software contained on AI Resume Tailor's website;</li>
                <li>Remove any copyright or other proprietary notations from the materials; or</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                This license shall automatically terminate if you violate any of these restrictions and may be terminated by AI Resume Tailor at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession whether in electronic or printed format.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Disclaimer</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                The materials on AI Resume Tailor's website are provided on an 'as is' basis. AI Resume Tailor makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Further, AI Resume Tailor does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Limitations</h2>
              <p className="text-gray-300 leading-relaxed">
                In no event shall AI Resume Tailor or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on AI Resume Tailor's website, even if AI Resume Tailor or an AI Resume Tailor authorized representative has been notified orally or in writing of the possibility of such damage. Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Accuracy of materials</h2>
              <p className="text-gray-300 leading-relaxed">
                The materials appearing on AI Resume Tailor website could include technical, typographical, or photographic errors. AI Resume Tailor does not warrant that any of the materials on its website are accurate, complete or current. AI Resume Tailor may make changes to the materials contained on its website at any time without notice. However AI Resume Tailor does not make any commitment to update the materials.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Modifications</h2>
              <p className="text-gray-300 leading-relaxed">
                AI Resume Tailor may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. User Consent and Platform Usage</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                By using our platform, you consent to our data collection practices as described in our Privacy Policy. Specifically:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>You consent to the use of analytics tools (Umami) to track usage patterns and improve our services.</li>
                <li>You acknowledge that your IP address may be tracked for security and rate limiting purposes.</li>
                <li>You understand that we use third-party services (Stripe, Supabase, Cerebras, etc.) to provide our services.</li>
                <li>You agree to comply with all applicable laws and regulations when using our platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Rate Limiting and Fair Usage Policy</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                To ensure fair access for all users and prevent abuse, we enforce rate limits on our AI services. These limits apply regardless of payment status and are designed to ensure equitable distribution of our shared resources.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                <strong>Rate Limits for Paid Access Tiers:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
                <li><strong>Default Limits:</strong> 5 requests per minute, 30 requests per hour, 200 requests per day per IP address.</li>
                <li><strong>For gpt-oss-120b Model:</strong> 3 requests per minute, 20 requests per hour, 150 requests per day per IP address.</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mb-4">
                These limits are more restrictive than our provider's global limits to ensure fair distribution across all users. Rate limits may be adjusted based on usage patterns and provider constraints.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you exceed these rate limits, you will receive a temporary service unavailability message with a retry timer. Rate limits are enforced per IP address to prevent abuse and ensure fair access for all users.
              </p>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify these rate limits at any time to maintain service quality and fair access for all users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:hello@airesumetailor.com" className="text-blue-400 hover:text-blue-300 underline">
                  hello@airesumetailor.com
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
