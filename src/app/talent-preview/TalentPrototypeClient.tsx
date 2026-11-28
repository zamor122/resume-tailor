"use client";

import React, { useState } from "react";

type ViewTab = "candidate" | "public_card" | "intro_email";
type PersonaKey = "doctor" | "admin";

interface DemoPersona {
  key: PersonaKey;
  publicId: string;
  privateName: string;
  privateEmail: string;
  privateEmployer: string;
  blockedDomainDefault: string;
  headline: string;
  industry: string;
  yearsExperience: number;
  workMode: "Remote" | "Hybrid" | "On-site";
  region: string;
  compFloor: string;
  verifiedAiTools: Array<{ name: string; badge: string }>;
  coreSkills: string[];
  anonymizedHighlights: string[];
  agentSearchesWeek: number;
  cardViewsWeek: number;
  sampleIntro: {
    company: string;
    domain: string;
    recruiterName: string;
    recruiterEmail: string;
    roleTitle: string;
    compRange: string;
    workMode: string;
    pitch: string;
  };
}

const PERSONAS: Record<PersonaKey, DemoPersona> = {
  doctor: {
    key: "doctor",
    publicId: "cand_8f3a9c",
    privateName: "Dr. Elena Vance, MD",
    privateEmail: "elena.vance@example.com",
    privateEmployer: "Pacific Coast Medical Group",
    blockedDomainDefault: "pacificcoastmed.org",
    headline: "Board-Certified Internal Medicine Physician",
    industry: "Healthcare, Nursing & Medicine",
    yearsExperience: 7,
    workMode: "Hybrid",
    region: "US — West Coast",
    compFloor: "$245k+",
    verifiedAiTools: [
      { name: "Nuance DAX Copilot", badge: "HIPAA-Compliant" },
      { name: "Abridge", badge: "Linked Evidence" },
      { name: "Epic In-Basket AI", badge: "Native EHR" },
    ],
    coreSkills: [
      "Epic EHR",
      "Outpatient Primary Care",
      "Chronic Disease Management",
      "HIPAA Compliance",
    ],
    anonymizedHighlights: [
      "Manages 520+ adult outpatient panel across diabetes, hypertension, and geriatric care at a regional multi-specialty medical group.",
      "Conducts 20–24 daily encounters using HIPAA-compliant ambient clinical documentation (Nuance DAX Copilot) to maintain 100% coding accuracy.",
      "Triages 35+ daily patient portal inquiries using Epic In-Basket AI while coordinating specialty care transitions.",
    ],
    agentSearchesWeek: 14,
    cardViewsWeek: 4,
    sampleIntro: {
      company: "Beacon Health Systems",
      domain: "beaconhealth.org",
      recruiterName: "Marcus Rivera (Recruiting Agent + Clinical Ops)",
      recruiterEmail: "m.rivera@beaconhealth.org",
      roleTitle: "Lead Outpatient Internal Medicine Physician",
      compRange: "$265,000 – $295,000 + Sign-On",
      workMode: "Hybrid (San Diego / Telehealth)",
      pitch:
        "Our sourcing agent matched your verified Epic EHR + Nuance DAX Copilot experience. We're rolling out ambient clinical AI across 4 clinics and want a physician lead who already works smoothly with these workflows.",
    },
  },
  admin: {
    key: "admin",
    publicId: "cand_4b2e71",
    privateName: "Jordan Blake",
    privateEmail: "jordan.blake@example.com",
    privateEmployer: "Northstar Operations Group",
    blockedDomainDefault: "northstarops.com",
    headline: "Senior Executive Assistant & Operations Coordinator",
    industry: "Administrative & Executive Operations",
    yearsExperience: 6,
    workMode: "Remote",
    region: "US — Central / Remote",
    compFloor: "$95k+",
    verifiedAiTools: [
      { name: "Claude Enterprise", badge: "SOC2 Type II" },
      { name: "Microsoft 365 Copilot", badge: "Enterprise" },
      { name: "Zapier AI Workflows", badge: "No-Code Automation" },
    ],
    coreSkills: [
      "C-Suite Calendar & Travel",
      "Board Deck Preparation",
      "SOP Standardization",
      "Vendor Operations",
    ],
    anonymizedHighlights: [
      "Supports C-suite leadership at a 90-person operations firm with complex calendar management, travel, and inbox triage.",
      "Synthesizes weekly leadership briefings and board decks using Claude Enterprise and Microsoft 365 Copilot.",
      "Automates meeting action-item tracking and vendor intake routing with Zapier AI no-code workflows.",
    ],
    agentSearchesWeek: 21,
    cardViewsWeek: 6,
    sampleIntro: {
      company: "Stratos Ventures",
      domain: "stratosvc.com",
      recruiterName: "Hannah Cho (Chief of Staff)",
      recruiterEmail: "hannah@stratosvc.com",
      roleTitle: "Executive Assistant to Managing Partner",
      compRange: "$105,000 – $125,000 + Bonus",
      workMode: "Remote (US)",
      pitch:
        "Our recruiting agent flagged your Claude Enterprise + Zapier AI workflow automation skills alongside C-suite board prep experience. Would love to schedule a 20-minute intro this week.",
    },
  },
};

