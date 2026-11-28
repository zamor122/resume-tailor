import fs from "fs";
import path from "path";

// Load .env.local before importing app modules so API keys are available
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

import {
  AI_TOOL_REGISTRY,
  isRoleRecentForAi,
  resolveVerifiedTools,
  type ComfortLevel,
} from "../src/app/config/aiToolRegistry";
import type { IndustryCategory } from "../src/app/config/domainTaxonomy";
import {
  analyzeResumeForFutureproof,
  generateFutureproofUpgrades,
} from "../src/app/services/futureproofAgent";
import {
  sanitizeFutureproofForLocked,
  type FutureproofAnalyzeResponse,
  type FutureproofGenerateResponse,
} from "../src/app/utils/futureproofSanitizer";

interface EvalCaseExpected {
  allowedIndustries: IndustryCategory[];
  hasRecentRoles: boolean;
  expectMixedRecency?: boolean;
  expectPlacementMode: "inline_roles" | "modern_workflows_section";
  forbidPre2023Inline: boolean;
  forbiddenYearsInInlineBullets?: string[];
  forbiddenEmployersInInlineBullets?: string[];
  requiredAnchorTokens: string[];
  forbiddenSubstrings: string[];
}

interface FutureproofEvalCase {
  id: string;
  sourceType: "real_production" | "real_domain_profile" | "edge_case";
  label: string;
  description: string;
  comfortLevel: ComfortLevel;
  useIndustryStandards: boolean;
  resumeText: string;
  expected: EvalCaseExpected;
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

interface CaseEvalRecord {
  id: string;
  sourceType: FutureproofEvalCase["sourceType"];
  label: string;
  resumeLength: number;
  analyzeMs: number;
  generateMs: number;
  totalMs: number;
  score: number;
  maxScore: number;
  passedAll: boolean;
  detectedIndustry: string | null;
  subRoleLabel: string | null;
  hasRecentRoles: boolean | null;
  placementMode: string | null;
  bulletCount: number;
  skillsCount: number;
  mergedResumeLength: number;
  mergedResumeRatio: number;
  selectedTools: string[];
  checks: CheckResult[];
  sampleUpgrade: {
    roleTitle: string;
    dateRange: string;
    toolName: string;
    originalBullet: string;
    upgradedBullet: string;
    addedHighlight?: string;
    rationale: string;
  } | null;
  fatalError?: string;
}

interface ContractCheckResult {
  id: string;
  passed: boolean;
  detail: string;
}

const VERIFIED_TOOL_IDS = new Set(AI_TOOL_REGISTRY.map((t) => t.id));
const VERIFIED_TOOL_NAMES = new Set(AI_TOOL_REGISTRY.map((t) => t.name));

const BANNED_CLICHE_PATTERNS: RegExp[] = [
  /cutting[- ]edge ai/i,
  /revolutionary ai/i,
  /ai synergy/i,
  /\bsynergiz/i,
  /game[- ]changing/i,
  /disruptive ai/i,
  /harnessed the power of ai/i,
  /spearheaded revolutionary/i,
  /next[- ]gen ai paradigm/i,
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runContractChecks(): Promise<ContractCheckResult[]> {
  const results: ContractCheckResult[] = [];

  // 1. Short resume rejection (< 80 chars)
  let analyzeRejected = false;
  let generateRejected = false;
  try {
    await analyzeResumeForFutureproof({ resumeText: "Short resume text" });
  } catch {
    analyzeRejected = true;
  }
  try {
    await generateFutureproofUpgrades({ resumeText: "Short resume text" });
  } catch {
    generateRejected = true;
  }
  results.push({
    id: "contract_short_resume_rejected",
    passed: analyzeRejected && generateRejected,
    detail:
      analyzeRejected && generateRejected
        ? "Both analyze and generate reject inputs under 80 chars."
        : `analyzeRejected=${analyzeRejected}, generateRejected=${generateRejected}`,
  });

  // 2. Unverified / injected tool IDs rejected
  const resolved = resolveVerifiedTools({
    resumeText:
      "Attending Physician using Epic EHR to manage 500 outpatient clinic patients daily under HIPAA.",
    industry: "healthcare",
    selectedToolIds: ["fake-evil-ai-9000", "nonexistent-tool-xyz"],
    useIndustryStandards: false,
    comfortLevel: "everyday",
  });
  const allVerified =
    resolved.tools.length > 0 &&
    resolved.tools.every((t) => VERIFIED_TOOL_IDS.has(t.id));
  results.push({
    id: "contract_unverified_tool_ids_rejected",
    passed: allVerified,
    detail: allVerified
      ? `Rejected fake tool IDs and fell back to verified tools: ${resolved.tools.map((t) => t.id).join(", ")}`
      : `Unexpected tool resolution: ${JSON.stringify(resolved.tools.map((t) => t.id))}`,
  });

  // 3. Freemium server-side lock sanitization
  const fakeFull: FutureproofGenerateResponse = {
    industry: "healthcare",
    industryDisplayName: "Healthcare & Clinical",
    selectedTools: [
      {
        id: "nuance-dax-copilot",
        name: "Nuance DAX Copilot",
        vendor: "Microsoft / Nuance",
        complianceBadges: ["HIPAA-Compliant"],
      },
    ],
    placementMode: "inline_roles",
    bulletUpgrades: [0, 1, 2, 3].map((i) => ({
      id: `upgrade-${i}`,
      roleTitle: "Physician",
      company: "Hospital",
      dateRange: "2023 - Present",
      placementType: "role_experience",
      toolId: "nuance-dax-copilot",
      toolName: "Nuance DAX Copilot",
      originalBullet: `Orig ${i}`,
      upgradedBullet: `SECRET_BULLET_${i}_CONTENT`,
      addedHighlight: `SECRET_HIGHLIGHT_${i}`,
      rationale: `SECRET_RATIONALE_${i}`,
    })),
    skillsBlock: ["Nuance DAX Copilot"],
    interviewTalkingPoints: [
      {
        toolId: "nuance-dax-copilot",
        toolName: "Nuance DAX Copilot",
        complianceBadges: ["HIPAA-Compliant"],
        plainEnglishSummary: "Ambient charting",
        thirtySecondAnswer: "SECRET_INTERVIEW_SCRIPT_ANSWER",
      },
    ],
    mergedResume: "SECRET_MERGED_RESUME_BODY",
    isUnlocked: false,
    totalUpgrades: 4,
    unlockedCount: 4,
  };
  const sanitized = sanitizeFutureproofForLocked(fakeFull);
  const serialized = JSON.stringify(sanitized);
  const noLeak =
    sanitized.unlockedCount === 2 &&
    sanitized.mergedResume === null &&
    sanitized.bulletUpgrades[2].isLocked === true &&
    sanitized.bulletUpgrades[3].isLocked === true &&
    sanitized.interviewTalkingPoints[0].isLocked === true &&
    !serialized.includes("SECRET_BULLET_2") &&
    !serialized.includes("SECRET_BULLET_3") &&
    !serialized.includes("SECRET_HIGHLIGHT_2") &&
    !serialized.includes("SECRET_INTERVIEW_SCRIPT_ANSWER") &&
    !serialized.includes("SECRET_MERGED_RESUME_BODY");

  results.push({
    id: "contract_freemium_lock_enforced",
    passed: noLeak,
    detail: noLeak
      ? "Sanitizer locks upgrades #3+, nulls mergedResume, locks scripts, and leaks zero secret strings."
      : "Sanitizer failed to redact one or more locked fields.",
  });

  return results;
}

function evaluateCase(
  evalCase: FutureproofEvalCase,
  analyzeRes: FutureproofAnalyzeResponse | null,
  generateRes: FutureproofGenerateResponse | null,
  analyzeErr?: string,
  generateErr?: string
): CheckResult[] {
  const checks: CheckResult[] = [];
  const exp = evalCase.expected;

  // 1. analyze_ok
  if (!analyzeRes) {
    checks.push({
      name: "analyze_ok",
      passed: false,
      detail: `Analyze failed: ${analyzeErr || "unknown error"}`,
    });
  } else {
    const toolCountOk =
      analyzeRes.recommendedTools.length >= 3 &&
      analyzeRes.recommendedTools.length <= 6;
    const maxFitLen = Math.max(
      0,
      ...analyzeRes.recommendedTools.map((t) => (t.fitReason || "").length)
    );
    const fitReasonsOk =
      analyzeRes.recommendedTools.every(
        (t) => typeof t.fitReason === "string" && t.fitReason.trim().length >= 12
      ) && maxFitLen <= 125;
    const subRoleOk =
      typeof analyzeRes.subRoleLabel === "string" &&
      analyzeRes.subRoleLabel.trim().length >= 3;
    const passed = toolCountOk && fitReasonsOk && subRoleOk;
    checks.push({
      name: "analyze_ok",
      passed,
      detail: passed
        ? `${analyzeRes.recommendedTools.length} tools, subRole="${analyzeRes.subRoleLabel}", maxFitReason=${maxFitLen}ch`
        : `toolCount=${analyzeRes.recommendedTools.length}, subRole="${analyzeRes.subRoleLabel}", maxFitReason=${maxFitLen}ch (limit 125)`,
    });
  }

  // 2. industry_accuracy
  if (!analyzeRes) {
    checks.push({
      name: "industry_accuracy",
      passed: false,
      detail: "Skipped (analyze failed)",
    });
  } else {
    const ok = exp.allowedIndustries.includes(analyzeRes.industry);
    checks.push({
      name: "industry_accuracy",
      passed: ok,
      detail: ok
        ? `Detected "${analyzeRes.industry}" (allowed: ${exp.allowedIndustries.join(", ")})`
        : `Detected "${analyzeRes.industry}", expected one of [${exp.allowedIndustries.join(", ")}]`,
    });
  }

  // 3. timeline_detection_ok
  if (!analyzeRes) {
    checks.push({
      name: "timeline_detection_ok",
      passed: false,
      detail: "Skipped (analyze failed)",
    });
  } else {
    const recentMatch = analyzeRes.hasRecentRoles === exp.hasRecentRoles;
    let mixedMatch = true;
    if (exp.expectMixedRecency) {
      const hasRecent = analyzeRes.detectedRoles.some((r) => r.isRecentForAi);
      const hasHistorical = analyzeRes.detectedRoles.some((r) => !r.isRecentForAi);
      mixedMatch = hasRecent && hasHistorical;
    }
    const passed = recentMatch && mixedMatch;
    const roleSummary = analyzeRes.detectedRoles
      .map((r) => `${r.title} [${r.dateRange || "no-date"}:${r.isRecentForAi ? "recent" : "old"}]`)
      .join("; ");
    checks.push({
      name: "timeline_detection_ok",
      passed,
      detail: passed
        ? `hasRecentRoles=${analyzeRes.hasRecentRoles} | roles: ${roleSummary}`
        : `Expected hasRecentRoles=${exp.hasRecentRoles}${exp.expectMixedRecency ? " + mixed recency" : ""}, got hasRecentRoles=${analyzeRes.hasRecentRoles} | roles: ${roleSummary}`,
    });
  }

  // 4. generate_ok
  if (!generateRes) {
    checks.push({
      name: "generate_ok",
      passed: false,
      detail: `Generate failed: ${generateErr || "unknown error"}`,
    });
  } else {
    const bulletsOk =
      generateRes.bulletUpgrades.length >= 4 &&
      generateRes.bulletUpgrades.length <= 6;
    const skillsOk =
      generateRes.skillsBlock.length >= 4 &&
      generateRes.skillsBlock.length <= 10;
    const mergedOk =
      typeof generateRes.mergedResume === "string" &&
      generateRes.mergedResume.trim().length > 100;
    const passed = bulletsOk && skillsOk && mergedOk;
    checks.push({
      name: "generate_ok",
      passed,
      detail: passed
        ? `${generateRes.bulletUpgrades.length} bullets, ${generateRes.skillsBlock.length} skills, mergedResume=${generateRes.mergedResume?.length || 0}ch`
        : `bullets=${generateRes.bulletUpgrades.length} (want 4-6), skills=${generateRes.skillsBlock.length} (want 4-10), mergedLen=${generateRes.mergedResume?.length || 0}`,
    });
  }

  // 5. verified_tools_only
  if (!generateRes) {
    checks.push({
      name: "verified_tools_only",
      passed: false,
      detail: "Skipped (generate failed)",
    });
  } else {
    const selectedIds = new Set(generateRes.selectedTools.map((t) => t.id));
    const allInRegistry = generateRes.bulletUpgrades.every(
      (b) => VERIFIED_TOOL_IDS.has(b.toolId) && VERIFIED_TOOL_NAMES.has(b.toolName)
    );
    const allInSelected = generateRes.bulletUpgrades.every((b) =>
      selectedIds.has(b.toolId)
    );
    const usedIds = new Set(generateRes.bulletUpgrades.map((b) => b.toolId));
    const unusedSelected = [...selectedIds].filter((id) => !usedIds.has(id));
    const passed = allInRegistry && allInSelected && unusedSelected.length === 0;
    checks.push({
      name: "verified_tools_only",
      passed,
      detail: passed
        ? `All ${generateRes.bulletUpgrades.length} bullets use verified selected tools (${[...usedIds].join(", ")})`
        : `allInRegistry=${allInRegistry}, allInSelected=${allInSelected}, unusedSelected=[${unusedSelected.join(", ")}]`,
    });
  }

  // 6. timeline_guard_enforced
  if (!generateRes) {
    checks.push({
      name: "timeline_guard_enforced",
      passed: false,
      detail: "Skipped (generate failed)",
    });
  } else {
    const violations: string[] = [];
    if (exp.expectPlacementMode === "modern_workflows_section") {
      if (generateRes.placementMode !== "modern_workflows_section") {
        violations.push(
          `placementMode="${generateRes.placementMode}", expected "modern_workflows_section"`
        );
      }
      for (const b of generateRes.bulletUpgrades) {
        if (b.placementType !== "modern_workflows_section") {
          violations.push(
            `bullet "${b.roleTitle}" (${b.dateRange}) used placementType="${b.placementType}"`
          );
        }
      }
    }

    if (exp.forbidPre2023Inline) {
      for (const b of generateRes.bulletUpgrades) {
        if (b.placementType === "role_experience") {
          if (b.dateRange && !isRoleRecentForAi(b.dateRange)) {
            violations.push(
              `inline bullet stamped on pre-2023 dateRange "${b.dateRange}" (${b.roleTitle})`
            );
          }
          if (exp.forbiddenEmployersInInlineBullets) {
            for (const emp of exp.forbiddenEmployersInInlineBullets) {
              if (
                `${b.company} ${b.roleTitle}`.toLowerCase().includes(emp.toLowerCase())
              ) {
                violations.push(
                  `inline bullet placed on pre-2023 employer "${emp}" (${b.company})`
                );
              }
            }
          }
          if (exp.forbiddenYearsInInlineBullets && b.dateRange) {
            // Only flag if the dateRange is NOT recent (e.g., ended in a forbidden year)
            const years = b.dateRange.match(/\b(19|20)\d{2}\b/g) || [];
            const hasPresent = /(present|current|now)/i.test(b.dateRange);
            const maxYear = years.length
              ? Math.max(...years.map((y) => parseInt(y, 10)))
              : 9999;
            if (!hasPresent && maxYear < 2023) {
              violations.push(
                `inline bullet ended in ${maxYear} ("${b.dateRange}")`
              );
            }
          }
        }
      }
    }

    const passed = violations.length === 0;
    checks.push({
      name: "timeline_guard_enforced",
      passed,
      detail: passed
        ? `placementMode="${generateRes.placementMode}", zero pre-2023 timeline violations`
        : violations.join(" | "),
    });
  }

  // 7. highlight_verbatim_ok
  if (!generateRes) {
    checks.push({
      name: "highlight_verbatim_ok",
      passed: false,
      detail: "Skipped (generate failed)",
    });
  } else {
    const misses: string[] = [];
    for (const b of generateRes.bulletUpgrades) {
      const h = (b.addedHighlight || "").trim();
      if (
        h.length < 3 ||
        !b.upgradedBullet.toLowerCase().includes(h.toLowerCase())
      ) {
        misses.push(`${b.id}: highlight="${h}" not in upgradedBullet`);
      }
    }
    const passed = misses.length === 0;
    checks.push({
      name: "highlight_verbatim_ok",
      passed,
      detail: passed
        ? `All ${generateRes.bulletUpgrades.length} addedHighlights match verbatim inside upgradedBullet`
        : `${misses.length} highlight miss(es): ${misses.slice(0, 2).join("; ")}`,
    });
  }

  // 8. zero_ai_cliches
  if (!generateRes) {
    checks.push({
      name: "zero_ai_cliches",
      passed: false,
      detail: "Skipped (generate failed)",
    });
  } else {
    const hits: string[] = [];
    for (const b of generateRes.bulletUpgrades) {
      for (const pat of BANNED_CLICHE_PATTERNS) {
        if (pat.test(b.upgradedBullet)) {
          hits.push(`${b.id} matched ${pat}`);
        }
      }
    }
    const passed = hits.length === 0;
    checks.push({
      name: "zero_ai_cliches",
      passed,
      detail: passed
        ? "Zero banned AI buzzword clichés detected"
        : `Detected clichés: ${hits.join("; ")}`,
    });
  }

  // 9. bullet_conciseness_ok
  if (!generateRes) {
    checks.push({
      name: "bullet_conciseness_ok",
      passed: false,
      detail: "Skipped (generate failed)",
    });
  } else {
    const bulletLens = generateRes.bulletUpgrades.map(
      (b) => b.upgradedBullet.length
    );
    const avgBulletLen = Math.round(
      bulletLens.reduce((a, b) => a + b, 0) / Math.max(1, bulletLens.length)
    );
    const maxBulletLen = Math.max(0, ...bulletLens);
    const rationaleLens = generateRes.bulletUpgrades.map(
      (b) => b.rationale.length
    );
    const avgRationaleLen = Math.round(
      rationaleLens.reduce((a, b) => a + b, 0) / Math.max(1, rationaleLens.length)
    );
    const passed =
      avgBulletLen <= 250 && maxBulletLen <= 320 && avgRationaleLen <= 140;
    checks.push({
      name: "bullet_conciseness_ok",
      passed,
      detail: passed
        ? `avgBullet=${avgBulletLen}ch, maxBullet=${maxBulletLen}ch, avgRationale=${avgRationaleLen}ch`
        : `avgBullet=${avgBulletLen}ch (<=250), maxBullet=${maxBulletLen}ch (<=320), avgRationale=${avgRationaleLen}ch (<=140)`,
    });
  }

  // 10. grounding_and_preservation
  if (!generateRes) {
    checks.push({
      name: "grounding_and_preservation",
      passed: false,
      detail: "Skipped (generate failed)",
    });
  } else {
    const issues: string[] = [];
    const fullGeneratedText = [
      ...generateRes.bulletUpgrades.map(
        (b) => `${b.toolId} ${b.toolName} ${b.upgradedBullet} ${b.rationale}`
      ),
      ...generateRes.skillsBlock,
      generateRes.mergedResume || "",
    ].join("\n");

    for (const forbidden of exp.forbiddenSubstrings) {
      if (fullGeneratedText.toLowerCase().includes(forbidden.toLowerCase())) {
        issues.push(`emitted forbidden string "${forbidden}"`);
      }
    }

    const merged = generateRes.mergedResume || "";
    const minExpectedLen =
      evalCase.resumeText.length < 400
        ? 250
        : Math.round(evalCase.resumeText.length * 0.7);
    if (merged.length < minExpectedLen) {
      issues.push(
        `mergedResume truncated/too short (${merged.length}ch vs orig ${evalCase.resumeText.length}ch, min ${minExpectedLen}ch)`
      );
    }

    for (const anchor of exp.requiredAnchorTokens) {
      if (!merged.toLowerCase().includes(anchor.toLowerCase())) {
        issues.push(`mergedResume dropped anchor "${anchor}"`);
      }
    }

    const passed = issues.length === 0;
    checks.push({
      name: "grounding_and_preservation",
      passed,
      detail: passed
        ? `Zero forbidden strings, all anchors preserved, mergedResume=${merged.length}ch (${(merged.length / Math.max(1, evalCase.resumeText.length)).toFixed(2)}x orig)`
        : issues.join(" | "),
    });
  }

  return checks;
}

function renderMarkdownReport(params: {
  runAt: string;
  tag: string;
  contracts: ContractCheckResult[];
  records: CaseEvalRecord[];
  baselineComparison?: {
    runAt: string;
    avgScore: number;
    passRate: number;
    checkPassRates: Record<string, number>;
  } | null;
}): string {
  const { runAt, tag, contracts, records, baselineComparison } = params;
  const totalCases = records.length;
  const avgScore =
    records.reduce((acc, r) => acc + r.score, 0) / Math.max(1, totalCases);
  const fullPassCount = records.filter((r) => r.passedAll).length;
  const realRecords = records.filter((r) => r.sourceType !== "edge_case");
  const edgeRecords = records.filter((r) => r.sourceType === "edge_case");
  const realAvg =
    realRecords.reduce((a, r) => a + r.score, 0) / Math.max(1, realRecords.length);
  const edgeAvg =
    edgeRecords.reduce((a, r) => a + r.score, 0) / Math.max(1, edgeRecords.length);

  const avgAnalyzeSec =
    records.reduce((a, r) => a + r.analyzeMs, 0) / Math.max(1, totalCases) / 1000;
  const avgGenerateSec =
    records.reduce((a, r) => a + r.generateMs, 0) / Math.max(1, totalCases) / 1000;

  const checkNames = [
    "analyze_ok",
    "industry_accuracy",
    "timeline_detection_ok",
    "generate_ok",
    "verified_tools_only",
    "timeline_guard_enforced",
    "highlight_verbatim_ok",
    "zero_ai_cliches",
    "bullet_conciseness_ok",
    "grounding_and_preservation",
  ];

  const lines: string[] = [];
  lines.push(`# Futureproof AI Agent Evaluation Report`);
  lines.push("");
  lines.push(`- **Run timestamp:** ${runAt}`);
  lines.push(`- **Run label:** \`${tag}\``);
  lines.push(`- **Dataset:** \`evals/futureproof-dataset.json\` (${totalCases} cases: ${realRecords.length} real resumes + ${edgeRecords.length} synthetic/adversarial edge cases)`);
  lines.push(`- **Overall Score:** **${avgScore.toFixed(1)} / 100** (${fullPassCount}/${totalCases} cases passed all 10 checks)`);
  lines.push(`- **Real Resumes Score:** **${realAvg.toFixed(1)} / 100** (${realRecords.filter((r) => r.passedAll).length}/${realRecords.length} perfect)`);
  lines.push(`- **Edge / Adversarial Cases Score:** **${edgeAvg.toFixed(1)} / 100** (${edgeRecords.filter((r) => r.passedAll).length}/${edgeRecords.length} perfect)`);
  lines.push(`- **Mean Latency:** Analyze ${avgAnalyzeSec.toFixed(2)}s | Generate ${avgGenerateSec.toFixed(2)}s | Total ${(avgAnalyzeSec + avgGenerateSec).toFixed(2)}s`);
  lines.push("");

  if (baselineComparison) {
    const scoreDelta = avgScore - baselineComparison.avgScore;
    const passDelta = (fullPassCount / totalCases) * 100 - baselineComparison.passRate;
    lines.push(`## Before vs. After Agent Fixes`);
    lines.push("");
    lines.push(`| Metric | Baseline (Before Fixes) | Post-Fix (Current) | Delta |`);
    lines.push(`| --- | ---: | ---: | ---: |`);
    lines.push(
      `| Mean Score | ${baselineComparison.avgScore.toFixed(1)}% | **${avgScore.toFixed(1)}%** | **${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(1)} pts** |`
    );
    lines.push(
      `| Perfect 10/10 Case Pass Rate | ${baselineComparison.passRate.toFixed(1)}% | **${((fullPassCount / totalCases) * 100).toFixed(1)}%** | **${passDelta >= 0 ? "+" : ""}${passDelta.toFixed(1)}%** |`
    );
    lines.push("");
  }

  lines.push(`## Deterministic Security & Contract Checks`);
  lines.push("");
  lines.push(`| Check | Status | Details |`);
  lines.push(`| --- | --- | --- |`);
  for (const c of contracts) {
    lines.push(`| \`${c.id}\` | ${c.passed ? "PASS" : "FAIL"} | ${c.detail} |`);
  }
  lines.push("");

  lines.push(`## Rubric Pass Rates Across All ${totalCases} Live Cases`);
  lines.push("");
  lines.push(
    baselineComparison
      ? `| Check | Baseline | Current | Passed / Total |`
      : `| Check | Pass Rate | Passed / Total |`
  );
  lines.push(
    baselineComparison
      ? `| --- | ---: | ---: | ---: |`
      : `| --- | ---: | ---: |`
  );
  for (const name of checkNames) {
    const passed = records.filter(
      (r) => r.checks.find((c) => c.name === name)?.passed
    ).length;
    const pct = (passed / Math.max(1, totalCases)) * 100;
    if (baselineComparison) {
      const basePct = baselineComparison.checkPassRates[name] ?? 0;
      lines.push(
        `| \`${name}\` | ${basePct.toFixed(0)}% | **${pct.toFixed(0)}%** | ${passed}/${totalCases} |`
      );
    } else {
      lines.push(`| \`${name}\` | ${pct.toFixed(0)}% | ${passed}/${totalCases} |`);
    }
  }
  lines.push("");

  lines.push(`## Per-Case Live Scorecard`);
  lines.push("");
  lines.push(
    `| Case ID | Type | Industry | Placement | Bullets | Merged Ratio | Latency | Score | Failed Checks |`
  );
  lines.push(`| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |`);
  for (const r of records) {
    const failed = r.checks.filter((c) => !c.passed).map((c) => c.name);
    lines.push(
      `| \`${r.id}\` | ${r.sourceType} | \`${r.detectedIndustry || "err"}\` | \`${r.placementMode || "err"}\` | ${r.bulletCount} | ${r.mergedResumeRatio.toFixed(2)}x | ${(r.totalMs / 1000).toFixed(1)}s | **${r.score}/${r.maxScore}** | ${failed.length ? failed.map((f) => `\`${f}\``).join(", ") : "None"} |`
    );
  }
  lines.push("");

  const failedRecords = records.filter((r) => !r.passedAll);
  if (failedRecords.length > 0) {
    lines.push(`## Detailed Failure Diagnostics`);
    lines.push("");
    for (const r of failedRecords) {
      lines.push(`### \`${r.id}\` — ${r.label} (${r.score}/${r.maxScore})`);
      for (const c of r.checks.filter((x) => !x.passed)) {
        lines.push(`- **${c.name}**: ${c.detail}`);
      }
      lines.push("");
    }
  } else {
    lines.push(`## Detailed Failure Diagnostics`);
    lines.push("");
    lines.push(`All ${totalCases} live cases passed all 10 rubric checks (0 failures).`);
    lines.push("");
  }

  lines.push(`## Sample Real Before → After Bullet Transformations`);
  lines.push("");
  const samples = records.filter((r) => r.sampleUpgrade).slice(0, 5);
  for (const r of samples) {
    const s = r.sampleUpgrade!;
    lines.push(`### ${r.label} (\`${r.id}\`)`);
    lines.push(`- **Role:** ${s.roleTitle} (${s.dateRange || "N/A"}) | **Tool:** ${s.toolName}`);
    lines.push(`- **Before:** ${s.originalBullet}`);
    lines.push(`- **After:** ${s.upgradedBullet}`);
    lines.push(`- **Highlighted Phrase:** \`${s.addedHighlight || ""}\``);
    lines.push(`- **Recruiter Rationale:** ${s.rationale}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  let tag = "live";
  let comparePath: string | null = null;
  let snapshotName: string | null = null;
  const filterIds: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--tag=")) tag = arg.slice("--tag=".length);
    else if (arg.startsWith("--compare=")) comparePath = arg.slice("--compare=".length);
    else if (arg.startsWith("--snapshot=")) snapshotName = arg.slice("--snapshot=".length);
    else if (arg !== "--all") filterIds.push(arg);
  }

  const datasetPath = path.resolve(process.cwd(), "evals/futureproof-dataset.json");
  const allCases: FutureproofEvalCase[] = JSON.parse(
    fs.readFileSync(datasetPath, "utf8")
  );
  const cases =
    filterIds.length > 0
      ? allCases.filter((c) => filterIds.includes(c.id))
      : allCases;

  console.log(`\n=== Running Futureproof Agent Eval (${tag}) on ${cases.length} cases ===\n`);

  const contracts = await runContractChecks();
  for (const c of contracts) {
    console.log(`  [${c.passed ? "PASS" : "FAIL"}] ${c.id}: ${c.detail}`);
  }
  console.log("");

  const records: CaseEvalRecord[] = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    console.log(
      `▶ (${i + 1}/${cases.length}) [${c.id}] ${c.label} (${c.resumeText.length} chars, comfort=${c.comfortLevel})`
    );

    let analyzeRes: FutureproofAnalyzeResponse | null = null;
    let generateRes: FutureproofGenerateResponse | null = null;
    let analyzeErr: string | undefined;
    let generateErr: string | undefined;

    const analyzeStart = Date.now();
    try {
      analyzeRes = await analyzeResumeForFutureproof({
        resumeText: c.resumeText,
        comfortLevel: c.comfortLevel,
      });
    } catch (err: any) {
      analyzeErr = err?.message || String(err);
    }
    const analyzeMs = Date.now() - analyzeStart;

    const generateStart = Date.now();
    try {
      const preselectedIds =
        analyzeRes?.recommendedTools
          .filter((t) => t.preselected)
          .map((t) => t.id) || [];

      generateRes = await generateFutureproofUpgrades({
        resumeText: c.resumeText,
        comfortLevel: c.comfortLevel,
        industry: analyzeRes?.industry,
        hasRecentRoles: analyzeRes?.hasRecentRoles,
        detectedRoles: analyzeRes?.detectedRoles,
        selectedToolIds: c.useIndustryStandards ? [] : preselectedIds,
        useIndustryStandards: c.useIndustryStandards,
        isUnlocked: true,
      });
    } catch (err: any) {
      generateErr = err?.message || String(err);
    }
    const generateMs = Date.now() - generateStart;

    const checks = evaluateCase(c, analyzeRes, generateRes, analyzeErr, generateErr);
    const score = checks.filter((x) => x.passed).length * 10;
    const maxScore = checks.length * 10;
    const mergedLen = generateRes?.mergedResume?.length || 0;
    const firstUpgrade = generateRes?.bulletUpgrades[0] || null;

    const record: CaseEvalRecord = {
      id: c.id,
      sourceType: c.sourceType,
      label: c.label,
      resumeLength: c.resumeText.length,
      analyzeMs,
      generateMs,
      totalMs: analyzeMs + generateMs,
      score,
      maxScore,
      passedAll: score === maxScore,
      detectedIndustry: analyzeRes?.industry || null,
      subRoleLabel: analyzeRes?.subRoleLabel || null,
      hasRecentRoles: analyzeRes ? analyzeRes.hasRecentRoles : null,
      placementMode: generateRes?.placementMode || null,
      bulletCount: generateRes?.bulletUpgrades.length || 0,
      skillsCount: generateRes?.skillsBlock.length || 0,
      mergedResumeLength: mergedLen,
      mergedResumeRatio: +(mergedLen / Math.max(1, c.resumeText.length)).toFixed(2),
      selectedTools: generateRes?.selectedTools.map((t) => t.name) || [],
      checks,
      sampleUpgrade: firstUpgrade
        ? {
            roleTitle: firstUpgrade.roleTitle,
            dateRange: firstUpgrade.dateRange,
            toolName: firstUpgrade.toolName,
            originalBullet: firstUpgrade.originalBullet,
            upgradedBullet: firstUpgrade.upgradedBullet,
            addedHighlight: firstUpgrade.addedHighlight,
            rationale: firstUpgrade.rationale,
          }
        : null,
      fatalError: analyzeErr || generateErr,
    };

    records.push(record);
    const failedNames = checks.filter((x) => !x.passed).map((x) => x.name);
    console.log(
      `  ${record.passedAll ? "✔" : "✖"} Score: ${score}/${maxScore} | ind=${record.detectedIndustry} | mode=${record.placementMode} | bullets=${record.bulletCount} | merged=${record.mergedResumeRatio}x | ${((analyzeMs + generateMs) / 1000).toFixed(1)}s${failedNames.length ? ` | FAILED: ${failedNames.join(", ")}` : ""}`
    );

    // Polite pacing between live LLM pairs
    if (i < cases.length - 1) {
      await sleep(750);
    }
  }

  const runAt = new Date().toISOString();
  const avgScore =
    records.reduce((a, r) => a + r.score, 0) / Math.max(1, records.length);
  const fullPassCount = records.filter((r) => r.passedAll).length;

  const checkPassRates: Record<string, number> = {};
  for (const check of records[0]?.checks || []) {
    const passed = records.filter(
      (r) => r.checks.find((x) => x.name === check.name)?.passed
    ).length;
    checkPassRates[check.name] = +(
      (passed / Math.max(1, records.length)) *
      100
    ).toFixed(1);
  }

  let baselineComparison: {
    runAt: string;
    avgScore: number;
    passRate: number;
    checkPassRates: Record<string, number>;
  } | null = null;

  if (comparePath) {
    const resolvedCompare = path.resolve(process.cwd(), comparePath);
    if (fs.existsSync(resolvedCompare)) {
      const prev = JSON.parse(fs.readFileSync(resolvedCompare, "utf8"));
      baselineComparison = {
        runAt: prev.runAt,
        avgScore: prev.summary?.avgScore ?? 0,
        passRate: prev.summary?.perfectPassRate ?? 0,
        checkPassRates: prev.summary?.checkPassRates ?? {},
      };
    }
  }

  const outputPayload = {
    runAt,
    tag,
    summary: {
      totalCases: records.length,
      avgScore: +avgScore.toFixed(1),
      perfectPassCount: fullPassCount,
      perfectPassRate: +((fullPassCount / Math.max(1, records.length)) * 100).toFixed(1),
      contractsPassed: contracts.filter((c) => c.passed).length,
      contractsTotal: contracts.length,
      checkPassRates,
    },
    contracts,
    records,
  };

  const resultsPath = path.resolve(process.cwd(), "evals/futureproof-results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(outputPayload, null, 2));

  if (snapshotName) {
    const snapPath = path.resolve(
      process.cwd(),
      `evals/futureproof-results.${snapshotName}.json`
    );
    fs.writeFileSync(snapPath, JSON.stringify(outputPayload, null, 2));
  }

  const reportMd = renderMarkdownReport({
    runAt,
    tag,
    contracts,
    records,
    baselineComparison,
  });
  const reportPath = path.resolve(process.cwd(), "evals/futureproof-report.md");
  fs.writeFileSync(reportPath, reportMd);

  console.log(`\n=== Eval Complete ===`);
  console.log(
    `Overall Score: ${avgScore.toFixed(1)}/100 | Perfect 10/10 Cases: ${fullPassCount}/${records.length}`
  );
  console.log(`Saved JSON: ${resultsPath}`);
  console.log(`Saved Report: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal eval error:", err);
  process.exit(1);
});
