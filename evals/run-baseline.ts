import fs from "fs";
import path from "path";

// Load .env.local before importing app modules
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

import { runResumeAgent } from "../src/app/agent/graph";

interface GoldenCase {
  id: string;
  category: string;
  jobTitle: string;
  originalResume: string;
  jobDescription: string;
  historicalProductionOutput: {
    tailoredLength: number;
    originalLength: number;
    lengthRatio: number;
    beforeScore: number | null;
    afterScore: number | null;
  } | null;
}

async function main() {
  const datasetPath = path.resolve(process.cwd(), "evals/golden-dataset.json");
  const allCases: GoldenCase[] = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

  const filterIds = process.argv.slice(2);
  const cases = filterIds.length > 0
    ? allCases.filter((c) => filterIds.includes(c.id))
    : allCases.filter((c) =>
        ["real_24cbaa65", "real_2bdb399f", "edge_career_changer", "edge_messy_no_bullets"].includes(c.id)
      );

  console.log(`Running baseline eval on ${cases.length} cases...`);
  const results = [];

  for (const c of cases) {
    const start = Date.now();
    console.log(`\n▶ [${c.id}] ${c.jobTitle} (orig: ${c.originalResume.length} chars, jd: ${c.jobDescription.length} chars)`);
    try {
      const state = await runResumeAgent({
        rawResume: c.originalResume,
        rawJobDescription: c.jobDescription,
        jobTitle: c.jobTitle,
        preferences: { intensity: "targeted" },
        logs: [],
        errors: [],
      } as any);

      const elapsedMs = Date.now() - start;
      const finalLen = state.finalResumeText?.length || 0;
      const lengthRatio = +(finalLen / c.originalResume.length).toFixed(2);
      const before = state.beforeScore ?? null;
      const after = state.afterScore ?? null;
      const delta = typeof before === "number" && typeof after === "number" ? after - before : null;

      const record = {
        id: c.id,
        category: c.category,
        jobTitle: c.jobTitle,
        elapsedMs,
        originalLength: c.originalResume.length,
        finalLength: finalLen,
        lengthRatio,
        beforeScore: before,
        afterScore: after,
        scoreDelta: delta,
        suggestionsCount: state.suggestions?.length || 0,
        missingKeywordsCount: state.sortedMissingKeywords?.length || 0,
        seniorityTier: state.seniorityTier || null,
        industryCategory: state.industryCategory || null,
        errors: state.errors || [],
        sampleTailoredHead: (state.finalResumeText || "").slice(0, 350),
      };
      results.push(record);
      console.log(
        `  ✔ Done in ${(elapsedMs / 1000).toFixed(1)}s | len: ${c.originalResume.length} -> ${finalLen} (${lengthRatio}x) | score: ${before} -> ${after} (${delta !== null && delta >= 0 ? "+" : ""}${delta}) | suggestions: ${record.suggestionsCount} | errors: ${record.errors.length}`
      );
    } catch (err: any) {
      const elapsedMs = Date.now() - start;
      console.error(`  ✖ Failed in ${(elapsedMs / 1000).toFixed(1)}s:`, err?.message || err);
      results.push({
        id: c.id,
        category: c.category,
        jobTitle: c.jobTitle,
        elapsedMs,
        fatalError: err?.message || String(err),
      });
    }
  }

  const outPath = path.resolve(process.cwd(), "evals/baseline-results.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2)
  );
  console.log(`\nSaved baseline results to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
