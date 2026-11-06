import React from "react";
import { TIME_BASED_TIERS, FREE_RESUME_LIMIT } from "@/app/config/pricing";

/**
 * Deep, honest comparison content for the /alternatives/* pages.
 *
 * Why this exists: the six /alternatives/* pages target the highest-intent
 * searches we have ("jobscan alternative", "teal alternative") but were thin —
 * a summary table, a short intro and a feature list. Thin pages do not outrank
 * the incumbents, and they do not get quoted by AI answer engines.
 *
 * The content is written ONCE here and keyed by competitor name, so the six
 * pages share one renderer instead of copy-pasting the same markup six times.
 *
 * Ground rules baked in:
 *  - Competitor prices are limited to the verified set from RESEARCH.md. Where
 *    we have no primary source (Resume.io, Zety) we state NO figure.
 *  - No invented statistics, review counts, ratings, user numbers, testimonials
 *    or search volumes. Where a persuasive line wants a number we do not own,
 *    it is phrased without the number.
 *  - We never claim to use any ATS vendor's exact algorithms, and we never
 *    guarantee interviews or outcomes.
 *  - OUR price is derived from TIME_BASED_TIERS, never typed in.
 *  - Each section carries a clear heading and stands alone, so an answer engine
 *    can lift a single passage with the relevant facts (price, what it does,
 *    the trade-off) intact.
 */

interface FeatureRow {
  feature: string;
  competitor: string;
  ours: string;
}

interface Fact {
  heading: string;
  body: string;
}

interface CompetitorDeepDive {
  /** A self-contained factual description of what the competitor is. */
  overview: string;
  /** What it genuinely does well (grounded in our cited research). */
  strengths: string[];
  /** Where it falls down, or honest gaps in our research. */
  tradeoffs: string[];
  /** The deeper feature-by-feature breakdown (beyond the summary table). */
  featureRows: FeatureRow[];
  /** Who the competitor is actually for. */
  whoItsFor: string;
  /** Intro sentence for the honest "when they're better" section. */
  betterChoiceIntro: string;
  /** Honest reasons to pick the competitor over us. */
  betterChoiceWhen: string[];
  /** A balanced closing line about when WE are the better fit. */
  balanceNote: string;
  /** Their side of the pricing comparison (verified facts only). */
  pricingFact: string;
  /** Self-contained, citable factual passages. */
  facts: Fact[];
}

