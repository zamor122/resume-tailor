import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import DiffMatchPatch from "diff-match-patch";
import {
  getResumeVersionAnalysisPrompt,
  getResumeVersionComparisonPrompt,
} from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

interface ResumeVersion {
  id: string;
  content: string;
  timestamp: string;
  jobTitle?: string;
  relevancyScore?: number;
  atsScore?: number;
  changes?: string[];
}

// In-memory storage for resume versions (keyed by sessionId)
// In production, this should use a database
const versionStore = new Map<string, ResumeVersion[]>();

export async function POST(req: NextRequest) {
  try {
    const { action, versions, currentResume, compareWith, sessionId, modelKey } = await req.json();
    
    // Use sessionId if provided, otherwise use a default key
    const storageKey = sessionId || 'default';
    
    // Initialize storage for this session if it doesn't exist
    if (!versionStore.has(storageKey)) {
      versionStore.set(storageKey, []);
    }
    
    const sessionVersions = versionStore.get(storageKey)!;
    
    if (action === "save") {
      // Save a new version
      if (!currentResume) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Resume content is required"
        }, { status: 400 });
      }

      const versionId = `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newVersion: ResumeVersion = {
        id: versionId,
        content: currentResume,
        timestamp: new Date().toISOString(),
      };

      // Analyze the version (with quota error handling)
      const analysisPrompt = getResumeVersionAnalysisPrompt(currentResume);

      try {
        // Get session preferences for model selection
        const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
          sessionId,
          modelKey,
          req.nextUrl.origin
        );
        const result = await generateWithFallback(
          analysisPrompt,
          selectedModel,
          undefined,
          sessionApiKeys
        );
        const text = result.text.trim();
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
        const analysis = JSON.parse(cleanedText);
        newVersion.jobTitle = analysis.jobTitle;
        newVersion.relevancyScore = analysis.estimatedRelevancy;
      } catch (e: any) {
        // Handle quota errors gracefully
        if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota')) {
          console.warn('API quota exceeded for version analysis, continuing without analysis');
        } else {
          console.error('Version analysis failed:', e);
        }
        // Continue without analysis - extract basic info
        newVersion.jobTitle = currentResume.match(/(?:title|position|role):\s*(.+)/i)?.[1] || undefined;
        newVersion.relevancyScore = undefined;
      }

      // Save to storage
      sessionVersions.push(newVersion);
      versionStore.set(storageKey, sessionVersions);

      return NextResponse.json({
        success: true,
        version: newVersion,
        totalVersions: sessionVersions.length,
        message: "Version saved successfully"
      });
    }

    if (action === "compare") {
      // Compare two versions
      // Use provided versions or get from storage
      let versionsToCompare = versions;
      if (!versionsToCompare || versionsToCompare.length < 2) {
        // Try to get from storage
        if (sessionVersions.length >= 2) {
          versionsToCompare = sessionVersions.slice(-2); // Compare last 2 versions
        } else {
          return NextResponse.json({
            error: "Invalid Input",
            message: "At least 2 versions required for comparison. Save more versions first."
          }, { status: 400 });
        }
      }

      const [v1, v2] = versionsToCompare;
      const dmp = new DiffMatchPatch();
      const diffs = dmp.diff_main(v1.content, v2.content);
      dmp.diff_cleanupSemantic(diffs);

      const changes = diffs
        .filter(([op]) => op !== 0)
        .map(([op, text]) => ({
          type: op === 1 ? "added" : "removed",
          text: text.substring(0, 100),
          length: text.length
        }));

      const similarity = 1 - (dmp.diff_levenshtein(diffs) / Math.max(v1.content.length, v2.content.length));

      // AI analysis of changes
      const analysisPrompt = getResumeVersionComparisonPrompt(v1, v2);

      let aiAnalysis = null;
      try {
        // Get session preferences for model selection
        const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
          sessionId,
          modelKey,
          req.nextUrl.origin
        );
        const result = await generateWithFallback(
          analysisPrompt,
          selectedModel,
          undefined,
          sessionApiKeys
        );
        const text = result.text.trim();
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
        aiAnalysis = JSON.parse(cleanedText);
      } catch (e: any) {
        if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota')) {
          console.warn("AI analysis skipped due to quota limits");
        } else {
          console.error("AI analysis failed:", e);
        }
      }

      return NextResponse.json({
        similarity: Math.round(similarity * 100),
        changes: changes,
        stats: {
          added: changes.filter(c => c.type === "added").reduce((sum, c) => sum + c.length, 0),
          removed: changes.filter(c => c.type === "removed").reduce((sum, c) => sum + c.length, 0),
          netChange: changes.filter(c => c.type === "added").reduce((sum, c) => sum + c.length, 0) - 
                    changes.filter(c => c.type === "removed").reduce((sum, c) => sum + c.length, 0)
        },
        aiAnalysis: aiAnalysis,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "timeline" || action === "list") {
      // Get version timeline - use stored versions if none provided
      const versionsToUse = versions && versions.length > 0 ? versions : sessionVersions;
      
      if (versionsToUse.length === 0) {
        return NextResponse.json({
          timeline: [],
          versions: [],
          stats: {
            totalVersions: 0,
            totalChanges: 0,
            averageRelevancy: 0
          },
          message: "No versions saved yet. Use 'save' action to save a version."
        });
      }

      const sortedVersions = [...versionsToUse].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const timeline = sortedVersions.map((version, index) => ({
        version: version.id,
        timestamp: version.timestamp,
        jobTitle: version.jobTitle,
        relevancyScore: version.relevancyScore,
        isLatest: index === sortedVersions.length - 1,
        changeFromPrevious: index > 0 ? {
          similarity: 0, // Would need to calculate
          keyChanges: []
        } : null
      }));

      return NextResponse.json({
        timeline,
        versions: sortedVersions,
        stats: {
          totalVersions: versionsToUse.length,
          dateRange: {
            first: sortedVersions[0]?.timestamp,
            last: sortedVersions[sortedVersions.length - 1]?.timestamp
          },
          averageRelevancy: versionsToUse
            .filter((v: ResumeVersion) => v.relevancyScore)
            .reduce((sum: number, v: ResumeVersion) => sum + (v.relevancyScore || 0), 0) / 
            versionsToUse.filter((v: ResumeVersion) => v.relevancyScore).length || 0
        }
      });
    }
    
    if (action === "get" || !action) {
      // Default: return all versions for this session
      return NextResponse.json({
        success: true,
        versions: sessionVersions,
        totalVersions: sessionVersions.length,
        message: sessionVersions.length === 0 
          ? "No versions saved yet. Use 'save' action to save a version."
          : `Found ${sessionVersions.length} saved version(s)`
      });
    }

    return NextResponse.json({
      error: "Invalid Action",
      message: "Action must be 'save', 'compare', 'timeline', 'list', or 'get'"
    }, { status: 400 });

  } catch (error) {
    console.error('Resume Versions error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to process version control request",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

