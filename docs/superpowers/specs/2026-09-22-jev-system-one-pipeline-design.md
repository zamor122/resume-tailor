# Jev System 1 Decision & Gemini SDK Resume Tailoring Pipeline

**Document ID**: SPEC-JEV-2026-09-22  
**Status**: Approved / Ready for Plan & Implementation  
**Target Branch**: `feature/section-narrative-review-flow`  

---

## 1. Executive Summary & Problem Context

Currently, the resume tailoring pipeline pairs LangGraph agent nodes with generative LLMs (Gemini / Claude / OpenAI) to rewrite experience bullets and professional summaries. While effective, this architecture encounters three key challenges:
1. **Unfocused LLM Generation**: LLM chunk rewrites receive the full job description and original bullets with general guidelines, but lack pre-computed diagnostic marching orders tailored to that specific career section.
2. **Heuristic Quality Checking**: Post-rewrite validation relies on simple character-length and string-diff heuristics (`isSubstantiveChange`) that cannot evaluate semantic relevance, authentic tone of voice, or subtle fact fabrication.
3. **Keyword-Counting Metrics**: Before and after match scores displayed on the website are computed through literal token string matching rather than semantic alignment.

This specification designs a **hybrid System 1 & System 2 architecture**:
* **Jev (System 1)**: TypeSafe AI's sub-100ms structured decision engine provides:
  1. **Pre-Chunk Diagnosis**: Compares each work experience chunk against the job description to identify specific skill gaps, seniority fit, and enhancement objectives.
  2. **Post-Rewrite Quality Judge**: Evaluates every generated bullet for content matching, tone of voice, and substantive improvement over the original.
  3. **Credible Effectiveness Ratings**: Drives the website's before/after match scores and per-suggestion review badges.
* **Gemini SDK (System 2)**: Powers the generative rewriting of experience chunks guided by Jev's diagnostic payload, followed by a brief, punchy full-resume summary synthesis highlighting the candidate's most relevant qualifications.

---

## 2. EARS Requirements Specification

Requirements follow the **Easy Approach to Requirements Syntax (EARS)** standards:

### 2.1 Ubiquitous Requirements (UBI)
* **`REQ-UBI-01` (Dual-Sided Jev Pipeline)**:  
  The system SHALL utilize Jev both *prior* to LLM generation (for chunk diagnostic comparison) and *after* LLM generation (for quality judging and rating).
* **`REQ-UBI-02` (Concise Summary Constraint)**:  
  The system SHALL restrict the generated professional summary to 2–3 concise sentences that highlight the candidate's most relevant achievements and skills for the target role.
* **`REQ-UBI-03` (Authenticity & Privacy Guard)**:  
  The system SHALL prevent fabrication of unverified percentage metrics and prevent target employer attribution leaks in all generated text.

### 2.2 Event-Driven Requirements (EVT)
* **`REQ-EVT-01` (Pre-Chunk Jev Diagnostic Comparison)**:  
  WHEN an experience chunk is prepared for tailoring, the system SHALL invoke Jev to determine:
  1. Skill & keyword alignment between the chunk and target job description.
  2. Seniority & scope match on a 1–5 scale.
  3. A targeted enhancement focus (`elevate_ownership`, `clarify_outcomes`, `highlight_transferable_competencies`, or `showcase_scale`).
* **`REQ-EVT-02` (Diagnosis-Guided LLM Rewriting)**:  
  WHEN tailoring each experience chunk with the Gemini SDK, the system SHALL inject Jev's pre-computed diagnostic payload into the prompt as explicit enhancement directives.
* **`REQ-EVT-03` (Sequential Brief Summary Synthesis)**:  
  WHEN all experience chunks have completed tailoring, the system SHALL synthesize the brief professional summary grounded directly on the newly refined experience achievements.
* **`REQ-EVT-04` (Post-Rewrite Jev Quality & Tone Evaluation)**:  
  WHEN candidate suggestions are generated, the system SHALL invoke Jev to evaluate:
  1. Content & keyword matching against the job description.
  2. Professional and authentic tone of voice.
  3. Overall substantive improvement over the candidate's original text.

### 2.3 State-Driven Requirements (STA)
* **`REQ-STA-01` (Jev-Driven Website Effectiveness Scores)**:  
  WHILE rendering the tailoring results on the website, the baseline (before) score, tailored (after) score, and score improvement metrics SHALL be derived from Jev's objective alignment evaluations.
