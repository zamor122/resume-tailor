# Futureproof — AI Experience Builder Design Spec

**Date:** 2026-11-24  
**Brand / Route:** `futureproof.airesumetailor.com` (rewritten to `/futureproof` in Next.js)  
**Branch:** `feat/futureproof-ai-experience`

---

## 1. Problem & Product Goal

Millions of capable professionals (physicians, nurses, administrative assistants, paralegals, accountants, educators, trades managers, etc.) have strong careers but little or no formal AI experience on their resumes. Recruiters and hiring managers increasingly screen for AI fluency, yet candidates either omit AI completely or add generic, unbelievable buzzwords (e.g., *"Used ChatGPT"*).

**Futureproof** is a standalone product experience (separate from the existing job-description tailoring workflow) that analyzes a user's existing resume, identifies **real, industry-standard AI tools** relevant to their exact profession and responsibilities, lets them select tools (or click **"Unsure? Pick Industry Standards"**), and weaves coherent, authentic, date-appropriate AI usage into their work experience — paired with plain-English **Interview Talking Points** so they can discuss every tool credibly.

---

## 2. Routing & Subdomain Architecture

- **Canonical Route:** `src/app/futureproof/page.tsx` (`https://airesumetailor.com/futureproof`).
- **Subdomain Rewrite (`src/middleware.ts`):**
  - Update `middleware.ts` `config.matcher` so it handles both `/api/:path*` (rate limiting) and host-based routing for `futureproof.airesumetailor.com` (and `futureproof.localhost` for local testing).
  - When `host` starts with `futureproof.` and the pathname is `/` (or does not start with `/api`, `/_next`, `/auth`, `/pricing`, `/success`, `/privacy`, `/terms`, `/futureproof`, or a static file extension), rewrite transparently via `NextResponse.rewrite(new URL('/futureproof', req.url))`.
  - API rate limiting continues to apply identically to `/api/*` on both hosts.
- **Navigation Isolation:**
  - `/futureproof` renders its own focused header/hero branding (*"FUTUREPROOF by AI Resume Tailor"*), keeping it distinct from the ATS Tailor Console.
  - Add a subtle entry link to `/futureproof` in the existing hamburger menu (`Navigation.tsx`) and `sitemap.ts` for SEO discovery.

---

## 3. Curated Industry AI Tooling Registry (`src/app/config/aiToolRegistry.ts`)

Rather than relying on unconstrained LLM tool suggestions (which risk hallucinated tools or generic advice), Futureproof uses a **typed, curated registry** layered on top of the existing 11 `IndustryCategory` domains in `src/app/config/domainTaxonomy.ts`, plus targeted sub-role profiles:

### Data Model
```ts
export interface AiToolEntry {
  id: string;
  name: string;                    // e.g., "Nuance DAX Copilot"
  vendor: string;                  // e.g., "Microsoft / Nuance"
  category: IndustryCategory;
  subRoles: string[];              // e.g., ["physician", "doctor", "md", "do", "np", "pa", "clinician"]
  isIndustryStandard: boolean;     // Auto-selected when user clicks "Unsure? Pick Industry Standards"
  comfortTier: "everyday" | "automator";
  complianceBadges: string[];      // e.g., ["HIPAA-Compliant", "EHR-Integrated"]
  introducedYear: number;          // e.g., 2023 — prevents injecting into pre-2023 roles
  shortDescription: string;        // Plain-English 1-sentence summary for the tool card
  workflowUseCases: string[];      // Concrete tasks this tool performs in that role
  examplePhrasing: string;         // Authentic, non-buzzword resume phrasing guidance
  interviewTalkingPoint: string;   // Plain-English 30-second explanation for interviews
}
```

### Coverage (Curated Real-World Tools)
- **Healthcare (`healthcare`):**
  - *Clinicians / Doctors / NPs / PAs:* **Nuance DAX Copilot** (HIPAA-compliant ambient clinical documentation), **Abridge** (ambient patient-encounter note generation), **Nabla Copilot** (real-time SOAP note drafting), **Epic In-Basket AI** (patient message drafting & chart summarization).
  - *Nursing / Care Coordination / Healthcare Admin:* **Epic Care Companion / Clinical Summary AI**, **Microsoft 365 Copilot (Healthcare)**, **Olive / UiPath Healthcare Automation** (prior-authorization & intake workflows).
- **General Business / Administrative & Executive Assistants (`general_business`):**
  - **Claude Enterprise / Claude Cowork** (document synthesis, executive briefing drafts, policy/sop structuring), **Microsoft 365 Copilot** (Outlook triage, Teams meeting action items, Excel/PowerPoint automation), **Notion AI** (knowledge base & meeting notes), **Zapier AI / Make** (scheduling, inbox-to-CRM, and recurring workflow automation), **Otter.ai / Fireflies.ai** (meeting transcription & follow-up tracking).
- **Legal & Compliance (`legal_compliance`):**
  - **Harvey AI**, **Thomson Reuters CoCounsel**, **Spellbook** (contract redlining, clause risk flagging, legal research synthesis), **Relativity aiR** (e-discovery review).
