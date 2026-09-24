import type { AgentState, ResumeSuggestion } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import {
  getHolisticSummaryPrompt,
  getExperienceBulletsPrompt,
} from "@/app/prompts/tailoringSection";
import {
  extractVettedEmployers,
  sanitizeCompanyReferences,
} from "@/app/utils/companyPrivacyGuard";
import {
  groupSuggestionsBySection,
  isolatePreciseOriginalChange,
} from "@/app/utils/resumeReassemble";
import { parseChunkBulletsResponse } from "@/app/utils/chunkBulletParser";
import { stripModelThinking } from "@/app/utils/stripModelThinking";
import {
  diagnoseChunkWithJev,
  judgeSuggestionWithJev,
  type JevJudgeResult,
} from "@/app/services/jev";
import { getDomainTaxonomy } from "@/app/config/domainTaxonomy";

/**
 * Contextually distributes target missing keywords across multiple career roles
 * so each job emphasizes complementary competencies rather than repetitive keyword stuffing.
 */
function getJobSpecificKeywords(
  exp: { title?: string; company?: string; description?: string },
  sortedMissingKeywords: string[],
  jobIndex: number
): string[] {
  if (!sortedMissingKeywords || sortedMissingKeywords.length <= 4) {
    return sortedMissingKeywords || [];
  }

  const descLower = (exp.description || "").toLowerCase();
  const titleLower = (exp.title || "").toLowerCase();

  // 1. Prioritize keywords that naturally relate to this role's historical domain/text
  const domainMatched = sortedMissingKeywords.filter((kw) => {
    const kwLower = kw.toLowerCase();
    return descLower.includes(kwLower) || titleLower.includes(kwLower);
  });

  // 2. Most recent role gets top high-priority target keywords
  if (jobIndex === 0) {
    const topKeywords = sortedMissingKeywords.slice(0, 6);
    return Array.from(new Set([...domainMatched, ...topKeywords])).slice(0, 8);
  }

  // 3. Earlier roles receive distributed complementary keyword slices
  const offset = (jobIndex * 3) % sortedMissingKeywords.length;
  const distributedKeywords = [
    ...sortedMissingKeywords.slice(offset, offset + 4),
    ...sortedMissingKeywords.slice(0, 2),
  ];

  return Array.from(new Set([...domainMatched, ...distributedKeywords])).slice(0, 7);
}

/**
 * Safety trimmer to guarantee the generated summary never exceeds 3 sentences (REQ-UBI-02).
 */
export function enforceBriefSummary(summary: string): string {
  if (!summary) return "";
  const trimmed = summary.trim();
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 3).map((s) => s.trim()).join(" ").trim();
}

