# Resume Tailor: Quality, Contact, Repeat Use, Analytics, and Randstad Guidance

This plan combines: (1) strict no-invention and Contact block fixes, (2) section-based tailoring and repeat-use flows, (3) analytics, and (4) **Randstad Digital technical resume guidance** as prompt and format updates. All of the following are in addition to each other.

---

## 1. Strict no-invention

### 1.1 Prompt tightening ([src/app/prompts/tailoring.ts](src/app/prompts/tailoring.ts))

- Add an explicit **no-invention** block:
  - **Location:** "Do NOT add city, state, country, or any location to the resume or Contact block unless the original resume explicitly includes it."
  - **Role-specific claims:** "Do NOT add domain-specific concepts (e.g. gamification, endgame flows, situational awareness, sensor fusion, EW) unless the original resume explicitly describes that work."
- In **CONTENT BOUNDARIES**: state that every sentence in Experience and Contact must be traceable to the original text.
- Keep **STRICT_RESTRICTION** and **TRUTHFUL KEYWORD RULE** for both single-doc and section-based tailoring.

### 1.2 Contact block in prompt

- Replace the current "REQUIRED CONTACT BLOCK FORMAT" with:
  - "Contact block: Include ONLY fields that appear in the original resume. Use this order when present: Name, then Location (only if in original), then Phone, then Email, then Degree and University (only if in original and NOT already listed in ## Education). Then LinkedIn/GitHub only if in original. Do not add City, State, or Country if the original has no location. Do not duplicate Education section content in the Contact block."
- **Randstad alignment (see §7):** Contact must fit on **no more than two lines total**; merge into a compact header (e.g. line 1: Name, Location?, Phone; line 2: Email, LinkedIn/GitHub).

### 1.3 Section-based tailoring (structural no-invention)

- Parse resume (reuse resume-parser) into Summary, Experience (title, company, dates, bullets), Education, Skills, Contact.
- **Copy-paste** job title, company, dates for each role; AI tailors only Summary and experience **bullets**.
- Reassemble in code; build Contact from parser output only (no AI). Run Summary + all experience-section calls in parallel; fallback to single-doc if parse fails.

### 1.4 Post-processing

- **Contact block sanitizer** ([src/app/utils/contactBlockSanitizer.ts](src/app/utils/contactBlockSanitizer.ts)): Remove location if not in original; remove degree/university from Contact when Education section exists; keep only contact fields present in original. Run after reassembly in humanize/stream route.

---

## 2. Contact block (source of truth)

- Build Contact from parser only in section-based flow; include location only if `contactInfo.location` is set; do not duplicate Education.
- In single-doc flow, run Contact block sanitizer on model output.
- Resume-parser: use existing behavior; do not guess location.

---

## 3. Repeat use

- **"Tailor this resume for another job":** Use `/?prefillResumeId=<id>`. Home page prefills resume from retrieve (original_content); user pastes new job description. Add "Tailor for another job" on resume detail and profile card. Optional event: `TAILOR_ANOTHER_JOB_CLICK`.
- **"See what we changed":** On resume detail, add toggle/tab showing diff (original vs tailored) using existing diff logic (resumeObfuscator findDifferences or diff-match-patch).
- **CTAs:** Context-aware "Tailor this resume for another job" where applicable; same on success page and profile.

---

## 4. Analytics

- Add **sessionId** and **resumeId** (and source where relevant) to RESUME_TAILOR, RESUME_TAILOR_SUCCESS, EXPORT_RESUME, COPY_RESUME.
- **Derived metrics:** (a) Tailor → export/copy rate (same session or same resumeId); (b) Sessions with 2+ tailors or 2+ job descriptions. Implement in analytics backend or reporting.
- Optional: **TAILOR_ANOTHER_JOB_CLICK** when user clicks "Tailor for another job."

---

## 5. Architecture (section-based tailoring)

- Flow: Parse → Tailor Summary + Tailor each experience’s bullets (parallel) → Reassemble with fixed title/company/dates + Contact from parser → Sanitize/dedupe/obfuscate/save. Fallback to single-doc if parse fails.
- New: section prompts, reassemble function, Contact builder, Contact sanitizer.

---

## 6. Implementation order

1. Prompts + Contact sanitizer (no-invention, Contact rules).
2. Repeat use (prefill, diff view, CTAs).
3. Analytics (event properties, derived metrics).
4. Section-based tailoring (parse → section calls → reassemble).
5. **Randstad prompt and format updates (below).**

---