const CONTENT: Record<string, CompetitorDeepDive> = {
  Jobscan: {
    overview:
      "Jobscan is one of the longest-running ATS resume checkers. You paste a resume and a job description and it returns a match rate plus what it calls ATS and recruiter findings, including the keywords your resume is missing. Around that core it sells a wider pipeline: a resume builder, a LinkedIn optimiser, an AI bullet generator, cover letters, interview practice and a browser extension. Its guidance is tuned to the applicant tracking system it detects — for example, a report tuned to how Workday reads a resume.",
    strengths: [
      "Keyword-gap detection is the feature reviewers most often credit with helping them — it surfaces keywords a resume has left out.",
      "Its advice adapts to the specific ATS it detects rather than giving one-size-fits-all guidance.",
      "As a platform it does far more than score: a resume builder, LinkedIn optimiser, bullet generator, cover letters, interview practice and a Chrome extension all live in one account.",
      "The ATS score is free to start, so you get a real diagnostic before paying.",
    ],
    tradeoffs: [
      "Reviewers describe the match score as sometimes arbitrary — a low number with a vague reason — which makes it hard to know what to fix.",
      "Its AI \u201coptimize\u201d feature has been criticised for changing the document's layout rather than improving it in place.",
      "Suggested bullet points are described by reviewers as stiff and in need of manual editing.",
      "It is priced as a recurring subscription, and billing and cancellation are among the most common complaints about it.",
    ],
    featureRows: [
      {
        feature: "Approach",
        competitor: "Score and diagnose your resume, plus a wider job-search pipeline",
        ours: "Tailor one resume to one specific job posting",
      },
      {
        feature: "Core strength",
        competitor: "Keyword gaps and ATS-specific tips; breadth of tools",
        ours: "Rewriting in place with ATS-friendly formatting",
      },
      {
        feature: "The rewrite",
        competitor: "Analysis; its AI optimise can alter the layout",
        ours: "A tailored resume that keeps your voice and layout",
      },
      {
        feature: "Priced for",
        competitor: "An ongoing, high-volume job search",
        ours: "A single application or a short sprint",
      },
    ],
    whoItsFor:
      "Jobscan is for the applicant running a long, high-volume search who wants one subscription to cover checking, optimising and interview prep, and who wants diagnostics tuned to each ATS. If you are applying to dozens of roles over months, that breadth is exactly the point.",
    betterChoiceIntro:
      "AI Resume Tailor is a deliberately narrow tool: it tailors one resume to one job posting. Jobscan does much more, so there are real situations where Jobscan is the better choice. Pick Jobscan if:",
    betterChoiceWhen: [
      "You want deep, ATS-specific diagnostics across many applications and value its per-ATS guidance over a single tailoring pass.",
      "You want a full pipeline rather than one task — LinkedIn optimisation, interview practice, a resume builder and a browser extension in one account.",
      "You are running a months-long search and a recurring subscription is worth it because you will use the tool every month.",
      "You want a tool with a long track record and a large third-party review footprint.",
    ],
    balanceNote:
      "If instead you are tailoring your resume for one or two specific jobs and do not want a recurring charge, a one-time pass is the simpler fit — and that single job is the one AI Resume Tailor is built for.",
    pricingFact:
      "Jobscan is a recurring subscription: its monthly plan is $49.95 per month, and its quarterly plan is $29.98 per month. That access renews until you cancel, and billing and cancellation are among the most frequent complaints about it.",
    facts: [
      {
        heading: "What Jobscan does well",
        body: "Jobscan's core strength is keyword-gap detection: it shows the keywords a resume is missing for a specific job description, and its tips change based on the applicant tracking system it detects — for example, tuning a report to how Workday reads a resume. That combination of keyword gaps plus ATS-specific advice is why high-volume applicants trust it.",
      },
      {
        heading: "Where Jobscan falls short",
        body: "Reviewers describe two recurring problems: a match score that can read as arbitrary (a low number with an unclear reason), and an AI optimise step that can change the document's layout instead of improving it in place. Suggested bullet points are also described as stiff and needing manual editing.",
      },
      {
        heading: "The trade-off in one line",
        body: "Jobscan is a platform tuned for a long, high-volume search; AI Resume Tailor is a single-purpose tool tuned for tailoring one resume to one job posting.",
      },
    ],
  },

  Teal: {
    overview:
      "Teal is a job-search platform built around a tracker. Its job tracker works like a lightweight CRM for applications: save jobs from anywhere with a browser extension, keep per-job checklists, use follow-up email templates and manage contacts. It also scores your resume against a posting and breaks that posting's keywords into requirements, responsibilities and preferred qualifications. The free tier is unusually generous on tracking.",
    strengths: [
      "The job tracker is the part reviewers rave about — it replaces a spreadsheet for managing dozens of applications.",
      "The free tier does not cap how many job listings you can store, which reviewers single out as a genuine advantage.",
      "Its keyword breakdown splits a posting into requirements, responsibilities and preferred qualifications — a more useful cut than a single keyword list.",
      "A browser extension lets you save jobs from anywhere, and the platform bundles cover letters and resume matching.",
    ],
    tradeoffs: [
      "Tailoring is manual at scale: reviewers describe going through and adding keywords to each resume by hand as tedious.",
      "Its AI-generated cover letters draw criticism, including reported misspellings of the user's own name.",
      "Billing and cancellation are among its most common complaints, as is unwanted email after signing up.",
      "Some reviewers report no way to download a Word file, which matters if you want to own an editable copy.",
    ],
    featureRows: [
      {
        feature: "Primary job",
        competitor: "Run a job search: track applications, save jobs, follow up",
        ours: "Tailor one resume to one job posting",
      },
      {
        feature: "The tracker",
        competitor: "Yes — a full job-search CRM",
        ours: "None — a single focused tool",
      },
      {
        feature: "Keyword insight",
        competitor: "Splits a posting into requirements, responsibilities and preferred",
        ours: "Extracts the keywords you are missing to rewrite the resume",
      },
      {
        feature: "Tailoring",
        competitor: "Manual, per resume",
        ours: "Automated, one pass per posting",
      },
    ],
    whoItsFor:
      "Teal is for the organised searcher who wants one place to run the whole search: dozens of saved jobs, per-job checklists, follow-up reminders and contacts. If your problem is that you are many applications in and drowning in autorejection emails, a tracker is the tool you actually need.",
    betterChoiceIntro:
      "If your problem is organising a large search rather than tailoring one resume, Teal is the better choice. Pick Teal if:",
    betterChoiceWhen: [
      "You are managing many applications at once and want a tracker to replace your spreadsheet.",
      "You want per-job checklists, follow-up email templates and contact management in the same place.",
      "You value a free tier that does not cap how many jobs you can save.",
      "You want your job-search software to be a workspace you live in, not a single-purpose tool.",
    ],
    balanceNote:
      "If you already keep your search organised — a spreadsheet, a notes app, whatever works — and your bottleneck is producing a tailored resume for each posting, AI Resume Tailor removes that step; a full tracker would be overhead.",
    pricingFact:
      "Teal's paid access is $29 per 30 days and, like the rest of this category, it is a recurring subscription rather than a one-time purchase. Teal also offers a free tier for tracking.",
    facts: [
      {
        heading: "What Teal does well",
        body: "Teal's differentiator is its job tracker — a CRM for a job search. It stores jobs saved from anywhere via a browser extension, keeps per-job checklists, and includes follow-up email templates and contact management. Reviewers repeatedly say it replaced their spreadsheet, and its free tier does not cap how many job listings you can store.",
      },
      {
        heading: "Where Teal falls short",
        body: "Reviewers describe tailoring as manual: adding keywords to each resume by hand is called tedious. Its AI cover letters draw criticism, including reported misspellings of the user's own name. Billing, cancellation and unwanted email are among its most common complaints, and some users report no way to download a Word file.",
      },
      {
        heading: "The trade-off in one line",
        body: "Teal is a workspace for a long, organised search; AI Resume Tailor is a single-purpose tool for turning one job posting into one tailored resume.",
      },
    ],
  },

  Rezi: {
    overview:
      "Rezi is a broad AI resume toolkit. It bundles a resume builder, a resume checker, a keyword scanner, bullet-point and summary writers, cover-letter and resignation-letter generators, job search and interview practice, plus a mobile app, a browser extension and an option to manage resumes inside large language models. Its checker produces a score across a set of metrics and supports keyword targeting. It is the only tool in this comparison to offer a one-time Lifetime plan alongside its monthly subscription.",
    strengths: [
      "It is unusually broad — builder, checker, keyword scanner, cover letters, interview practice and job search under one account.",
      "It offers a Lifetime Plan at $149 one-time alongside its $29/month subscription, which is closer to a one-time model than most competitors.",
      "It has a mobile app, a browser extension and a workflow for managing resumes inside LLMs.",
      "Its checker scores against a defined set of metrics and supports targeting keywords to a specific posting.",
    ],
    tradeoffs: [
      "We could not verify Rezi's specific weaknesses: its third-party review profile is thin and the major review platforms were not readable during our research. We are not going to invent complaints we cannot source.",
      "Like most of this category, its default paid plan is a recurring subscription; the one-time option is the separate $149 Lifetime Plan.",
    ],
    featureRows: [
      {
        feature: "Primary job",
        competitor: "A broad toolkit: build, check, generate and prep in one account",
        ours: "Tailor one resume to one job posting",
      },
      {
        feature: "Breadth",
        competitor: "Builder, checker, cover letters, interview practice, mobile app",
        ours: "One focused task",
      },
      {
        feature: "One-time option",
        competitor: "Yes — a $149 Lifetime Plan",
        ours: "Yes — a one-time pass, no subscription",
      },
      {
        feature: "Priced for",
        competitor: "An all-purpose resume and search toolkit",
        ours: "A single application or a short sprint",
      },
    ],
    whoItsFor:
      "Rezi is for someone who wants one account to cover building, checking and generating resume and cover-letter material, likes the idea of a one-time Lifetime purchase, and wants extras such as a mobile app or LLM integration. If you want a broad toolkit, Rezi offers a lot in one place.",
    betterChoiceIntro:
      "Rezi bundles more than we do, and it is the closest competitor to a one-time model. It is the better choice if:",
    betterChoiceWhen: [
      "You want a broad, all-in-one resume toolkit rather than a single tailoring step.",
      "You want a one-time purchase — Rezi's $149 Lifetime Plan is a genuine one-time option, alongside its $29/month subscription.",
      "You want a mobile app, a browser extension, or to manage resumes inside an LLM.",
      "You want the resume built and checked inside the same tool you tailor in.",
    ],
    balanceNote:
      "If you already have a resume you are happy with and only need it matched to a specific posting, a full toolkit is more than you need — a one-time pass does that one step.",
    pricingFact:
      "Rezi's default paid plan is a $29 per month subscription, and it also offers a Lifetime Plan at $149 as a one-time purchase on top of that. It is the only competitor in this comparison with a genuine one-time option.",
    facts: [
      {
        heading: "What Rezi does well",
        body: "Rezi is the broadest toolkit in this comparison: a resume builder and checker, a keyword scanner, bullet and summary writers, cover-letter and resignation-letter generators, job search, interview practice, a mobile app, a browser extension and LLM integration — most of it described as included in the paid plan.",
      },
      {
        heading: "Rezi's one-time option",
        body: "Rezi offers a Lifetime Plan at $149 as a one-time purchase on top of its $29/month subscription. It is the only competitor in this comparison with a genuine one-time option, which makes it the closest in spirit to AI Resume Tailor's one-time pricing — at a higher price.",
      },
      {
        heading: "An honest gap in our research",
        body: "We could not verify Rezi's specific weaknesses. Its third-party review profile is thin and the major review platforms were not readable during our research, so this page does not claim any. Where we cannot source a criticism, we do not make one.",
      },
    ],
  },

  Kickresume: {
    overview:
      "Kickresume is a resume and cover-letter builder built around templates. It offers a large template library, a large gallery of resume examples, a personal-website builder and AI writing tools, with a free tier that includes a set of templates and unlimited downloads. Its paid plans add AI tailoring and the full template set.",
    strengths: [
      "Template choice is the point: a large library of resume and cover-letter templates, plus a big gallery of examples for inspiration.",
      "Its free tier is generous — a set of resume and cover-letter templates with unlimited downloads.",
      "The interface is repeatedly called exceptionally user-friendly, and reviewers praise building a polished, professional-looking resume in minutes.",
      "It bundles extras: a personal-website builder and mobile apps.",
    ],
    tradeoffs: [
      "Its tailored output works from Kickresume's own converted copy of your resume, not your original file — its support has confirmed that some information may not survive the conversion, and tailoring only iterates on what it has already generated.",
      "Some users do not discover the import options and end up retyping their resume by hand.",
      "Its AI tailoring has an anti-abuse cap: reviewers report hitting a limit well before \u201cunlimited\u201d, and support has confirmed the cap exists.",
      "Its privacy terms allow generated material to be used to train its AI models, and its support is described as slow to respond.",
    ],
    featureRows: [
      {
        feature: "Primary job",
        competitor: "Build a designed resume from a template",
        ours: "Tailor your existing resume to a job posting",
      },
      {
        feature: "Starting point",
        competitor: "A template — you fill it in",
        ours: "Your existing resume — we adapt it",
      },
      {
        feature: "Tailoring",
        competitor: "Works from its converted copy, so source content can be lost",
        ours: "Built to preserve your original content",
      },
      {
        feature: "Design",
        competitor: "A large template and example library",
        ours: "ATS-friendly formatting, no design required",
      },
    ],
    whoItsFor:
      "Kickresume is for someone who wants a well-designed resume and would rather start from a template than edit an existing document — and who values a big library of examples to draw on. If design polish and inspiration matter more than tailoring an existing resume, it earns its place.",
    betterChoiceIntro:
      "Kickresume is genuinely strong at design and templates. It is the better choice if:",
    betterChoiceWhen: [
      "You want to build a new, designed resume from a template rather than tailor an existing one.",
      "You want a large library of resume examples and templates for inspiration.",
      "You want a free tier you can download from without upgrading.",
      "You want your resume, cover letter and a personal website in one place.",
    ],
    balanceNote:
      "If you already have a resume you like and the goal is matching it to a specific posting, starting over in a template adds work rather than removing it — tailoring the document you have is the faster path.",
    pricingFact:
      "Kickresume's monthly plan is $24 per month, or $8 per month billed annually. Like most of this category it is a recurring subscription, and its free tier includes a set of templates with unlimited downloads.",
    facts: [
      {
        heading: "What Kickresume does well",
        body: "Kickresume leads with design: a large template library, a big gallery of resume examples, AI writing tools and a personal-website builder. It has one of the largest third-party review footprints in this comparison, and reviewers consistently praise how user-friendly it is and how quickly it produces a polished result.",
      },
      {
        heading: "Where Kickresume falls short",
        body: "Kickresume's tailoring works from its own converted copy of your resume, not your original upload; its support has confirmed that information may not survive the conversion, so content dropped on import does not reappear. Reviewers also report hitting an anti-abuse cap on AI tailoring despite an \u201cunlimited\u201d label, and its privacy terms allow generated material to be used to train its AI models.",
      },
      {
        heading: "The trade-off in one line",
        body: "Kickresume is a design-first builder that starts you in a template; AI Resume Tailor is a tailoring tool that starts from the resume you already have.",
      },
    ],
  },

  "Resume.io": {
    overview:
      "Resume.io is a template-based resume builder. Like Zety, it is aimed at building a resume inside the tool from a template, with a guided editor and cover-letter features. Its exact pricing is not something we were able to verify from a primary source, so this page does not quote a figure; it is marketed with a free trial, and a user report describes a trial that auto-renews if you do not cancel in time.",
    strengths: [
      "It is a well-known, template-driven resume builder.",
      "It is built for building a designed resume inside a guided editor, which suits someone creating a resume from scratch.",
    ],
    tradeoffs: [
      "Its price is not something we could verify from a primary source, so we do not state one — check their site directly.",
      "It is marketed with a free trial. A user report describes that trial as auto-renewing if you do not cancel in time, and the free download as plain text, which is worth checking before you hand over card details.",
    ],
    featureRows: [
      {
        feature: "Primary job",
        competitor: "Build a resume from a template in a guided editor",
        ours: "Tailor your existing resume to a job posting",
      },
      {
        feature: "Starting point",
        competitor: "A template — you fill it in",
        ours: "Your existing resume — we adapt it",
      },
      {
        feature: "Pricing",
        competitor: "Not verified; marketed with a free trial",
        ours: "A one-time pass, no subscription",
      },
      {
        feature: "Free download",
        competitor: "A user report describes the free download as plain text",
        ours: "PDF and Markdown on paid access",
      },
    ],
    whoItsFor:
      "Resume.io is for someone who wants to build a designed resume inside a guided, template-driven editor — typically a first resume or a design refresh — and who is comfortable confirming the trial and billing terms themselves before signing up.",
    betterChoiceIntro:
      "Because we could not verify Resume.io's pricing, we will not argue about cost. On the product itself, it is the better choice if:",
    betterChoiceWhen: [
      "You want to build a new resume from a template in a guided editor rather than tailor an existing one.",
      "You want a step-by-step builder designed for someone creating a resume from scratch.",
      "You are comfortable with a trial-based signup and will confirm the billing and cancellation terms yourself.",
      "You already have a Resume.io document you are happy with — there is no reason to move.",
    ],
    balanceNote:
      "If you are happy with the resume you have and need it matched to a specific posting, that is a one-step job that a tailoring tool does without a rebuild.",
    pricingFact:
      "We could not verify Resume.io's pricing from a primary source, so we do not quote a figure. It is marketed with a free trial, and a user report describes a trial that auto-renews if you do not cancel in time — worth confirming on their site before you enter card details.",
    facts: [
      {
        heading: "What Resume.io is",
        body: "Resume.io is a template-based resume builder: you build your resume inside the tool from a template rather than tailoring a document you already have. That is a different job from matching an existing resume to a specific posting.",
      },
      {
        heading: "An honest note on Resume.io pricing",
        body: "We could not verify Resume.io's pricing from a primary source, so we do not quote a figure. It is marketed with a free trial, and a user report describes a trial that auto-renews if you do not cancel in time — worth confirming on their site before you enter card details.",
      },
      {
        heading: "The trade-off in one line",
        body: "Resume.io builds a resume in a template from scratch; AI Resume Tailor adapts the resume you already have to one job posting, as a one-time purchase.",
      },
    ],
  },

  Zety: {
    overview:
      "Zety is a template-based resume builder with cover-letter features. Like Resume.io, it is aimed at building a resume inside the tool from a template rather than tailoring a document you already have. Its exact pricing is not something we were able to verify from a primary source, so this page does not quote a figure; it is marketed with a free trial, and a user report describes a trial that auto-renews if you do not cancel in time.",
    strengths: [
      "It is a well-known, template-driven resume builder with cover-letter features.",
      "It is built for building a designed resume inside a guided editor, which suits someone creating a resume from scratch.",
    ],
    tradeoffs: [
      "Its price is not something we could verify from a primary source, so we do not state one — check their site directly.",
      "It is marketed with a free trial. A user report describes that trial as auto-renewing if you do not cancel in time, and the free download as plain text, which is worth checking before you hand over card details.",
    ],
    featureRows: [
      {
        feature: "Primary job",
        competitor: "Build a resume from a template in a guided editor",
        ours: "Tailor your existing resume to a job posting",
      },
      {
        feature: "Starting point",
        competitor: "A template — you fill it in",
        ours: "Your existing resume — we adapt it",
      },
      {
        feature: "Cover letters",
        competitor: "Yes, built into the tool",
        ours: "Focus is the tailored resume",
      },
      {
        feature: "Pricing",
        competitor: "Not verified; marketed with a free trial",
        ours: "A one-time pass, no subscription",
      },
    ],
    whoItsFor:
      "Zety is for someone who wants to build a designed resume and cover letter inside a guided, template-driven editor — typically a first resume or a design refresh — and who is comfortable confirming the trial and billing terms themselves before signing up.",
    betterChoiceIntro:
      "Because we could not verify Zety's pricing, we will not argue about cost. On the product itself, it is the better choice if:",
    betterChoiceWhen: [
      "You want to build a new resume and cover letter from a template rather than tailor an existing resume.",
      "You want a step-by-step builder designed for someone creating a resume from scratch.",
      "You are comfortable with a trial-based signup and will confirm the billing and cancellation terms yourself.",
      "You already have a Zety document you are happy with — there is no reason to move.",
    ],
    balanceNote:
      "If you are happy with the resume you have and need it matched to a specific posting, that is a one-step job that a tailoring tool does without a rebuild.",
    pricingFact:
      "We could not verify Zety's pricing from a primary source, so we do not quote a figure. It is marketed with a free trial, and a user report describes a trial that auto-renews if you do not cancel in time — worth confirming on their site before you enter card details.",
    facts: [
      {
        heading: "What Zety is",
        body: "Zety is a template-based resume builder with cover-letter features: you build your resume inside the tool from a template rather than tailoring a document you already have. That is a different job from matching an existing resume to a specific posting.",
      },
      {
        heading: "An honest note on Zety pricing",
        body: "We could not verify Zety's pricing from a primary source, so we do not quote a figure. It is marketed with a free trial, and a user report describes a trial that auto-renews if you do not cancel in time — worth confirming on their site before you enter card details.",
      },
      {
        heading: "The trade-off in one line",
        body: "Zety builds a resume and cover letter in a template from scratch; AI Resume Tailor adapts the resume you already have to one job posting, as a one-time purchase.",
      },
    ],
  },
};

