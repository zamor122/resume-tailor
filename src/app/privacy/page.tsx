export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose dark:prose-invert">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Collection</h2>
          <p className="mb-4">
            AI Resume Tailor is committed to protecting your privacy. We do not store any of the following:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Your resume content</li>
            <li>Job descriptions</li>
            <li>Generated results</li>
            <li>Personal information</li>
          </ul>
          <p>
            All processing is done in real-time and data is immediately discarded after generation.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Analytics</h2>
          <p>
            We use Umami Analytics to collect anonymous usage statistics. This helps us understand how 
            the tool is being used and improve it. The analytics data collected includes:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Page views</li>
            <li>Usage patterns</li>
            <li>Performance metrics</li>
          </ul>
          <p>
            No personally identifiable information is collected through analytics.
          </p>
          <p>
            We own our own analytics data and do not sell it to third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
          <p>
            We use the following third-party services:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Umami - For privacy-focused analytics</li>
            <li>Google AI - For resume processing (no data retention)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p>
            If you have any questions about our privacy policy, please contact us at{' '}
            <a href="mailto:hello@airesumetailor.com" className="text-green-600 hover:text-green-700">
              hello@airesumetailor.com
            </a>
          </p>
        </section>

        <section>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </section>
      </div>
    </div>
  );
} 