export async function surgicalTailorNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const {
    resumeAST,
    selectedJobDescription = "",
    bulletPlan,
    preferences,
    rawResume,
    sortedMissingKeywords = [],
  } = state;

  const experience = resumeAST?.experience || [];
  const jdSnippet = selectedJobDescription.slice(0, 3000);
  const suggestions: ResumeSuggestion[] = [];

  // Privacy guard inputs are computed ONCE and reused for every persisted output (REQ-UBI-02, REQ-ERR-01).
  const vettedEmployers = extractVettedEmployers(experience);
  const targetCompany = deriveTargetCompany(state);
  const summaryPlanned = !!bulletPlan?.summaryChange && !!resumeAST?.summary?.trim();
  const domainTaxonomy = state.industryCategory
    ? getDomainTaxonomy(state.industryCategory)
    : undefined;

  console.log(`[surgicalTailor] ▶ Starting node`, {
    intensity: preferences?.intensity,
    summaryPlanned,
    jobsPlanned: bulletPlan?.jobBulletChanges?.length || 0,
    totalExperienceJobs: experience.length,
    missingKeywords: sortedMissingKeywords.slice(0, 8),
    vettedEmployers,
    targetCompany: targetCompany || "(none derived)",
  });

  // PHASE 1 — dispatch every job bullet task in parallel. The summary is intentionally NOT queued
  // here: it can only be synthesized after these bullets resolve (REQ-EVT-04).
  // Bounded concurrency helper: process tasks with a worker pool of size `limit`
  // preventing Gemini API 429 quota exhaustion when many jobs exist.
  async function runWithConcurrencyLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, idx: number) => Promise<R>
  ): Promise<R[]> {
    const output: R[] = new Array(items.length);
    let currentIndex = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (currentIndex < items.length) {
        const idx = currentIndex++;
        output[idx] = await fn(items[idx], idx);
      }
    });

    await Promise.all(workers);
    return output;
  }

  type BulletTaskResult = { type: "bullets"; index: number; text: string; originalInputText: string };
  const jobChanges = bulletPlan?.jobBulletChanges || [];
  const results: BulletTaskResult[] = (
    await runWithConcurrencyLimit(jobChanges, 2, async ({ jobIndex, bulletIndices, recencyTier }) => {
      const exp = experience[jobIndex];
      if (!exp) {
        console.warn(`[surgicalTailor] Warning: jobIndex ${jobIndex} not found in resumeAST.experience`);
        return null;
      }

      const bulletsText =
        bulletIndices === "all"
          ? exp.description
          : extractSpecificBullets(exp.description, bulletIndices);

      const inputBulletsList = getBulletsList(bulletsText);
      const auditTier = bulletPlan?.jobAudits?.find((a) => a.jobIndex === jobIndex)?.recencyTier;
      const resolvedRecencyTier = recencyTier ?? auditTier;
      console.log(`[surgicalTailor] Job ${jobIndex} (${exp.company}) dispatched with ${inputBulletsList.length} bullets:`, {
        bulletIndices,
        recencyTier: resolvedRecencyTier || "(none)",
        bulletsTextSnippet: bulletsText.slice(0, 100),
      });

      const jobKeywords = getJobSpecificKeywords(exp, sortedMissingKeywords, jobIndex);

      let diagnosis;
      try {
        diagnosis = await diagnoseChunkWithJev(
          {
            title: exp.title,
            company: exp.company,
            bulletsText,
          },
          jdSnippet,
          state.jobTitle,
          state.sessionApiKeys?.['TYPESAFE_API_KEY']
        );
      } catch (diagErr) {
        console.warn(`[surgicalTailor] Jev pre-diagnosis failed for jobIndex ${jobIndex}:`, diagErr);
      }

      try {
        const res = await generateWithFallback(
          getExperienceBulletsPrompt({
            jobTitle: exp.title,
            company: exp.company,
            dates: exp.dates,
            bulletsText,
            jobDescription: jdSnippet,
            preferences,
            userRequestedKeywords: jobKeywords,
            seniorityTier: state.seniorityTier,
            careerArc: state.careerArc,
            targetCompany,
            recencyTier: resolvedRecencyTier,
            diagnosis,
            domainTaxonomy,
            jobKnowledge: state.jobKnowledge,
          }),
          state.modelKey,
          { maxTokens: 2000, temperature: 0.2 },
          state.sessionApiKeys
        );
        const cleanText = stripModelThinking(res.text).trim();
        console.log(`[surgicalTailor] Job ${jobIndex} (${exp.company}) response received (chars: ${cleanText.length})`);
        return {
          type: "bullets" as const,
          index: jobIndex,
          text: cleanText,
          originalInputText: bulletsText,
        };
      } catch (err) {
        console.warn(`[surgicalTailor] Job ${jobIndex} bullet tailoring LLM failed:`, err);
        return {
          type: "bullets" as const,
          index: jobIndex,
          text: bulletsText,
          originalInputText: bulletsText,
        };
      }
    })
  ).filter(Boolean) as BulletTaskResult[];

  let tailoredSummary: string | undefined = resumeAST?.summary?.trim() || undefined;
  const tailoredBulletsByJob: string[] = experience.map((e) => e.description);

  for (const r of results) {
    const exp = experience[r.index];
    const planItem = bulletPlan?.jobBulletChanges.find((c) => c.jobIndex === r.index);
    if (!exp) continue;

    if (planItem?.bulletIndices === "all") {
      const origBullets = getBulletsList(exp.description);
      const { suggestions: chunkSuggestions, tailoredBullets } = parseChunkBulletsResponse({
        llmText: r.text,
        origBullets,
        sectionGroupId: `section-exp-${r.index}`,
        sectionGroupTitle: `${exp.company} – ${exp.title}`,
        jobIndex: r.index,
        sortedMissingKeywords,
      });

      console.log(`[surgicalTailor] Job ${r.index} ("all") produced ${chunkSuggestions.length} suggestions from ${origBullets.length} input bullets`);

      const sanitizedSuggestions = sanitizePhaseOneSuggestions(chunkSuggestions, vettedEmployers, targetCompany);
      const sanitizedBullets = tailoredBullets.map((bullet) =>
        sanitizeCompanyReferences(bullet, vettedEmployers, targetCompany)
      );

      // Evaluate suggestions with Jev quality gate (concurrency bounded to 3)
      const judgedChunkSuggestions = await runWithConcurrencyLimit(
        sanitizedSuggestions,
        3,
        async (sug) => {
          const origBullet = sug.originalText;
          const newBullet = sug.suggestedText;
          try {
            const judge = await judgeSuggestionWithJev(
              origBullet,
              newBullet,
              jdSnippet,
              state.sessionApiKeys?.['TYPESAFE_API_KEY']
            );
            return { sug, judge };
          } catch (judgeErr) {
            console.warn(`[surgicalTailor] Jev judge failed for suggestion ${sug.id}:`, judgeErr);
            return { sug, judge: undefined };
          }
        }
      );

      judgedChunkSuggestions.forEach(({ sug, judge }) => {
        const bulletIdx = sug.bulletIndex ?? 0;
        if (judge && (judge.isAuthentic === false || judge.isBetterThanOriginal === false)) {
          console.log(`[surgicalTailor] Suggestion rejected by Jev gatekeeper:`, {
            id: sug.id,
            isAuthentic: judge.isAuthentic,
            isBetterThanOriginal: judge.isBetterThanOriginal,
          });
          if (origBullets[bulletIdx] !== undefined) {
            sanitizedBullets[bulletIdx] = origBullets[bulletIdx];
          }
        } else {
          suggestions.push({
            ...sug,
            id: `sug-job-${r.index}-bullet-${bulletIdx}`,
            reason: planItem.reason || sug.reason,
            ...(judge ? { jevJudge: judge } : {}),
          });
        }
      });

      tailoredBulletsByJob[r.index] = sanitizedBullets.join("\n");
    } else if (planItem?.bulletIndices) {
      const targetIndices = planItem.bulletIndices as number[];
      const origBullets = extractSpecificBulletsArray(exp.description, targetIndices);
      const { suggestions: chunkSuggestions, tailoredBullets } = parseChunkBulletsResponse({
        llmText: r.text,
        origBullets,
        sectionGroupId: `section-exp-${r.index}`,
        sectionGroupTitle: `${exp.company} – ${exp.title}`,
        jobIndex: r.index,
        sortedMissingKeywords,
      });

      console.log(`[surgicalTailor] Job ${r.index} (${targetIndices.length} targeted bullets) produced ${chunkSuggestions.length} suggestions:`, chunkSuggestions.map(s => ({ idx: s.bulletIndex, text: s.suggestedText.slice(0, 40) })));

      const sanitizedSuggestions = sanitizePhaseOneSuggestions(chunkSuggestions, vettedEmployers, targetCompany);
      const sanitizedBullets = tailoredBullets.map((bullet) =>
        sanitizeCompanyReferences(bullet, vettedEmployers, targetCompany)
      );

      // Evaluate suggestions with Jev quality gate
      const judgedChunkSuggestions = await Promise.all(
        sanitizedSuggestions.map(async (sug) => {
          const origBullet = sug.originalText;
          const newBullet = sug.suggestedText;
          try {
            const judge = await judgeSuggestionWithJev(
              origBullet,
              newBullet,
              jdSnippet,
              state.sessionApiKeys?.['TYPESAFE_API_KEY']
            );
            return { sug, judge };
          } catch (judgeErr) {
            console.warn(`[surgicalTailor] Jev judge failed for suggestion ${sug.id}:`, judgeErr);
            return { sug, judge: undefined };
          }
        })
      );

      judgedChunkSuggestions.forEach(({ sug, judge }) => {
        const localIdx = sug.bulletIndex ?? 0;
        const originalIdx = targetIndices[localIdx] ?? localIdx;

        if (judge && (judge.isAuthentic === false || judge.isBetterThanOriginal === false)) {
          console.log(`[surgicalTailor] Suggestion rejected by Jev gatekeeper:`, {
            id: sug.id,
            isAuthentic: judge.isAuthentic,
            isBetterThanOriginal: judge.isBetterThanOriginal,
          });
          if (origBullets[localIdx] !== undefined) {
            sanitizedBullets[localIdx] = origBullets[localIdx];
          }
        } else {
          suggestions.push({
            ...sug,
            id: `sug-job-${r.index}-bullet-${originalIdx}`,
            bulletIndex: originalIdx,
            reason: planItem.reason || sug.reason,
            ...(judge ? { jevJudge: judge } : {}),
          });
        }
      });

      tailoredBulletsByJob[r.index] = spliceRewrittenBullets(
        experience[r.index].description,
        sanitizedBullets.join("\n"),
        targetIndices
      );
    }
  }

  // PHASE 2 — synthesize the holistic summary strictly AFTER all Phase-1 bullets resolved (REQ-EVT-04).
  // The prompt is assembled from the already-tailored bullets so the summary reflects final state.
  if (summaryPlanned) {
    const originalSummary = resumeAST?.summary?.trim() || "";
    const assembledResume = buildAssembledResume(experience, tailoredBulletsByJob);

    try {
      const res = await generateWithFallback(
        getHolisticSummaryPrompt({
          assembledResume,
          jobDescription: jdSnippet,
          jobTitle: state.jobTitle,
          userRequestedKeywords: sortedMissingKeywords.slice(0, 5),
          preferences,
          seniorityTier: state.seniorityTier,
          careerArc: state.careerArc,
          targetCompany,
        }),
        state.modelKey,
        { maxTokens: 800, temperature: 0.2 },
        state.sessionApiKeys
      );

      const rawSynthesizedSummary = sanitizeCompanyReferences(
        stripModelThinking(res.text).trim(),
        vettedEmployers,
        targetCompany
      );
      const synthesizedSummary = enforceBriefSummary(rawSynthesizedSummary);
      console.log(`[surgicalTailor] Holistic summary synthesized after ${results.length} bullet task(s) (length: ${synthesizedSummary.length})`);

      if (originalSummary && synthesizedSummary && originalSummary !== synthesizedSummary) {
        let judge: JevJudgeResult | undefined;
        try {
          judge = await judgeSuggestionWithJev(
            originalSummary,
            synthesizedSummary,
            jdSnippet,
            state.sessionApiKeys?.['TYPESAFE_API_KEY']
          );
        } catch (judgeErr) {
          console.warn("[surgicalTailor] Jev judge failed for summary:", judgeErr);
        }

        if (judge && (judge.isAuthentic === false || judge.isBetterThanOriginal === false)) {
          console.log("[surgicalTailor] Summary suggestion rejected by Jev gatekeeper:", judge);
          tailoredSummary = originalSummary;
        } else {
          tailoredSummary = synthesizedSummary;
          suggestions.push({
            id: "sug-summary",
            section: "Professional Summary",
            originalText: originalSummary,
            suggestedText: synthesizedSummary.trim(),
            reason: `Reframed summary to highlight target role competencies, core tech stack, and leadership scope`,
            keywords: sortedMissingKeywords.slice(0, 4),
            category: "summary",
            status: "pending",
            ...(judge ? { jevJudge: judge } : {}),
          });
          console.log(`[surgicalTailor] Added summary suggestion`);
        }
      } else if (synthesizedSummary && originalSummary) {
        tailoredSummary = synthesizedSummary;
      }
    } catch (err) {
      console.warn("[surgicalTailor] Holistic summary synthesis failed, keeping original summary:", err);
      tailoredSummary = originalSummary || undefined;
    }
  }

  // Group suggestions into bottom-to-top section groups
  const sectionGroups = groupSuggestionsBySection(suggestions, resumeAST, rawResume);

  // Connect explicit audit rationales from bulletPlan.jobAudits and update tailoredContent
  if (sectionGroups.length > 0) {
    sectionGroups.forEach((group) => {
      if (group.sectionType === "experience" && group.jobIndex !== undefined) {
        if (tailoredBulletsByJob[group.jobIndex]) {
          group.tailoredContent = tailoredBulletsByJob[group.jobIndex];
        }
        if (bulletPlan?.jobAudits && bulletPlan.jobAudits.length > 0) {
          const audit = bulletPlan.jobAudits.find((a) => a.jobIndex === group.jobIndex);
          if (audit) {
            group.auditRationale = audit.auditRationale;
            if (!audit.hasChanges && (!group.suggestions || group.suggestions.length === 0)) {
              group.status = "unchanged";
              group.hasChanges = false;
            }
          }
        }
      }
    });
  }

  // Set initial active section to the first section group (bottom-to-top start)
  const activeSectionId = sectionGroups[0]?.id;

  console.log(`[surgicalTailor] ✔ Completed. Generated ${suggestions.length} suggestions across ${sectionGroups.length} section groups:`, {
    suggestionIds: suggestions.map(s => s.id),
  });

  return {
    tailoredSummary,
    tailoredBulletsByJob,
    suggestions,
    sectionGroups,
    activeSectionId,
    logs: [
      `[surgicalTailor] Generated ${suggestions.length} granular suggestions across ${results.length + (summaryPlanned ? 1 : 0)} tailoring tasks (${preferences.intensity.toUpperCase()})`,
    ],
  };
}

