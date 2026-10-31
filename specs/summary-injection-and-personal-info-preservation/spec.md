---
feature_id: "summary-injection-and-personal-info-preservation"
feature_name: "Summary Injection Where Already Present & Verbatim Personal Information Preservation"
status: "Draft — Approved for Implementation"
owner: "Shayne Zamora"
std: "EARS (Easy Approach to Requirements Syntax) & SDD Authoring Contract"
---

# Summary Injection Where Already Present & Verbatim Personal Information Preservation

## 1. Context & Problem Statement

Users expect their tailored resume to respect their original document's structure and retain 100% of their personal identification, contact details, links, and credentials. Currently, two related failure modes compromise this experience:

1. **Unwanted Summary Injection & Overwriting Header Information**:
   - In `resumeParser.ts`, a fallback heuristic assumed any non-bullet line longer than 30 characters in the first 10 lines was a summary if no explicit summary header was found. This frequently misidentified professional titles, taglines (e.g., *"Senior Full Stack Engineer & AI Architect | Distributed Systems"*), address lines, or certifications as the summary.
   - In `bulletPlanner.ts`, `summaryChange` defaulted to `true` regardless of whether the original resume actually contained a summary section.
   - In `surgicalTailor.ts`, a 3-sentence summary was synthesized even when the original resume had no summary, setting `tailoredSummary` and generating unwanted summary cards.
   - In `reassembleResumeFromSections`, a `## Summary` section was unconditionally appended after contact whenever `tailoredSummary` existed, injecting a summary into resumes that deliberately had none.
   - In `applySuggestionsToOriginal`, when a summary did exist, `isolatePreciseOriginalChange` narrowed multi-line/multi-sentence summaries to a single line or sentence fragment, replacing only a fraction of the summary in-place and leaving orphaned text.

2. **Destructive Stripping of Personal and Contact Information**:
   - In `resumeReassemble.ts`, `buildContactFromOriginal` replaced the original contact lines with a generated 2-line block (`buildContactFromParsed`) that discarded GitHub handles, personal websites, credentials, titles, clearance levels, and work authorizations.
   - In `contactBlockSanitizer.ts`, `findContactEndIndex` stopped at the first blank line within the first 6 lines, dropping any contact details located after a blank spacer.
   - In `contactBlockSanitizer.ts`, `looksLikeDegreeOrUniversity` matched `\bma\b`, mistakenly deleting contact lines containing Massachusetts state abbreviations (e.g., *"Boston, MA"*).
   - In `atsSanitizer.ts`, `sanitizeResumeForATS` blindly split pipes across the first 10 lines of the document, disrupting multi-column formatting and top job titles.

This specification establishes strict EARS requirements to guarantee that summaries are only injected/replaced where an original summary already exists, and that all personal information is preserved verbatim.

---

## 2. EARS Requirements Specification

### 2.1 Ubiquitous Requirements

- **@EARS-SUM-01 [Ubiquitous] Conditional Summary Injection**: The tailoring engine SHALL inject or replace a professional summary ONLY where a summary section already exists in the candidate's original resume. If no summary section is present in the original resume, the system SHALL NOT synthesize, inject, or display a summary.
- **@EARS-SUM-02 [Ubiquitous] Personal Information Verbatim Preservation**: The system SHALL preserve all original personal and contact information verbatim—including candidate name, phone numbers, email addresses, physical locations, LinkedIn URLs, GitHub handles, portfolio links, custom domains, professional titles, credentials, certifications, security clearances, and work authorizations—without dropping, altering, or truncating any lines.
- **@EARS-SUM-03 [Ubiquitous] Safe Resume Parsing (No False Summaries)**: The resume parser SHALL NOT classify header lines, contact details, addresses, professional titles, or un-headed preambles as a summary. A summary SHALL ONLY be recognized if designated under an explicit summary section header or variant (*Summary*, *Profile*, *Professional Summary*, *Executive Summary*, *About*, *About Me*, *Objective*, *Career Objective*).
- **@EARS-SUM-04 [Ubiquitous] Whole-Block Summary Replacement**: Where an original summary exists, the suggestion engine SHALL pair the entire original summary block with the tailored summary so that acceptance replaces the full summary in-place, without leaving orphaned sentences or duplicate lines.