- **Finance & Accounting (`finance_accounting`):**
  - **Microsoft Copilot for Finance** (Excel variance & reconciliation), **AlphaSense** (earnings & market intelligence), **Vic.ai / Ramp Intelligence** (automated AP invoice coding & spend controls), **BloombergGPT / Terminal AI**.
- **Sales & Marketing (`sales_marketing`):**
  - **Gong AI** (call intelligence & deal risk tracking), **HubSpot Breeze AI / Salesforce Einstein**, **Clay** (account enrichment & outbound personalization), **Claude / Jasper for GTM**.
- **Operations & Logistics (`operations_logistics`):**
  - **Microsoft Copilot / Power Automate AI**, **SAP Joule / Oracle Fusion AI**, **Project44 / FourKites AI** (supply chain ETA & exception handling), **Zapier AI**.
- **Education & Coaching (`education_coaching`):**
  - **MagicSchool AI** (IEP/lesson differentiation & rubric generation), **Khanmigo**, **Google Gemini for Education**, **Gradescope AI**.
- **Technology & Engineering (`technology_engineering`):**
  - **GitHub Copilot**, **Cursor**, **Claude Code / Anthropic Workbench**, **Datadog Bits AI** (incident triage & observability).
- **Hospitality & Service (`hospitality_service`):**
  - **Toast IQ / SevenRooms AI** (guest personalization & demand forecasting), **Canary Technologies AI** (guest messaging & upsell automation), **7shifts AI** (labor scheduling).
- **Trades & Facilities (`trades_facilities`):**
  - **ServiceTitan AI** (dispatch optimization & call booking), **Procore Copilot** (RFI/submittal tracking & daily logs), **SafetyCulture AI** (field inspection checklists).
- **Aviation & Aerospace (`aviation_aerospace`):**
  - **ForeFlight / Jeppesen Smart Routing**, **GE Aerospace / Predictive Maintenance Analytics**, **Microsoft 365 Copilot (Ops & Compliance Documentation)**.

---

## 4. API Design & Freemium Security Gate

Both endpoints live under `/api/futureproof/*` and are added to `TIGHT_LLM_PREFIXES` in `src/middleware.ts` (30 req/min, 200 req/day per IP).

### 4.1 `POST /api/futureproof/analyze` (Free, Unauthenticated)
- **Request:**
  ```json
  {
    "resumeText": "string (min 80 chars, max 30,000 chars)",
    "comfortLevel": "everyday" | "automator"
  }
  ```
- **Behavior:**
  1. Uses `classifyIndustry` + sub-role keyword scoring + lightweight LLM role parser (`gemini:gemini-2.5-flash` with `gemini:gemini-2.5-flash-lite` fallback) to extract:
     - Detected `industry` & `subRoleLabel` (e.g., `"Healthcare — Physician / Internal Medicine"` or `"Administrative Operations — Executive Assistant"`).
     - Parsed recent roles (`title`, `company`, `dateRange`, `isRecentForAi: boolean` — true if end year ≥ 2023 or "Present").
  2. Selects **4–6 matching real tools** from `AI_TOOL_REGISTRY` matching the industry, sub-role, and comfort tier.
  3. Marks the top **2–3 `isIndustryStandard` tools** as `preselected: true`, and attaches a concise, resume-specific `fitReason` explaining how each tool maps to their actual work history.
- **Response:**
  ```json
  {
    "industry": "healthcare",
    "industryDisplayName": "Healthcare, Nursing & Medicine",
    "subRoleLabel": "Physician / Internal Medicine",
    "detectedRoles": [
      { "id": "role-0", "title": "Attending Physician", "company": "St. Jude Medical", "dateRange": "2021 - Present", "isRecentForAi": true }
    ],
    "recommendedTools": [
      {
        "id": "nuance-dax-copilot",
        "name": "Nuance DAX Copilot",
        "vendor": "Microsoft / Nuance",
        "complianceBadges": ["HIPAA-Compliant", "EHR-Integrated"],
        "isIndustryStandard": true,
        "preselected": true,
        "shortDescription": "...",
        "fitReason": "Maps directly to your 22-patient daily outpatient encounters and Epic charting duties."
      }
    ]
  }
  ```

### 4.2 `POST /api/futureproof/generate` (Freemium Preview + Pass Unlock)
- **Request:**
  ```json
  {
    "resumeText": "string",
    "industry": "IndustryCategory",
    "selectedToolIds": ["nuance-dax-copilot", "abridge"],
    "useIndustryStandards": false,
    "comfortLevel": "everyday" | "automator",
    "accessToken": "optional string"
  }
  ```