* **`REQ-STA-02` (Suggestion Reviewer Badges)**:  
  WHILE the candidate reviews suggestions in `ResumeSuggestionReviewer.tsx`, each suggestion card SHALL display Jev-evaluated badges indicating content match boost, tone authenticity, and impact rating.

### 2.4 Error Handling & Fallback Requirements (ERR)
* **`REQ-ERR-01` (Graceful Jev Degradation)**:  
  IF the Jev service is unreachable, fails, or exceeds a 1500ms timeout threshold, THEN the system SHALL seamlessly fall back to local heuristic classifiers and deterministic diff-matching without blocking the user's tailoring workflow.
* **`REQ-ERR-02` (Quality Gate Rejection)**:  
  IF Jev judges a generated bullet suggestion as worse than the original, cosmetic-only, or fabricated, THEN the system SHALL automatically reject the suggestion and preserve the candidate's original bullet.

---

## 3. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Intake & Chunking
        A[Raw Resume & Job Description] --> B[intakeParser: Parse Experience AST]
    end

    subgraph Step 1: Pre-Chunk Diagnosis with Jev (~80ms per chunk)
        B --> C1[Chunk 1: Role A]
        B --> C2[Chunk 2: Role B]
        B --> C3[Chunk 3: Role C]

        C1 --> D1["Jev Diagnostic: Skill Gap + Scope Match + Target Focus"]
        C2 --> D2["Jev Diagnostic: Skill Gap + Scope Match + Target Focus"]
        C3 --> D3["Jev Diagnostic: Skill Gap + Scope Match + Target Focus"]
    end

    subgraph Step 2: Gemini SDK Experience Tailoring (Parallel)
        D1 --> E1[Gemini 2.5 Flash: Tailor Role A with Jev Directives]
        D2 --> E2[Gemini 2.5 Flash: Tailor Role B with Jev Directives]
        D3 --> E3[Gemini 2.5 Flash: Tailor Role C with Jev Directives]
    end

    subgraph Step 3: Sequential Brief Summary Synthesis
        E1 --> F[Gemini 2.5 Flash: Synthesize Brief 2-3 Sentence Summary]
        E2 --> F
        E3 --> F
    end

    subgraph Step 4: Post-Rewrite Jev Quality & Tone Judging (~90ms)
        E1 --> G[Jev Post-Judge: Content Match + Tone + Substantive Improvement]
        E2 --> G
        E3 --> G
        F --> G
        G --> H{Passes Quality Gate?}
        H -- Yes --> I[Verified Suggestions + Jev Ratings]
        H -- No --> J[Discard Weak Suggestion / Keep Original]
    end

    subgraph Step 5: Website Delivery & UI Ratings
        I --> K[reassembleAndScore: Compute Jev-Derived Match Scores]
        K --> L[UI: Split-Screen Reviewer with Jev Verification Badges]
        K --> M[UI: Before/After Match Score & Improvement Metrics]
    end
```

---

## 4. Detailed Component Design

### 4.1 Jev Client & Service Layer (`src/app/services/jev.ts`)

A dedicated, lightweight client supporting both `@typesafe-ai/sdk` and direct HTTPS REST execution (`POST https://api.typesafe.ai/v1/systemone` or OpenRouter / Vercel AI Gateway):

```typescript
export interface JevDiagnosticResult {
  matchedSkills: string[];
  missingSkills: string[];
  seniorityScore: number; // 1 to 5
  enhancementFocus: 'elevate_ownership' | 'clarify_outcomes' | 'highlight_transferable_competencies' | 'showcase_scale';
  confidence: number;
}

export interface JevJudgeResult {
  isAuthentic: boolean;        // Noul: false if fake metrics or hallucination detected
  contentMatchScore: number;   // 1 to 5
  toneOfVoiceRating: 'strong_authentic' | 'neutral' | 'buzzword_heavy';
  isBetterThanOriginal: boolean; // Noul: true if meaningfully superior
  overallImpactScore: number;  // 1 to 5
  scoreDeltaPercent: number;   // e.g. +28%
}
```

### 4.2 Pre-Chunk Diagnosis Implementation (`src/app/agent/nodes/surgicalTailor.ts`)