## 7. Randstad Digital technical resume guidance

Adhere to these in **addition** to everything above. Each item below maps to **prompt** and/or **format/PDF** changes.

### 7.1 Layout and format (PDF / export)

| Guideline | Action |
|-----------|--------|
| Wide body, minimal margins (~1/8 inch top, bottom, sides) | **PDF:** In [ResumePdfDocument.tsx](src/app/components/ResumePdfDocument.tsx), reduce `MARGIN` from 40 to ~9 (1/8" ≈ 9pt). Ensure layout stays readable. |
| No less than 10 pt font (11–12 good) | **PDF:** Already 11pt in styles; add a minimum 10pt rule and avoid smaller font. |
| Limit page breaks, multi-line spaces, bars, tables, fancy logos or colors | **Prompt:** "Do not use tables, horizontal bars, decorative logos, or colored text. Use minimal blank lines between sections." **PDF:** Avoid extra spacing; no decorative elements. |

### 7.2 Contact and header

| Guideline | Action |
|-----------|--------|
| Contact info at top, **no more than two lines total**; header clean and compact | **Prompt:** "Contact block: Place at top. Use at most TWO lines total (e.g. Line 1: Name, Location if present, Phone. Line 2: Email, LinkedIn/GitHub if present). No pipes; use commas or spaces. Clean and compact." **Conflict resolution:** Override current "each element on its own line" in favor of Randstad’s 2-line header for ATS/VMS. |

### 7.3 Experience block structure

| Guideline | Action |
|-----------|--------|
| Company and **location on the same line**; **title and duration on the line below** | **Prompt:** "For each job, use exactly two lines before bullets: Line 1: 'Company Name, Location' (omit location if not in original). Line 2: 'Job Title – Duration' (e.g. 'Software Engineer – January 2020 - Present'). This is the standard; do not deviate." |
| Multiple roles at same org over years | **Prompt:** "If the candidate had multiple roles at the same company, list company and location once; then list each title and duration on its own line before that role’s bullets." |

### 7.4 Skills section

| Guideline | Action |
|-----------|--------|
| Technical/conceptual skills: **categorized list running horizontally**; space-efficient, easy to curate | **Prompt:** "Skills: Use categorized lists. Within each category, list skills horizontally (comma-separated or short inline list), not long vertical lists. Categories run across the page; keep each category to one line if possible, or two lines max. Space-efficient." |

### 7.5 First bullet per role (overview)

| Guideline | Action |
|-----------|--------|
| **First bullet** under each job = overview of charge: responsibilities, team size, tech stack, type of app/product (dashboard, data viz, business system, etc.), methodology, scope/distribution | **Prompt:** "The FIRST bullet under each job title must be an overview of the role: responsibilities, team size, tech stack, type of product (e.g. dashboard, data viz, business system), methodology (e.g. Agile), and scope or distribution. No need for impact in this bullet; save impact for later bullets." |

### 7.6 Bullet composition and length

| Guideline | Action |
|-----------|--------|
| **Action → Ingredients → Impact:** Strong past-tense action verb, then technologies/tools/methods/metrics, then impact (qualitative or quantitative) | **Prompt:** "Each bullet (except the first overview bullet): Structure as Action (strong past-tense verb) → Ingredients (technologies, tools, methods, metrics) → Impact (result: e.g. 50% decrease, major improvement). Example: 'Built real-time dashboard with React and D3, reducing support tickets by 30%.'" |
| **2 lines maximum** per bullet; fill two lines with detail where possible | **Prompt:** "Every experience bullet must be exactly 2 lines when possible. Do not use single-line bullets or 3+ line bullets. Aim to fill the two lines with concrete detail (technologies, numbers, scope)." **Conflict resolution:** Replace current "BULLET LENGTH VARIETY" (1 or 2–3 lines) with Randstad’s 2-line standard for ATS compatibility. |
| Bullets left-justified under first letter of company/title | **Prompt:** "Bullets must align under the job block (left-justified; no extra indentation beyond the bullet)." **PDF:** Already handled by bulletWrap/paddingLeft; ensure no extra indent. |

### 7.7 Resume speak

| Guideline | Action |
|-----------|--------|
| No articles (a, the, an); infinitives → present participle ("to improve" → ", improving...") | **Prompt:** "Write in resume speak: Omit articles (a, the, an). Use present participles instead of infinitives (e.g. ', improving...' or ', reducing...' not 'to improve' or 'to reduce'). Keep tone concise and professional." |

### 7.8 Keywords

| Guideline | Action |
|-----------|--------|
| Weave high-scoring JD keywords into bullets; integrating into bullets is critical (lists are fine but bullets are critical) | Already in plan; ensure prompt states: "Weave job description keywords into experience bullets; integration into bullets is critical for ATS." |
| **Curate keywords:** Drop things from 10+ years ago; drop surface-level only; don’t be a keyword hoarder | **Prompt:** "Curate skills and keywords: Prefer recent, relevant experience. Remove or de-emphasize skills from 10+ years ago or surface-level only. Do not list every technology ever touched; focus on what is relevant to the target job and the candidate’s depth." |

### 7.9 Education

| Guideline | Action |
|-----------|--------|
| Education **at bottom** | **Prompt:** "Place the Education section at the bottom of the resume (after Experience and Skills)." (Ensure section order in reassembly and prompt output order.) |
| Each degree/certificate **one line ideally**, at most two lines | **Prompt:** "Education: Each degree, diploma, or certificate on one line if possible (e.g. 'Bachelor of Science, Computer Science – University Name, 2018'), or at most two lines. No lengthy descriptions." |
| **No incomplete degree** – take it off | **Prompt:** "Do not list incomplete degrees or in-progress degrees unless the candidate is currently enrolled and it is relevant. Incomplete degrees raise red flags; omit them." |

### 7.10 Additional sections (passion projects, freelance, side work)

| Guideline | Action |
|-----------|--------|
| Additional sections (passion projects, freelance, side work) **beneath education**; same format as professional experience | **Prompt:** "Any section for passion projects, freelance, or side work goes AFTER Education. Use the same format as Professional Experience: company/title/dates, then bullets in Action → Ingredients → Impact, 2 lines per bullet." |

### 7.11 Prior Experience (roles older than 7–10 years)

| Guideline | Action |
|-----------|--------|
| Experience **older than 7–10 years:** create section **"Prior Experience"** just after Professional Experience | **Prompt:** "If the candidate has roles older than 7–10 years from today, create a section titled 'Prior Experience' immediately after 'Professional Experience'. In this section do NOT write bullet points." |
| In Prior Experience: **only Company – Title and duration on same line, right-justified** | **Prompt:** "In Prior Experience, list each role on one line only: 'Company Name – Job Title – Duration'. Format for right-justification (align duration to the right). No bullets." **PDF:** For blocks in "Prior Experience" section, render that line with right-aligned duration (e.g. company and title left, dates right). |
| **Transparency:** List entire chronology; **only bullets for jobs within 7–10 years** | **Prompt:** "Include the candidate’s full work history in chronological order. Write bullet points only for roles within the last 7–10 years. Older roles appear in Prior Experience with company, title, and duration only." |

---

## 8. Contradictions and resolutions

- **Contact:** Current prompt says "each element on its own line." Randstad says "no more than two lines total." **Resolution:** Adopt Randstad’s 2-line compact header for ATS/VMS compatibility; update prompt as in §7.2.
- **Bullet length:** Current prompt encourages "some 1 line, others 2–3 lines" (BULLET LENGTH VARIETY). Randstad says "2 lines (not one, not 3)." **Resolution:** Adopt Randstad’s 2-line standard; remove or replace BULLET LENGTH VARIETY with the 2-line rule in §7.6.

If you prefer to keep bullet length variety or multi-line contact for non-Randstad users, add an optional "Randstad / ATS-strict" mode that applies §7.2 and §7.6 only when enabled.

---

## 9. Implementation checklist for Randstad (§7)

- [ ] **Prompt ([src/app/prompts/tailoring.ts](src/app/prompts/tailoring.ts)):** Add Randstad block (contact 2-line, company/location + title/duration, first-bullet overview, Action→Ingredients→Impact, 2-line bullets, resume speak, keyword curation, education at bottom/one line/no incomplete, prior experience section and format, additional sections below education).
- [ ] **Prompt:** Resolve contradictions (contact 2-line; bullets 2-line only).
- [ ] **PDF ([ResumePdfDocument.tsx](src/app/components/ResumePdfDocument.tsx)):** Minimal margins (~9pt); font min 10pt; no decorative elements; right-justify duration in Prior Experience when that section is present.
- [ ] **Section-based reassembly:** When building output, enforce section order (Summary, Experience, Skills, Education, Prior Experience if any, then passion/freelance/side work) and experience block format (company, location; title, duration; then bullets).

This keeps the full plan intact and adds Randstad as prompt and format updates in addition to everything else.