- **Behavior:**
  1. Validates `selectedToolIds` strictly against `AI_TOOL_REGISTRY` (if `useIndustryStandards: true` or empty, auto-selects the top 2–3 `isIndustryStandard` tools for the detected industry/sub-role).
  2. Checks auth + paid access via `requireAuth` (optional) + `getAccessInfoServer(userId)` — **never trusts any client-supplied `isUnlocked` flag**.
  3. Runs a grounded LLM prompt (`gemini:gemini-2.5-flash` + fallback) with strict rules:
     - Only weave tools from the validated registry list (never invent tools).
     - Anchor every bullet to an existing responsibility from the user's resume (preserving real metrics, titles, and employers).
     - **Timeline guard:** Only attach 2023+ AI tools to roles active in 2023–Present; if no role is 2023+, place them into a clean **"Modern Workflows & AI Proficiency"** section instead of fabricating historical tool usage.
     - Generate a cohesive **AI Skills & Workflows** block and a full **Merged Resume** text.
  4. **Server-Side Freemium Sanitization (`sanitizeFutureproofForLocked`):**
     - If `hasAccess === true`: returns all bullet upgrades, full skills block, full `mergedResume`, and full `interviewTalkingPoints`.
     - If `hasAccess === false`:
       - Returns the **first 2 bullet upgrades** in full (`isLocked: false`).
       - Replaces remaining bullet upgrades' `upgradedBullet` with a locked placeholder (`isLocked: true`), omits `mergedResume` (`null`), and masks `interviewTalkingPoints` (`isLocked: true`, returning only the tool name and a preview teaser).
       - Includes `totalUpgrades`, `unlockedCount: 2`, and `isUnlocked: false` so the UI renders a clear, honest preview + upgrade CTA pointing to `/pricing`.

---

## 5. Standalone UI/UX Flow (`src/app/futureproof/`)

Matches the warm neo-brutalist design system (`#FAF7F0` cream canvas, `#1C2028` borders, `#FF5722` orange accent, monospace badges):

1. **Hero & Step 1 (Upload / Paste Resume):**
   - Clear headline: *"Add Real, Industry-Standard AI Experience to Your Resume"*
   - Subheadline explaining that Futureproof matches real tools (like HIPAA-compliant clinical scribes for doctors or Claude Enterprise for admins) to their actual work history.
   - Drag-and-drop PDF/DOCX upload (reusing `/api/parse-resume` / existing client parser) OR paste textarea.
   - 2-card Comfort Level selector:
     - **Everyday AI Adopter** *(Recommended — daily productivity, drafting, documentation)*
     - **Workflow Automator** *(Cross-tool automation, SOPs, templates, team enablement)*
   - Primary CTA: **"Analyze My Resume →"**

2. **Step 2 (Choose Your AI Tools):**
   - Displays detected Industry & Sub-Role badge + recent roles eligible for AI integration.
   - Grid of 4–6 selectable AI tool cards with compliance badges, 1-sentence descriptions, and personalized `fitReason`. Top 2–3 are pre-selected.
   - Prominent secondary button: **"Unsure? Auto-Select Industry Standards"** (resets selection to the `isIndustryStandard` defaults and displays a reassuring tooltip).
   - Primary CTA: **"Weave AI Into My Resume →"**

3. **Step 3 (Results, Interview Prep & Export):**
   - **Before / After Bullet Cards** grouped by Role:
     - First 2 upgrades fully visible for free users with copy buttons and tool badges.
     - Remaining upgrades blurred with a clean **"Unlock Full Resume + Interview Prep"** CTA card linking to `/pricing` (or auto-unlocked if the user already has an active pass).
   - **AI Skills & Workflows Snippet** (ready to drop into a Skills section).
   - **Interview Talking Points Accordion** (1 card per selected tool: *"How to explain this naturally in an interview"* — unlocked with pass).
   - **Merged Resume View & Copy / Download (.txt / .docx)** (unlocked with pass).

---

## 6. Testing Strategy

- **Unit tests (`tests/unit/futureproof/aiToolRegistry.test.ts`):**
  - Verifies every `IndustryCategory` has at least 2 `isIndustryStandard` tools, valid compliance badges, and non-empty interview talking points.
  - Verifies sub-role matching (e.g., `"Attending Physician"` -> `nuance-dax-copilot`, `abridge`; `"Executive Assistant"` -> `claude-enterprise`, `microsoft-365-copilot`).
- **API & Security tests (`tests/api/futureproof/futureproof.test.ts`):**
  - `POST /api/futureproof/analyze` validates input length, returns pre-selected industry standards, and flags pre-2023 roles as `isRecentForAi: false`.
  - `POST /api/futureproof/generate` strictly strips locked bullets, `mergedResume`, and `interviewTalkingPoints` when unauthenticated or without an active pass (zero data leakage in JSON response).
  - `POST /api/futureproof/generate` returns full unlocked payload when user has an active pass.
  - `useIndustryStandards: true` auto-selects verified registry tools even when `selectedToolIds` is empty.
- **Middleware tests (`tests/security/audit-hardening.test.ts`):**
  - Verifies `Host: futureproof.airesumetailor.com` at `/` rewrites to `/futureproof`.
  - Verifies `/api/futureproof/*` is enforced under the tighter 30 req/min rate-limit bucket.
- **Verification:** `npx tsc --noEmit` and full `npm test -- --run`.
