import { NextRequest, NextResponse } from "next/server";
import DiffMatchPatch from "diff-match-patch";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import { getDiffExplanationPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

interface DiffChange {
  type: "added" | "modified" | "removed";
  original: string;
  tailored: string;
  explanation?: string;
  jobReason?: string;
  section?: string;
  position?: {
    start: number;
    end: number;
  };
}

interface DiffSection {
  name: string;
  changes: DiffChange[];
}

interface DiffResponse {
  sections: DiffSection[];
  summary: {
    totalChanges: number;
    additions: number;
    modifications: number;
    removals: number;
  };
}

/**
 * Extract section name from text based on position
 */
function extractSectionName(text: string, position: number): string {
  const sections = [
    { name: "Header/Contact", pattern: /^(name|contact|email|phone|address)/i },
    { name: "Summary", pattern: /^(summary|profile|objective|about)/i },
    { name: "Experience", pattern: /^(experience|work|employment|professional)/i },
    { name: "Education", pattern: /^(education|academic|qualifications)/i },
    { name: "Skills", pattern: /^(skills|technical|competencies)/i },
    { name: "Projects", pattern: /^(projects|portfolio)/i },
    { name: "Certifications", pattern: /^(certifications|certificates)/i },
    { name: "Awards", pattern: /^(awards|honors|achievements)/i },
  ];

  // Find the last section header before this position
  const textBefore = text.substring(0, position);
  const lines = textBefore.split('\n');
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    for (const section of sections) {
      if (section.pattern.test(line)) {
        return section.name;
      }
    }
  }

  return 'General';
}

/**
 * Generate explanations for changes using AI
 */
async function generateExplanations(
  changes: DiffChange[],
  jobDescription: string,
  modelKey: string,
  sessionApiKeys?: any
): Promise<DiffChange[]> {
  if (changes.length === 0) return changes;

  // Use centralized prompt
  const prompt = getDiffExplanationPrompt(changes, jobDescription);

  try {
    const result = await generateWithFallback(
      prompt,
      modelKey,
      undefined,
      sessionApiKeys
    );

    const jsonData = parseJSONFromText<Array<{
      index: number;
      explanation: string;
      jobReason: string;
    }>>(result.text);

    if (jsonData && Array.isArray(jsonData)) {
      // Map explanations back to changes
      jsonData.forEach((item) => {
        if (changes[item.index]) {
          changes[item.index].explanation = item.explanation;
          changes[item.index].jobReason = item.jobReason;
        }
      });
    }
  } catch (error) {
    console.error('[Diff] Error generating explanations:', error);
    // Continue without explanations - they're optional
  }

  return changes;
}

/**
 * Generate structured diff data from original and tailored resumes
 */
function generateDiffData(
  originalResume: string,
  tailoredResume: string
): DiffChange[] {
  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(originalResume, tailoredResume);
  dmp.diff_cleanupSemantic(diffs);

  const changes: DiffChange[] = [];
  let originalPos = 0;
  let tailoredPos = 0;

  for (const [operation, text] of diffs) {
    if (operation === 0) {
      // Equal text - advance both positions
      originalPos += text.length;
      tailoredPos += text.length;
    } else if (operation === -1) {
      // Deletion
      const section = extractSectionName(originalResume, originalPos);
      changes.push({
        type: "removed",
        original: text,
        tailored: "",
        section,
        position: {
          start: originalPos,
          end: originalPos + text.length,
        },
      });
      originalPos += text.length;
    } else if (operation === 1) {
      // Addition
      const section = extractSectionName(tailoredResume, tailoredPos);
      changes.push({
        type: "added",
        original: "",
        tailored: text,
        section,
        position: {
          start: tailoredPos,
          end: tailoredPos + text.length,
        },
      });
      tailoredPos += text.length;
    }
  }

  // Merge adjacent additions and deletions into modifications
  const mergedChanges: DiffChange[] = [];
  for (let i = 0; i < changes.length; i++) {
    const current = changes[i];
    const next = changes[i + 1];

    if (
      current.type === "removed" &&
      next &&
      next.type === "added" &&
      current.section === next.section
    ) {
      // Merge into modification
      mergedChanges.push({
        type: "modified",
        original: current.original,
        tailored: next.tailored,
        section: current.section,
        position: current.position,
      });
      i++; // Skip next change
    } else {
      mergedChanges.push(current);
    }
  }

  return mergedChanges;
}

/**
 * Group changes by section
 */
function groupChangesBySection(changes: DiffChange[]): DiffSection[] {
  const sectionsMap = new Map<string, DiffChange[]>();

  changes.forEach((change) => {
    const sectionName = change.section || "General";
    if (!sectionsMap.has(sectionName)) {
      sectionsMap.set(sectionName, []);
    }
    sectionsMap.get(sectionName)!.push(change);
  });

  return Array.from(sectionsMap.entries()).map(([name, changes]) => ({
    name,
    changes,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { originalResume, tailoredResume, jobDescription, sessionId, modelKey, generateExplanations: shouldGenerateExplanations = true } = await req.json();

    if (!originalResume || !tailoredResume) {
      return NextResponse.json(
        { error: "Missing originalResume or tailoredResume" },
        { status: 400 }
      );
    }

    // Get model (defaults to Cerebras if not specified)
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    // Generate diff data
    const changes = generateDiffData(originalResume, tailoredResume);

    // Generate explanations if requested
    if (shouldGenerateExplanations && jobDescription && changes.length > 0) {
      await generateExplanations(changes, jobDescription, selectedModel, sessionApiKeys);
    }

    // Group changes by section
    const sections = groupChangesBySection(changes);

    // Calculate summary
    const summary = {
      totalChanges: changes.length,
      additions: changes.filter((c) => c.type === "added").length,
      modifications: changes.filter((c) => c.type === "modified").length,
      removals: changes.filter((c) => c.type === "removed").length,
    };

    const response: DiffResponse = {
      sections,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in diff API:", error);
    return NextResponse.json(
      {
        error: "Processing Error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}