/**
 * Renders the deep comparison sections for one competitor page.
 * Pass only the competitor's display name — all content is keyed off it.
 */
export default function AlternativeDeepDive({
  competitorName,
}: {
  competitorName: string;
}) {
  const data = CONTENT[competitorName];
  if (!data) return null;

  // Our entry price = the cheapest tier we sell (currently the one-time pass).
  const entryPrice = Math.min(...TIME_BASED_TIERS.map((t) => t.price)).toFixed(2);

  return (
    <>
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          What {competitorName} is — and what it does well
        </h2>
        <p className="leading-relaxed mb-4">{data.overview}</p>

        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Where {competitorName} is strong
        </h3>
        <ul className="list-disc list-inside space-y-2 mb-6">
          {data.strengths.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>

        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Where {competitorName} falls short
        </h3>
        <ul className="list-disc list-inside space-y-2">
          {data.tradeoffs.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {competitorName} vs AI Resume Tailor: feature-by-feature
        </h2>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-xs sm:text-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-3">Feature</th>
                <th className="p-3 text-gray-500">{competitorName}</th>
                <th className="p-3 text-cyan-600 dark:text-cyan-400">
                  AI Resume Tailor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.featureRows.map((row) => (
                <tr key={row.feature}>
                  <td className="p-3 font-medium">{row.feature}</td>
                  <td className="p-3 text-gray-500">{row.competitor}</td>
                  <td className="p-3 text-cyan-600 dark:text-cyan-400">
                    {row.ours}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Who {competitorName} is actually for
        </h2>
        <p className="leading-relaxed">{data.whoItsFor}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          When {competitorName} is the better choice
        </h2>
        <p className="leading-relaxed mb-4">{data.betterChoiceIntro}</p>
        <ul className="list-disc list-inside space-y-2 mb-4">
          {data.betterChoiceWhen.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
        <p className="leading-relaxed">{data.balanceNote}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          How the pricing compares
        </h2>
        <p className="leading-relaxed">
          {data.pricingFact} By contrast, AI Resume Tailor charges a one-time $
          {entryPrice} for a pass — it never auto-renews, so there is nothing to
          cancel. Your first {FREE_RESUME_LIMIT} tailored resumes are free.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Key facts: {competitorName} vs AI Resume Tailor
        </h2>
        <div className="space-y-4">
          {data.facts.map((fact) => (
            <div
              key={fact.heading}
              className="p-5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 space-y-1.5"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                {fact.heading}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {fact.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