export default function TalentPrototypeClient() {
  const [activeTab, setActiveTab] = useState<ViewTab>("candidate");
  const [personaKey, setPersonaKey] = useState<PersonaKey>("doctor");

  // Interactive prototype states
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [isPremium, setIsPremium] = useState(true);
  const [showCompFloor, setShowCompFloor] = useState(true);
  const [blockedDomain, setBlockedDomain] = useState(PERSONAS.doctor.blockedDomainDefault);
  const [copiedLink, setCopiedLink] = useState(false);

  // Public card states
  const [cardMode, setCardMode] = useState<"human" | "agent_json">("human");
  const [showIntroForm, setShowIntroForm] = useState(false);
  const [recruiterEmailInput, setRecruiterEmailInput] = useState("");
  const [recruiterCompanyInput, setRecruiterCompanyInput] = useState("");
  const [introFormStatus, setIntroFormStatus] = useState<string | null>(null);

  // Intro email relay simulation state
  const [introDecision, setIntroDecision] = useState<"pending" | "accepted" | "declined">(
    "pending"
  );

  const persona = PERSONAS[personaKey];
  const shareUrl = `https://airesumetailor.com/t/${persona.publicId}`;

  const switchPersona = (key: PersonaKey) => {
    setPersonaKey(key);
    setBlockedDomain(PERSONAS[key].blockedDomainDefault);
    setIntroDecision("pending");
    setIntroFormStatus(null);
    setShowIntroForm(false);
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    }
  };

  const handleSimulateIntroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = recruiterEmailInput.trim().toLowerCase();
    const domain = email.split("@")[1] || "";

    if (!domain || ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain)) {
      setIntroFormStatus(
        "blocked_free_email: Work email required (free consumer domains like @gmail.com are blocked to stop spam)."
      );
      return;
    }

    if (blockedDomain && domain === blockedDomain.trim().toLowerCase()) {
      setIntroFormStatus(
        `blocked_employer: ${domain} is on this candidate's employer blocklist — request silently rejected!`
      );
      return;
    }

    setIntroFormStatus(
      "sent: Intro request validated! Candidate has been emailed Accept / Decline buttons (their email stays hidden until they accept)."
    );
  };

  const agentJsonPayload = {
    public_id: persona.publicId,
    verified_ai_fluent: true,
    headline: persona.headline,
    industry: persona.industry,
    years_experience: persona.yearsExperience,
    work_mode: persona.workMode,
    region: persona.region,
    ...(showCompFloor ? { target_comp_min: persona.compFloor } : {}),
    verified_ai_tools: persona.verifiedAiTools.map((t) => `${t.name} (${t.badge})`),
    core_skills: persona.coreSkills,
    anonymized_highlights: persona.anonymizedHighlights,
    contact: {
      direct_email_exposed: false,
      intro_endpoint: "POST https://airesumetailor.com/api/talent/intro-request",
      double_opt_in_required: true,
    },
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C2028] py-6 px-4 pb-16">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Prototype Banner */}
        <section className="neo-box bg-[#1C2028] text-white p-4 sm:p-5 border-2 border-[#1C2028] shadow-[4px_4px_0px_#FF5722] rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded bg-[#FF5722] text-white font-mono text-[11px] font-bold uppercase">
              INTERACTIVE MOBILE PROTOTYPE
            </span>
            <span className="font-mono text-[11px] text-gray-300">
              Phase 2 · Agent Talent Network
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-mono font-extrabold leading-tight">
            Test All 3 Views on Your Phone
          </h1>

          {/* Persona + Free/Premium Simulators */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => switchPersona("doctor")}
              className={`px-3 py-2 rounded-lg font-mono text-xs font-bold border-2 transition-colors ${
                personaKey === "doctor"
                  ? "bg-white text-[#1C2028] border-[#FF5722]"
                  : "bg-white/10 text-gray-200 border-white/20"
              }`}
            >
              🩺 Physician Demo
            </button>
            <button
              type="button"
              onClick={() => switchPersona("admin")}
              className={`px-3 py-2 rounded-lg font-mono text-xs font-bold border-2 transition-colors ${
                personaKey === "admin"
                  ? "bg-white text-[#1C2028] border-[#FF5722]"
                  : "bg-white/10 text-gray-200 border-white/20"
              }`}
            >
              📋 Exec Assistant Demo
            </button>
          </div>
        </section>

        {/* 3-Perspective Switcher Tabs */}
        <div className="grid grid-cols-3 gap-2" role="tablist">
          {[
            { id: "candidate" as ViewTab, label: "1. User Controls" },
            { id: "public_card" as ViewTab, label: "2. LinkedIn Card" },
            { id: "intro_email" as ViewTab, label: "3. Intro Email" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-2.5 rounded-xl border-2 border-[#1C2028] font-mono text-xs font-bold text-center transition-all ${
                activeTab === tab.id
                  ? "bg-[#FF5722] text-white shadow-[2px_2px_0px_#1C2028]"
                  : "bg-white text-[#1C2028] hover:bg-[#F4F1EA]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* VIEW 1: CANDIDATE PRIVACY CONTROLS (/profile)                    */}
        {/* ================================================================ */}
        {activeTab === "candidate" && (
          <div className="space-y-4">
            {/* Free vs Premium Simulator Toggle */}
            <div className="p-3.5 rounded-xl bg-[#F4F1EA] border-2 border-[#1C2028] flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold uppercase text-[#1C2028]">
                  Simulate Account Tier
                </p>
                <p className="text-xs font-sans text-[#374151]">
                  Toggle to see Free Pool vs. Premium LinkedIn Agent Card
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPremium((p) => !p)}
                className={`px-3 py-1.5 rounded-lg border-2 border-[#1C2028] font-mono text-xs font-bold shrink-0 ${
                  isPremium ? "bg-[#10B981] text-white" : "bg-white text-[#1C2028]"
                }`}
              >
                {isPremium ? "★ Pass Active" : "Free Tier"}
              </button>
            </div>

            {/* Master Discoverable Switch + Agent Activity */}
            <section className="neo-box bg-white p-5 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-mono text-base font-extrabold">
                    AI Recruiting Agent Discovery
                  </h2>
                  <p className="text-sm font-sans text-[#374151]">
                    Let hiring agents match your anonymous skills &amp; verified AI tools. Zero
                    spam — your email is hidden until you click Accept.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDiscoverable}
                  onClick={() => setIsDiscoverable((v) => !v)}
                  className={`px-3.5 py-2 rounded-full border-2 border-[#1C2028] font-mono text-xs font-bold shrink-0 transition-colors ${
                    isDiscoverable ? "bg-[#10B981] text-white" : "bg-[#F4F1EA] text-[#4B5563]"
                  }`}
                >
                  {isDiscoverable ? "ON" : "PAUSED"}
                </button>
              </div>

              {/* Live Agent Activity Strip */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#1C2028]/25 text-center">
                  <div className="font-mono text-lg font-extrabold text-[#FF5722]">
                    {isPremium ? persona.agentSearchesWeek : "🔒"}
                  </div>
                  <div className="font-mono text-[10px] font-bold text-[#4B5563]">
                    Agent Searches
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#1C2028]/25 text-center">
                  <div className="font-mono text-lg font-extrabold text-[#10B981]">
                    {isPremium ? persona.cardViewsWeek : "🔒"}
                  </div>
                  <div className="font-mono text-[10px] font-bold text-[#4B5563]">
                    Card Views
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("intro_email")}
                  className="p-3 rounded-lg bg-[#FFF4EF] border-2 border-[#FF5722] text-center"
                >
                  <div className="font-mono text-lg font-extrabold text-[#1C2028]">1</div>
                  <div className="font-mono text-[10px] font-bold text-[#FF5722]">
                    Intro Waiting →
                  </div>
                </button>
              </div>
            </section>

            {/* Premium LinkedIn Agent Card Link */}
            <section
              className={`neo-box p-5 border-2 border-[#1C2028] rounded-xl space-y-3 ${
                isPremium ? "bg-[#ECFDF5] shadow-[4px_4px_0px_#1C2028]" : "bg-[#F4F1EA]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase text-[#065F46]">
                  {isPremium ? "★ PREMIUM · LINKEDIN AGENT CARD" : "🔒 PASS FEATURE · LINKEDIN AGENT CARD"}
                </span>
              </div>
              <p className="text-sm font-sans text-[#1C2028]">
                Paste this link in your LinkedIn bio or Featured section so recruiters &amp; hiring
                agents can view your verified AI-fluent card and request an intro:
              </p>

              {isPremium ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-white border-2 border-[#1C2028] font-mono text-xs break-all font-bold">
                    {shareUrl}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="neo-btn bg-[#1C2028] text-white border-2 border-[#1C2028] py-2.5 font-mono text-xs font-bold uppercase"
                    >
                      {copiedLink ? "Copied ✓" : "Copy LinkedIn Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("public_card")}
                      className="neo-btn bg-white text-[#1C2028] border-2 border-[#1C2028] py-2.5 font-mono text-xs font-bold uppercase"
                    >
                      Preview Card →
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPremium(true)}
                  className="neo-btn w-full bg-[#FF5722] text-white border-2 border-[#1C2028] py-3 font-mono text-xs font-bold uppercase"
                >
                  Unlock LinkedIn Agent Card With One-Time Pass ($9) →
                </button>
              )}
            </section>

            {/* Privacy Controls: Blocklist & Comp Floor */}
            <section className="neo-box bg-white p-5 border-2 border-[#1C2028] rounded-xl space-y-4">
              <h3 className="font-mono text-sm font-extrabold uppercase">
                Privacy &amp; Safety Controls
              </h3>

              <div className="p-3 rounded-lg bg-[#FAF7F0] border border-[#1C2028]/20 text-xs font-sans space-y-1">
                <p className="font-mono font-bold text-[#065F46]">
                  ✓ AUTOMATICALLY SCRUBBED FROM AGENTS:
                </p>
                <p className="text-[#374151]">
                  Name (<s>{persona.privateName}</s>), Email (<s>{persona.privateEmail}</s>),
                  Current Employer (<s>{persona.privateEmployer}</s>)
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="proto-blocked-domain"
                  className="block font-mono text-xs font-bold text-[#1C2028]"
                >
                  Block Your Current Employer&apos;s Domain {!isPremium && "🔒"}
                </label>
                <input
                  id="proto-blocked-domain"
                  type="text"
                  disabled={!isPremium}
                  value={blockedDomain}
                  onChange={(e) => setBlockedDomain(e.target.value)}
                  className="w-full rounded-lg border-2 border-[#1C2028] bg-[#FAF7F0] px-3 py-2 text-sm font-mono disabled:opacity-50"
                />
                <p className="text-xs font-sans text-[#4B5563]">
                  Any intro request from <strong>@{blockedDomain || "yourcompany.com"}</strong> is
                  silently rejected.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-mono text-xs font-bold">
                    Show Target Salary Floor ({persona.compFloor})
                  </p>
                  <p className="text-xs font-sans text-[#4B5563]">
                    Stops agents from sending lowball offers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompFloor((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg border-2 border-[#1C2028] font-mono text-xs font-bold ${
                    showCompFloor ? "bg-[#1C2028] text-white" : "bg-white text-[#1C2028]"
                  }`}
                >
                  {showCompFloor ? "Shown" : "Hidden"}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 2: PUBLIC LINKEDIN HUMAN + AI AGENT CARD (/t/cand_...)      */}
        {/* ================================================================ */}
        {activeTab === "public_card" && (
          <div className="space-y-4">
            {/* Switch between Human Recruiter View and Raw AI Agent JSON View */}
            <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border-2 border-[#1C2028]">
              <button
                type="button"
                onClick={() => setCardMode("human")}
                className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold ${
                  cardMode === "human" ? "bg-[#1C2028] text-white" : "text-[#1C2028]"
                }`}
              >
                👤 Human Recruiter View
              </button>
              <button
                type="button"
                onClick={() => setCardMode("agent_json")}
                className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold ${
                  cardMode === "agent_json" ? "bg-[#1C2028] text-white" : "text-[#1C2028]"
                }`}
              >
                🤖 AI Agent JSON View
              </button>
            </div>

            {cardMode === "human" ? (
              <section className="neo-box bg-white p-5 sm:p-6 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-[#10B981] text-white font-mono text-[11px] font-bold uppercase">
                      ✓ VERIFIED AI-FLUENT
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-[#F4F1EA] border border-[#1C2028] font-mono text-[11px] font-bold">
                      ID: {persona.publicId}
                    </span>
                  </div>

                  <h2 className="text-xl font-mono font-extrabold text-[#1C2028] leading-snug">
                    {persona.headline}
                  </h2>

                  <div className="flex flex-wrap gap-2 text-xs font-mono text-[#374151]">
                    <span>📍 {persona.region}</span>
                    <span>·</span>
                    <span>💼 {persona.yearsExperience}+ yrs</span>
                    <span>·</span>
                    <span>🏠 {persona.workMode}</span>
                    {showCompFloor && (
                      <>
                        <span>·</span>
                        <span className="font-bold text-[#065F46]">💰 {persona.compFloor}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Verified Industry AI Tools */}
                <div className="space-y-2">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Verified Industry-Standard AI Tools
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {persona.verifiedAiTools.map((tool) => (
                      <span
                        key={tool.name}
                        className="px-3 py-1.5 rounded-lg bg-[#FFF4EF] border-2 border-[#FF5722] font-mono text-xs font-bold text-[#1C2028]"
                      >
                        {tool.name}{" "}
                        <span className="text-[10px] text-[#FF5722]">· {tool.badge}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Anonymized Highlights */}
                <div className="space-y-2">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                    Anonymized Experience Highlights
                  </h3>
                  <ul className="space-y-2 text-sm font-sans text-[#1C2028] leading-relaxed list-disc pl-5">
                    {persona.anonymizedHighlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>

                {/* Recruiter Request Intro CTA */}
                {!showIntroForm ? (
                  <button
                    type="button"
                    onClick={() => setShowIntroForm(true)}
                    className="neo-btn w-full bg-[#FF5722] hover:bg-[#E64A19] text-white border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] py-3.5 font-mono text-sm font-bold uppercase tracking-wider"
                  >
                    Request Interview Intro →
                  </button>
                ) : (
                  <form
                    onSubmit={handleSimulateIntroSubmit}
                    className="p-4 rounded-xl bg-[#FAF7F0] border-2 border-[#1C2028] space-y-3"
                  >
                    <p className="font-mono text-xs font-bold uppercase">
                      Test Anti-Spam &amp; Blocklist Protection
                    </p>
                    <p className="text-xs font-sans text-[#4B5563]">
                      Try typing <code>test@gmail.com</code> (blocked),{" "}
                      <code>hr@{blockedDomain}</code> (employer blocked), or{" "}
                      <code>recruiter@acmehealth.org</code> (passes!).
                    </p>
                    <input
                      type="text"
                      required
                      placeholder="Company Name (e.g. Acme Health)"
                      value={recruiterCompanyInput}
                      onChange={(e) => setRecruiterCompanyInput(e.target.value)}
                      className="w-full rounded-lg border-2 border-[#1C2028] bg-white px-3 py-2 text-sm font-sans"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Work Email (e.g. hiring@acmehealth.org)"
                      value={recruiterEmailInput}
                      onChange={(e) => setRecruiterEmailInput(e.target.value)}
                      className="w-full rounded-lg border-2 border-[#1C2028] bg-white px-3 py-2 text-sm font-sans"
                    />
                    <button
                      type="submit"
                      className="neo-btn w-full bg-[#1C2028] text-white border-2 border-[#1C2028] py-2.5 font-mono text-xs font-bold uppercase"
                    >
                      Submit Intro Request
                    </button>
                    {introFormStatus && (
                      <div
                        className={`p-3 rounded-lg border-2 text-xs font-sans font-semibold ${
                          introFormStatus.startsWith("sent:")
                            ? "bg-[#ECFDF5] border-[#10B981] text-[#065F46]"
                            : "bg-[#FEF2F2] border-[#DC2626] text-[#991B1B]"
                        }`}
                      >
                        {introFormStatus.replace(/^[a-z_]+:\s*/, "")}
                      </div>
                    )}
                  </form>
                )}
              </section>
            ) : (
              <section className="neo-box bg-[#1C2028] text-[#FAF7F0] p-5 border-2 border-[#1C2028] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#10B981]">
                    GET {shareUrl}?format=json
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">0 PII EXPOSED</span>
                </div>
                <pre className="text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(agentJsonPayload, null, 2)}
                </pre>
              </section>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW 3: DOUBLE-OPT-IN INTRO EMAIL (CANDIDATE APPROVAL)           */}
        {/* ================================================================ */}
        {activeTab === "intro_email" && (
          <section className="neo-box bg-white p-5 sm:p-6 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-4">
            <div className="border-b-2 border-[#1C2028]/15 pb-3 space-y-1">
              <span className="px-2 py-0.5 rounded bg-[#FFF4EF] border border-[#FF5722] text-[#FF5722] font-mono text-[10px] font-bold uppercase">
                SIMULATED CANDIDATE EMAIL
              </span>
              <h2 className="font-mono text-base font-extrabold text-[#1C2028]">
                Subject: {persona.sampleIntro.company} wants to interview you (
                {persona.sampleIntro.compRange})
              </h2>
              <p className="text-xs font-mono text-[#4B5563]">
                To: {persona.privateEmail} (Hidden from recruiter)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#1C2028]/20 space-y-2 text-sm font-sans">
              <p>
                <strong>Company:</strong> {persona.sampleIntro.company} (
                <span className="font-mono text-xs text-[#065F46]">
                  ✓ Verified {persona.sampleIntro.domain}
                </span>
                )
              </p>
              <p>
                <strong>Role:</strong> {persona.sampleIntro.roleTitle}
              </p>
              <p>
                <strong>Compensation:</strong> {persona.sampleIntro.compRange}
              </p>
              <p>
                <strong>Work Mode:</strong> {persona.sampleIntro.workMode}
              </p>
              <p className="pt-2 border-t border-[#1C2028]/10 text-[#374151] italic">
                &ldquo;{persona.sampleIntro.pitch}&rdquo;
              </p>
            </div>

            {introDecision === "pending" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIntroDecision("accepted")}
                  className="neo-btn bg-[#10B981] hover:bg-[#059669] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] py-3 px-4 font-mono text-xs font-bold uppercase"
                >
                  ✓ Accept &amp; Share Contact
                </button>
                <button
                  type="button"
                  onClick={() => setIntroDecision("declined")}
                  className="neo-btn bg-white hover:bg-[#F4F1EA] text-[#1C2028] border-2 border-[#1C2028] py-3 px-4 font-mono text-xs font-bold uppercase"
                >
                  Decline Silently
                </button>
              </div>
            )}

            {introDecision === "accepted" && (
              <div className="p-4 rounded-xl bg-[#ECFDF5] border-2 border-[#10B981] text-sm font-sans text-[#065F46] space-y-2">
                <p className="font-mono text-xs font-bold uppercase">
                  ✓ INTRO CONNECTED!
                </p>
                <p>
                  We just emailed <strong>{persona.sampleIntro.recruiterEmail}</strong> introducing{" "}
                  <strong>{persona.privateName}</strong> ({persona.privateEmail}) so you can book
                  your interview directly.
                </p>
                <button
                  type="button"
                  onClick={() => setIntroDecision("pending")}
                  className="font-mono text-xs font-bold underline"
                >
                  Reset demo
                </button>
              </div>
            )}

            {introDecision === "declined" && (
              <div className="p-4 rounded-xl bg-[#F4F1EA] border-2 border-[#1C2028] text-sm font-sans text-[#1C2028] space-y-2">
                <p className="font-mono text-xs font-bold uppercase">
                  DECLINED SILENTLY · ZERO PII SHARED
                </p>
                <p>
                  The recruiting agent only receives a generic &ldquo;Candidate declined&rdquo;
                  status. Your name, email, and current employer were never revealed.
                </p>
                <button
                  type="button"
                  onClick={() => setIntroDecision("pending")}
                  className="font-mono text-xs font-bold underline"
                >
                  Reset demo
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