### 2.2 Event-Driven Requirements

- **@EARS-EVT-01 [When] Original Summary Present**: WHEN `intakeParserNode` identifies a non-empty summary section in the parsed AST (`resumeAST.summary?.trim()`), the bullet planner SHALL evaluate user preferences (`sectionsToModify.summary`), the surgical tailor SHALL synthesize a tailored summary, and `groupSuggestionsBySection` SHALL render the `section-summary` group.
- **@EARS-EVT-02 [When] Original Summary Absent**: WHEN `intakeParserNode` finds no summary section in the parsed AST (`!resumeAST.summary?.trim()`), `bulletPlannerNode` SHALL set `bulletPlan.summaryChange = false`, `surgicalTailorNode` SHALL NOT synthesize a summary, no summary suggestions SHALL be generated, and `reassembleResumeFromSections` SHALL NOT output a `## Summary` section.
- **@EARS-EVT-03 [When] Section Group Generation**: WHEN `groupSuggestionsBySection` groups suggestions for the review UI, the system SHALL omit the `section-summary` card if the candidate has no original summary and no summary suggestions exist.
- **@EARS-EVT-04 [When] Contact Block Extraction**: WHEN reassembling the resume or extracting contact information, the system SHALL capture the complete verbatim preamble before the first section header from `originalResume`, including all lines, delimiters, and blank spacing lines, without truncation.

### 2.3 State-Driven Requirements

- **@EARS-STA-01 [While] Narrative Review Active**: WHILE the candidate is reviewing suggestions in the review cockpit, if a summary change was suggested, the summary review card SHALL display the exact original summary text and the proposed tailored summary.

### 2.4 Unwanted Behavior / Exception Handling Requirements

- **@EARS-ERR-01 [Exception] Resumes Without Markdown Headers**: IF a resume does not utilize `#` or `##` markdown headers, THEN `findContactEndIndex` SHALL identify section boundaries using known section titles (*Experience*, *Summary*, *Education*, *Skills*) and date-range job headers, without prematurely terminating at intermediate blank lines.
- **@EARS-ERR-02 [Exception] State and Location Abbreviation Safety**: IF a contact line contains state abbreviations (such as *"MA"* for Massachusetts), degree acronyms, or credentials in the header, THEN contact sanitizers SHALL NOT delete or strip that line.
- **@EARS-ERR-03 [Exception] Empty Contact Block Fallback**: IF AND ONLY IF `originalResume` contains no preamble text before the first section header, THEN the system SHALL construct contact information from parsed AST fields via `buildContactFromParsed`.

---

## 3. Implementation Plan & Files Touched

1. **`src/app/utils/resumeParser.ts`**:
   - Remove lines 503–516 (the 30-character fallback rule). Only set `summary` if extracted from an explicit summary header.
2. **`src/app/agent/nodes/bulletPlanner.ts`**:
   - Condition `summaryChange` on both `sectionsToModify?.summary` AND `Boolean(resumeAST?.summary?.trim())`.
3. **`src/app/agent/nodes/surgicalTailor.ts`**:
   - Ensure `summaryPlanned` requires `Boolean(resumeAST?.summary?.trim())`.
   - Set `originalText: originalSummary.trim()` for `sug-summary` so the entire summary is replaced in-place.
4. **`src/app/utils/resumeReassemble.ts`**:
   - Update `buildContactFromOriginal`: Return the verbatim original contact block from `originalResume` whenever present. Never drop custom fields or truncate to 2 lines.
   - Update `reassembleResumeFromSections`: Only insert `## Summary\n\n` if `parsed.summary?.trim()` existed in the original resume.
   - Update `groupSuggestionsBySection`: Only create `section-summary` if `effectiveAST?.summary?.trim()` exists or if summary suggestions exist.
5. **`src/app/utils/contactBlockSanitizer.ts`**:
   - Fix `findContactEndIndex` so blank lines within the contact block do not prematurely end contact detection.
   - Fix `looksLikeDegreeOrUniversity` so state abbreviations (e.g. `\bma\b`) do not match location lines.
6. **`src/app/agent/nodes/reassembleAndScore.ts`**:
   - Use `lightSanitizeForATS` instead of `sanitizeResumeForATS` to prevent pipe splitting across the first 10 lines from corrupting contact and experience headers.