function isBullet(line: string): boolean {
  const trimmed = line.trim();
  return /^([-*•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]|\d+\.)\s*/.test(trimmed) || /^[-*•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]/.test(trimmed);
}

function getBulletsList(text: string): string[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = lines.filter(isBullet);
  if (bulletLines.length > 0) return bulletLines;
  return lines;
}

function extractSpecificBullets(description: string, indices: number[]): string {
  return extractSpecificBulletsArray(description, indices).join("\n");
}

function extractSpecificBulletsArray(description: string, indices: number[]): string[] {
  const bullets = getBulletsList(description);
  return indices
    .map((i) => bullets[i])
    .filter(Boolean);
}

function spliceRewrittenBullets(
  originalDescription: string,
  rewrittenBulletsText: string,
  targetIndices: number[]
): string {
  const bullets = getBulletsList(originalDescription);
  const rewrittenList = getBulletsList(rewrittenBulletsText);

  targetIndices.forEach((targetIdx, listIdx) => {
    if (rewrittenList[listIdx] && bullets[targetIdx] !== undefined) {
      bullets[targetIdx] = rewrittenList[listIdx];
    }
  });

  return bullets.join("\n");
}

/**
 * Tokens that must never be mistaken for an employer name by the job-description heuristic.
 *
 * Two families, both of which compensate for the LOW length floor in `isPlausibleCompanyName`
 * (that floor is deliberately `> 1` so genuine 2–3 character employers such as IBM, SAP, GM, EA,
 * BP and 3M are scrubbed consistently with `sanitizeCompanyReferences`):
 *
 * 1. Generic role/level/scope/function words and short JD abbreviations that commonly follow "at"
 *    in real postings ("at scale", "at all levels", "at Senior Manager level", "at our core",
 *    "at HR", "at QA").
 * 2. A COMPACT, deliberately non-exhaustive set of high-frequency JD geography names
 *    ("at Denver", "at Boston"). A false positive is severe because the scrubber replaces the
 *    token GLOBALLY across every bullet and the summary, so a small curated list is worth the trade.
 *
 * Bounded mitigation only — this is intentionally NOT an enumeration of world cities, and does not
 * attempt to cover every non-company token. See the residual-limitation note on
 * `isPlausibleCompanyName`.
 */
