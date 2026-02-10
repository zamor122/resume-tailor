"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <p className="text-gray-300 leading-relaxed mb-6">
                Your privacy is important. At AI Resume Tailor, there are a few fundamental principles:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>We are thoughtful about the personal information we ask you to provide and the personal information that we collect about you through the operation of our services.</li>
                <li>We store personal information for only as long as we have a reason to keep it.</li>
                <li>We aim to make it as simple as possible for you to control what information on your website is shared publicly (or kept private), indexed by search engines, and permanently deleted.</li>
                <li>We aim for full transparency on how we gather, use, and share your personal information.</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <strong>By using our platform, you consent to:</strong> (1) our data collection practices as described in this Privacy Policy, (2) the use of analytics tools (Umami) to track usage patterns, and (3) IP address tracking for rate limiting and abuse prevention purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Who We Are and What This Policy Covers</h2>
              <p className="text-gray-300 leading-relaxed">
                This Privacy Policy applies to information that we collect about you when you use:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-2">
                <li>airesumetailor.com and all subdomains and domain variants.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Deleting your data</h2>
              <p className="text-gray-300 leading-relaxed">
                Users can delete data by emailing{" "}
                <a href="mailto:hello@airesumetailor.com" className="text-blue-400 hover:text-blue-300 underline">
                  hello@airesumetailor.com
                </a>{" "}
                and asking for data to be deleted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Information We Collect</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We only collect information about you if we have a reason to do so — for example, to provide our Services, to communicate with you, or to make our Services better.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                We collect information in three ways: if and when you provide information to us, automatically through operating our Services, and from outside sources. Now we'll go over what we collect.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Information You Provide to Us</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                It's probably no surprise that we collect information that you provide to us. The amount and type of information depends on the context and how we use the information. Here are some examples:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Basic Account Information:</strong> We ask for basic information from you in order to set up your account. For example, we require individuals who sign up for an AI Resume Tailor account to provide an email address — and that's it. You may provide us with more information — like your name — after you create your account, but we don't require that information to create an AI Resume Tailor account.</li>
                <li><strong>Content Information:</strong> Depending on the Services you use, you may also provide us with information about you in other forms (such as the content on your resume). For example, if you create a resume that includes biographic information about you, we will have that information!</li>
                <li><strong>Communications With Us:</strong> You may also provide us information when you respond to surveys, or communicate through chat about a support problem.</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Information We Collect Automatically</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We also collect some things automatically.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Usage Information:</strong> We collect information about your usage of our Services. For example, we collect information about the actions users perform on AI Resume Tailor — in other words, who did what, when, and to what thing on a site (e.g., [AI Resume Tailor User] created "[title of resume]" at [time/date]). We also collect information about what happens when you use our Services (e.g., page views, support document searches, features used by you, along with information about your device (e.g., screen size, name of cellular network, and mobile device manufacturer). We use this information to, for example, provide our Services to you, as well as get insights on how people use our Services, so we can make our Services better.</li>
                <li><strong>Rate Limiting Data:</strong> We collect and hash IP addresses for rate limiting purposes. Request timestamps and endpoints are tracked to enforce rate limits and prevent abuse. This data is used to ensure fair access for all users. Hashed IP addresses may be stored temporarily for rate limit enforcement.</li>
                <li><strong>Analytics and Usage Tracking (Umami):</strong> We use Umami analytics to track usage patterns, feature adoption, and service performance. Umami collects anonymized usage data including page views, button clicks, and feature usage. IP addresses are hashed before being sent to Umami. This data helps us improve our services and understand user needs. Umami is privacy-focused and does not use cookies or collect personal information.</li>
                <li><strong>Information from Cookies & Other Technologies:</strong> A cookie is a string of information that a website stores on a visitor's computer, and that the visitor's browser provides to the website each time the visitor returns. Pixel tags (also called web beacons) are small blocks of code placed on websites and emails. AI Resume Tailor uses cookies and other technologies like pixel tags to help us identify and track visitors, usage, and access preferences for our Services, as well as track and understand email campaign effectiveness and to deliver targeted ads for some users.</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Information We Collect from Other Sources</h3>
              <p className="text-gray-300 leading-relaxed">
                We may also get information about you from other sources. For example, if you create or log into your AI Resume Tailor account through another service (like Google), we will receive information from that service (such as your username, and some basic profile information) via the authorization procedures used by that service. The information we receive depends on which services you authorize and any options that are available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">How And Why We Use Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use information about you as mentioned above and for the purposes listed below:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>To provide our Services — for example, to set up and maintain your account, store your resume, or host it at a public URL;</li>
                <li>To further develop and improve our Services — for example by adding new features that we think our users will enjoy or will help them to create a resume or get a job more efficiently;</li>
                <li>To monitor and analyze trends and better understand how users interact with our Services, which helps us improve our Services and make them easier to use;</li>
                <li>To measure, gauge, and improve the effectiveness of our advertising, and better understand user retention and attrition — for example, we may analyze how many individuals upgraded their accounts after receiving a marketing message or the features used by those who continue to use our Services after a certain length of time;</li>
                <li>To monitor and prevent any problems with our Services, protect the security of our Services, detect and prevent fraudulent transactions and other illegal activities, fight spam, and protect the rights and property of AI Resume Tailor and others;</li>
                <li>To communicate with you, for example through an email, about offers or promotions related to AI Resume Tailor, to solicit your feedback, or keep you up to date on AI Resume Tailor and our products; and</li>
                <li>To personalize your experience using our Services, provide content recommendations (for example, suggesting improvements based on your Resume & experience), target our marketing messages to groups of our users (for example, those who work in a specific field, if entered on their profile), and serve relevant advertisements to some users.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Sharing Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We do not sell our users' private personal information.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                We share information about you in the limited circumstances spelled out below and with appropriate safeguards on your privacy:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Employees, and Independent Contractors:</strong> We may disclose information about you to our employees and individuals who are our independent contractors that need to know the information in order to help us provide our Services or to process the information on our behalf. We require our employees and independent contractors to follow this Privacy Policy for personal information that we share with them.</li>
                <li><strong>Third Party Vendors:</strong> We may share information about you with third party vendors who need to know information about you in order to provide their services to us. This group includes vendors that help us provide our Services to you (like payment providers that process your credit and debit card information (Stripe), email delivery services that help us stay in touch with you, customer chat and email support services that help us communicate with you, those that assist us with our marketing efforts (e.g. by providing tools for identifying a specific marketing target group or improving our marketing campaigns), those that help us understand and enhance our Services (like analytics providers, including Umami for privacy-friendly analytics tracking).</li>
                <li><strong>Legal Requests:</strong> We may disclose information about you in response to a subpoena, court order, or other governmental request.</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition of all or a portion of our business by another company, or in the unlikely event that AI Resume Tailor goes out of business or enters bankruptcy, user information would likely be one of the assets that is transferred or acquired by a third party. If any of these events were to happen, this Privacy Policy would continue to apply to your information and the party receiving your information may continue to use your information, but only consistent with this Privacy Policy.</li>
                <li><strong>With Your Consent:</strong> We may share and disclose information with your consent or at your direction.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Choices</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You have several choices available when it comes to information about you:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Limit the Information that You Provide:</strong> You are free to use AI Resume Tailor without an account. If you don't have an account, nothing you create or use (other than the automatic data collecting mentioned above) is saved. For example, If you create a resume without an account, no content from that resume is ever stored on any servers. If you do create an account, however, it's up to you what to include on your profile and content (which is stored by AI Resume Tailor). We only require an email address to create an account — nothing more. The rest is up to you.</li>
                <li><strong>Opt-Out of Electronic Communications:</strong> You may opt out of receiving promotional messages from us. Just follow the instructions in those messages, or toggle the setting on your account dashboard. If you opt out of promotional messages, we may still send you other messages, like those about your account and legal notices.</li>
                <li><strong>Set Your Browser to Reject Cookies:</strong> At this time, AI Resume Tailor adheres to "do not track" signals across all of our Services. You can also usually choose to set your browser to remove or reject browser cookies before using AI Resume Tailor's websites, with the drawback that certain features of AI Resume Tailor's websites may not function properly without the aid of cookies.</li>
                <li><strong>Close Your Account:</strong> While we hate to say goodbye, if you no longer want to use our Services, you can close your AI Resume Tailor account. You can close your account by emailing us at{" "}
                <a href="mailto:hello@airesumetailor.com" className="text-blue-400 hover:text-blue-300 underline">
                  hello@airesumetailor.com
                </a>{" "}
                and all of your data will be permanently deleted.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you are located in certain countries, including those that fall under the scope of the European General Data Protection Regulation (AKA the "GDPR"), data protection laws give you rights with respect to your personal data, subject to any exemptions provided by the law, including the rights to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Request access to your personal data;</li>
                <li>Request correction or deletion of your personal data;</li>
                <li>Object to our use and processing of your personal data;</li>
                <li>Request that we limit our use and processing of your personal data; and</li>
                <li>Request portability of your personal data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Other Things You May Want to Know</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Because AI Resume Tailor's Services are offered worldwide, the information about you that we process when you use the Services in the EU may be used, stored, and/or accessed by individuals operating outside the European Economic Area (EEA) who work for us, other members of our group of companies, or third party data processors. This is required for the purposes listed in the How and Why We Use Information section above. When providing information about you to entities outside the EEA, we will take appropriate measures to ensure that the recipient protects your personal information adequately in accordance with this Privacy Policy as required by applicable law. These measures include:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>In the case of US based entities, entering into European Commission approved standard contractual arrangements with them, or ensuring they have signed up to the EU-US Privacy Shield; or</li>
                <li>In the case of entities based in other countries outside the EEA, entering into European Commission approved standard contractual arrangements with them.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Rate Limiting and Abuse Prevention</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                To ensure fair access and prevent abuse, we track IP addresses (hashed) to enforce rate limits. This is necessary to prevent abuse and ensure fair access for all users.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Rate limit data is stored temporarily and used only for enforcement purposes.</li>
                <li>Hashed IP addresses may be shared with our analytics provider (Umami) for monitoring purposes.</li>
                <li>IP addresses are hashed using SHA-256 before storage or transmission to protect your privacy.</li>
                <li>Rate limit data is automatically cleaned up after 24 hours.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Ads and Analytics Services Provided by Others</h2>
              <p className="text-gray-300 leading-relaxed">
                If we ever decide to place ads on any of our Services, they may be delivered by advertising networks. Other parties may also provide analytics services via our Services. These ad networks and analytics providers may set tracking technologies (like cookies) to collect information about your use of our Services and across other websites and online services. These technologies allow these third parties to recognize your device to compile information about you or others who use your device. This information allows us and other companies to, among other things, analyze and track usage, determine the popularity of certain content, and deliver advertisements that may be more targeted to your interests. Please note this Privacy Policy only covers the collection of information by AI Resume Tailor and does not cover the collection of information by any third party advertisers or analytics providers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{" "}
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