Before issuing the generative prompt for each role chunk:
1. Extract the role metadata (Title, Company, Date, Bullets text).
2. Query Jev with the job description summary and the chunk text.
3. Jev returns:
   * **Missing JD Skills**: Specific skills from the JD that are relevant to this role's domain.
   * **Scope Match**: Rating of historical scope against target level.
   * **Enhancement Focus**: Selected directive.
4. Pass this structured diagnosis into `getExperienceBulletsPrompt`.

### 4.3 Prompt Enhancement for Gemini SDK

The experience tailoring prompt is upgraded to accept Jev's diagnostic payload:

```text
DIAGNOSTIC DIRECTIVES (From Jev System 1 Analysis):
- Targeted Objective: ${diagnosis.enhancementFocus}
- Priority JD Competencies to Emphasize (if supported by role): ${diagnosis.missingSkills.join(", ")}
- Seniority Calibration: Target level is ${state.seniorityTier} (Current role match rating: ${diagnosis.seniorityScore}/5)

STRICT RULES:
- Fulfill the above directive while strictly preserving factual authenticity.
- Prohibit inventing numerical metrics, percentages, or claiming target employer employment.
```

### 4.4 Brief Holistic Summary Synthesis

Once all chunks complete tailoring, the summary prompt generates a strictly concise summary:
* **Constraint**: 2 to 3 sentences maximum.
* **Content Focus**: Synthesizes the candidate's top transferable achievements and primary core competencies directly matching the target job description.
* **No generic fluff**: Forbids cliché openings ("Passionate professional with...") in favor of hard-hitting domain focus.

### 4.5 Post-Rewrite Jev Quality Judge & Gatekeeper

Each candidate suggestion (`ResumeSuggestion`) is evaluated by Jev:
* **Noul Check**: `"Does this suggestion introduce fabricated metrics or unrealistic claims?"` -> Must be `false`.
* **Noul Check**: `"Is this suggestion substantively superior to the candidate's original text?"` -> Must be `true`.
* **Score Check**: Content match (1–5) and Tone of Voice rating.
* **Rejection**: If a suggestion fails the authenticity or improvement check, it is omitted or flagged, ensuring only high-impact improvements reach the candidate.

### 4.6 Website UI Integration & Ratings

1. **`ResumeSuggestionReviewer.tsx`**:
   * Each suggestion card displays a Jev Verification header:
     * Badge: `✓ Jev Evaluated`
     * Metrics: `+X% Match • [Tone] • [Impact Rating]/5`
2. **Before / After Score in `reassembleAndScore.ts`**:
   * Replace the arbitrary keyword-count formula with Jev's aggregated JD alignment score.
   * Before score = Jev's assessment of original resume vs. JD.
   * After score = Jev's assessment of reassembled resume with accepted suggestions vs. JD.
3. **`TailoredResumeChanges.tsx`**:
   * Update the score improvement card to cite Jev's verified evaluation.

---

## 5. Error Handling, Resiliency & Fallback Strategy

* **Timeout Budget**: Jev calls are allotted an aggressive 1200ms timeout per chunk.
* **Circuit Breaker**: If Jev fails (e.g. rate limit, missing key, network outage):
  * **Pre-Diagnosis Fallback**: Revert to deterministic keyword extraction and existing seniority classifier without erroring out.
  * **Post-Judge Fallback**: Revert to deterministic `isSubstantiveChange` diff matching and standard regex ATS scoring.
  * The user's tailoring run completes without interruption.
* **API Key Handling**: Supports `TYPESAFE_API_KEY` via environment variable or user session configuration, alongside `GEMINI_API_KEY`.

---

## 6. Testing & Verification Plan

1. **Unit Tests**:
   * `tests/services/jev.test.ts`: Verify Jev client responses, typing, prompt serialization, and fallback behavior on error.
   * `tests/agent/jevChunkDiagnosis.test.ts`: Verify that pre-chunk diagnosis produces valid choices and scores for technical and non-technical domains.
   * `tests/agent/jevJudge.test.ts`: Verify that cosmetic-only and fabricated-metric suggestions are rejected by the gatekeeper.
2. **End-to-End Agent Graph Integration**:
   * Run full agent flow with mocked and live Jev/Gemini responses.
   * Verify all chunks are tailored and brief 2-3 sentence summary is synthesized last.
3. **Frontend UI Tests**:
   * Verify `ResumeSuggestionReviewer` renders Jev badges and match deltas cleanly.
   * Verify before/after match scores render correctly on the website dashboard.