const GENERIC_TARGET_TOKENS = new Set([
  // role / level / scope / seniority prose
  "senior",
  "junior",
  "staff",
  "lead",
  "principal",
  "manager",
  "director",
  "intern",
  "associate",
  "specialist",
  "analyst",
  "engineer",
  "consultant",
  "coordinator",
  "remote",
  "hybrid",
  "onsite",
  "contract",
  "level",
  // determiners / pronouns / prepositions / quantifiers that head generic prose
  "the",
  "this",
  "that",
  "these",
  "those",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "to",
  "for",
  "by",
  "with",
  "within",
  "all",
  "any",
  "each",
  "every",
  "some",
  "no",
  "not",
  "top",
  "new",
  "we",
  "us",
  "you",
  "our",
  "your",
  "their",
  "its",
  "it",
  // short JD abbreviations / generic function words
  "ai",
  "ml",
  "hr",
  "qa",
  "pm",
  "vp",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "sr",
  "jr",
  "st",
  "job",
  "role",
  "team",
  "work",
  "company",
  "employer",
  "organization",
  "organisation",
  // abstract-scope idioms that follow "at" in JD prose ("at scale", "at speed", "at volume")
  "scale",
  "speed",
  "risk",
  "cost",
  "volume",
  "capacity",
  "core",
  "least",
  "most",
  "best",
  "first",
  "last",
  "same",
  "large",
  "small",
  "high",
  "low",
  "times",
  "global",
  "enterprise",
  "masters",
  "strategic",
  // high-frequency JD geographies (bounded, non-exhaustive)
  "denver",
  "riverside",
  "boston",
  "new york",
  "seattle",
  "austin",
  "chicago",
  "atlanta",
  "san francisco",
  "los angeles",
  "dallas",
  "london",
  "toronto",
  "berlin",
]);

/**
 * Guards the job-description heuristic against over-capturing generic prose. Errs toward returning
 * nothing (a missed scrub is far less harmful than scrubbing a legitimate word out of every bullet).
 *
 * Length-floor rationale: the threshold is `> 1`, intentionally IDENTICAL to the floor in
 * `sanitizeCompanyReferences` (`src/app/utils/companyPrivacyGuard.ts`). A higher floor of 4 silently
 * disabled the scrub for real acronym employers (IBM, SAP, GM, EA, BP, 3M), letting them leak into
 * persisted bullets and the summary. The extra false-positive risk a low floor introduces is
 * compensated by the expanded `GENERIC_TARGET_TOKENS` stoplist above and the leading-token check
 * below — NOT by raising the floor again.
 *
 * Residual limitation (accepted, bounded): the stoplist cannot enumerate every world city,
 * non-company proper noun or JD idiom, so a capitalized non-company token that follows "at" and is
 * NOT listed can still be mis-derived (and then scrubbed globally). We deliberately avoid growing
 * the stoplist into hundreds of entries or adding an NLP dependency.
 */
function isPlausibleCompanyName(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (trimmed.length <= 1) return false;

  // A purely numeric capture ("at 20 locations", "at 5 sites") is never an employer, and scrubbing the
  // bare number would corrupt every numeric mention throughout the resume.
  if (/^\d+$/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (GENERIC_TARGET_TOKENS.has(lower)) return false;

  // Multi-word captures inherit the generic-ness of their LEADING token, e.g. "Senior Manager" or
  // "New York" must be rejected even though the full phrase is not itself a stoplist entry.
  const leadingToken = lower.split(/\s+/)[0];
  return !GENERIC_TARGET_TOKENS.has(leadingToken);
}

/**
 * Extends a truncated abbreviation-style capture across its final period ("U.S" + ". Bank" -> "U.S. Bank").
 *
 * A regex alone cannot distinguish "U.S. Bank" from "IBM. Apply" — both are `Word. Word`. The only
 * reliable signal is that true abbreviations are built from short dot-separated segments, so the
 * extension is applied ONLY when the capture already contains a dot and every segment is <= 2 chars.
 * That keeps "IBM." / "Meta." / "BP." (single un-dotted segments) from swallowing the next sentence,
 * which would rebuild an unmatchable scrub regex and silently leak the employer (REQ-UBI-02).
 */
function extendAbbreviatedCompany(jd: string, matchEnd: number, captured: string): string {
  if (!captured.includes(".")) return captured;

  const segments = captured.split(".").filter(Boolean);
  if (segments.length < 2 || !segments.every((segment) => segment.length <= 2)) return captured;

  // Only extend across a single "." that is followed by a new capitalized word.
  if (jd[matchEnd] !== ".") return captured;
  const nextWords = jd.slice(matchEnd + 1).match(/^[ ]+([A-Z0-9][A-Za-z0-9&'-]*)/);
  return nextWords ? `${captured}. ${nextWords[1]}` : captured;
}

/**
 * Derives the target employer name defensively from the most authoritative source available (REQ-UBI-02).
 *
 * Priority order:
 * 1. `companyResearch.name` / `companyResearch.company` — already-resolved target metadata.
 * 2. `discoveredJobs[0].company` — the first job discovered for this run.
 * 3. A deliberately CONSERVATIVE regex over the selected job description that only captures a
 *    capitalized organisation token immediately following an "at" boundary, e.g.
 *    "Role at TargetCorp looking for Senior Product Analyst" -> "TargetCorp".
 *
 * Returns `undefined` (never `""`) when nothing is confidently found so downstream privacy gating
 * treats the target company as genuinely absent instead of scrubbing against an empty string.
 *
 * Residual limitation (accepted, bounded): step 3 is a last-resort heuristic. A capitalized
 * non-company proper noun (an unlisted city, product, or team name) following "at" can still be
 * mis-derived. This asymmetry is deliberate — a FALSE POSITIVE corrupts legitimate text globally
 * because `sanitizeCompanyReferences` replaces the token across every bullet and the summary,
 * whereas a FALSE NEGATIVE merely leaves `REQ-UBI-02` to the Task-4 prompt-level mandate
 * ("DO NOT mention ...") plus opportunistic scrubbing. The `GENERIC_TARGET_TOKENS` stoplist is the
 * primary defence and is deliberately the extension point for new false positives; no NLP
 * dependency or exhaustive city enumeration is used.
 *
 * NOTE: an earlier revision additionally required a "hiring cue" near the match. That was reverted —
 * requiring a cue silently disabled BOTH privacy layers (prompt mandate + scrubber) for extremely
 * common JD phrasings such as "you will work at X", "opportunity at X", "based at X" and
 * "headquartered at X", which is a far worse failure than the false positives it prevented.
 */
function deriveTargetCompany(state: AgentState): string | undefined {
  const research = state.companyResearch;
  if (research && typeof research === "object") {
    const fromResearch = [research.name, research.company].find(
      (value): value is string => typeof value === "string" && value.trim().length > 1
    );
    if (fromResearch) return fromResearch.trim();
  }

  const discovered = state.discoveredJobs?.[0]?.company;
  if (typeof discovered === "string" && discovered.trim().length > 1) {
    return discovered.trim();
  }

  // Heuristic token grammar:
  // - `[A-Z0-9]` allows acronyms (IBM, SAP) AND digit-leading employers (3M, 7-Eleven).
  // - A dot is allowed ONLY between word characters, so dotted names survive ("U.S. Bank") while a
  //   sentence-final period can never be captured ("...at Kaiser Permanente. Apply today." must not
  //   yield "Kaiser Permanente. Apply", which would build an unmatchable scrub regex and silently
  //   leak the target employer — REQ-UBI-02).
  // - Words inside the name are separated by SPACES ONLY (`[ ]+`). Tabs and newlines terminate the
  //   capture. Any non-space whitespace inside the captured name (a line wrap or a column break)
  //   would rebuild an unmatchable scrub regex — "TargetCorp\nApply" or "TargetCorp\tApply" — and
  //   leak the employer verbatim into persisted bullets and the summary.
  const jd = state.selectedJobDescription || "";
  const jdPattern =
    /\b[Aa]t[ \t]+([A-Z0-9][A-Za-z0-9&'-]*(?:\.[A-Za-z0-9][A-Za-z0-9&'-]*)*(?:[ ]+[A-Z0-9][A-Za-z0-9&'-]*(?:\.[A-Za-z0-9][A-Za-z0-9&'-]*)*)*)/g;

  // Scan every "at <Capitalized>" candidate and return the first one that is not a stoplisted generic
  // token. Returning on the first regex hit alone would give up too early on a JD that mentions a
  // non-employer capitalized phrase before the real one ("At Scale we operate. Role at TargetCorp.").
  for (const match of jd.matchAll(jdPattern)) {
    if (match.index === undefined) continue;

    const base = match[1]?.replace(/[ \t]+/g, " ").trim();
    if (!base) continue;

    // Recover the trailing period of abbreviation-style names ("U.S" -> "U.S. Bank").
    const candidate = extendAbbreviatedCompany(jd, match.index + match[0].length, base);
    if (isPlausibleCompanyName(candidate)) return candidate;
  }

  return undefined;
}

/**
 * Builds the Phase-2 assembled resume context from RESOLVED Phase-1 bullet output (REQ-EVT-04).
 * Only experience metadata plus the already-tailored bullets are included so the holistic summary is
 * synthesized from post-tailoring state; the full raw resume is deliberately never attached.
 */
function buildAssembledResume(
  experience: Array<{ title?: string; company?: string; dates?: string | null; description?: string }>,
  tailoredBulletsByJob: string[]
): string {
  const blocks = experience.map((exp, index) => {
    const header = `### ${exp.company} – ${exp.title} (${exp.dates || "—"})`;
    const bullets = (tailoredBulletsByJob[index] || exp.description || "").trim();
    return `${header}\n${bullets}`;
  });
  return ["## Experience", ...blocks].join("\n\n");
}

/**
 * Applies the company privacy guard to Phase-1 suggestions (REQ-UBI-02, REQ-ERR-01).
 * Only `suggestedText` is sanitized — `originalText` must always remain the candidate's authentic
 * verbatim history and is therefore never touched.
 */
function sanitizePhaseOneSuggestions(
  suggestions: ResumeSuggestion[],
  vettedEmployers: string[],
  targetCompany?: string
): ResumeSuggestion[] {
  return suggestions.map((sug) => ({
    ...sug,
    suggestedText: sanitizeCompanyReferences(sug.suggestedText, vettedEmployers, targetCompany),
  }));
}
