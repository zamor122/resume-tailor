import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

interface ContextPair {
  id: string;
  resume: {
    content: string;
    metadata?: {
      classification?: any;
      extractedData?: any;
      timestamp?: string;
      enriched?: boolean;
      enrichedAt?: string;
      [key: string]: any;
    };
  };
  jobDescription: {
    content: string;
    metadata?: {
      classification?: any;
      extractedData?: any;
      timestamp?: string;
      enriched?: boolean;
      enrichedAt?: string;
      [key: string]: any;
    };
  };
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  version?: number;
}

// In-memory storage (can be replaced with database later)
const contextStore = new Map<string, ContextPair>();

export async function POST(req: NextRequest) {
  try {
    const { action, pairId, resume, jobDescription, metadata, tags } = await req.json();
    
    if (action === "create") {
      if (!resume || !jobDescription) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Both resume and job description are required"
        }, { status: 400 });
      }

      const pairId = `pair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const pair: ContextPair = {
        id: pairId,
        resume: {
          content: resume.content || resume,
          metadata: resume.metadata || {}
        },
        jobDescription: {
          content: jobDescription.content || jobDescription,
          metadata: jobDescription.metadata || {}
        },
        createdAt: now,
        updatedAt: now,
        tags: tags || [],
        version: 1
      };

      contextStore.set(pairId, pair);

      return NextResponse.json({
        success: true,
        pairId,
        pair,
        message: "Context pair created successfully"
      });
    }

    if (action === "update") {
      if (!pairId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Pair ID is required"
        }, { status: 400 });
      }

      const existingPair = contextStore.get(pairId);
      if (!existingPair) {
        return NextResponse.json({
          error: "Not Found",
          message: "Context pair not found"
        }, { status: 404 });
      }

      const updatedPair: ContextPair = {
        ...existingPair,
        updatedAt: new Date().toISOString(),
        version: (existingPair.version || 1) + 1
      };

      if (resume) {
        updatedPair.resume = {
          content: resume.content || resume,
          metadata: { ...existingPair.resume.metadata, ...(resume.metadata || {}) }
        };
      }

      if (jobDescription) {
        updatedPair.jobDescription = {
          content: jobDescription.content || jobDescription,
          metadata: { ...existingPair.jobDescription.metadata, ...(jobDescription.metadata || {}) }
        };
      }

      if (tags) {
        updatedPair.tags = tags;
      }

      if (metadata) {
        // Merge metadata into both resume and job description
        updatedPair.resume.metadata = { ...updatedPair.resume.metadata, ...metadata };
        updatedPair.jobDescription.metadata = { ...updatedPair.jobDescription.metadata, ...metadata };
      }

      contextStore.set(pairId, updatedPair);

      return NextResponse.json({
        success: true,
        pair: updatedPair,
        message: "Context pair updated successfully"
      });
    }

    if (action === "get") {
      if (!pairId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Pair ID is required"
        }, { status: 400 });
      }

      const pair = contextStore.get(pairId);
      if (!pair) {
        return NextResponse.json({
          error: "Not Found",
          message: "Context pair not found"
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        pair
      });
    }

    if (action === "list") {
      const pairs = Array.from(contextStore.values());
      
      return NextResponse.json({
        success: true,
        pairs: pairs.map(p => ({
          id: p.id,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          tags: p.tags,
          version: p.version,
          resumeLength: p.resume.content.length,
          jobDescriptionLength: p.jobDescription.content.length
        })),
        count: pairs.length
      });
    }

    if (action === "enrich") {
      if (!pairId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Pair ID is required"
        }, { status: 400 });
      }

      const pair = contextStore.get(pairId);
      if (!pair) {
        return NextResponse.json({
          error: "Not Found",
          message: "Context pair not found"
        }, { status: 404 });
      }

      // Enrich context with additional metadata
      const enrichedPair: ContextPair = {
        ...pair,
        resume: {
          ...pair.resume,
          metadata: {
            ...pair.resume.metadata,
            enriched: true,
            enrichedAt: new Date().toISOString()
          }
        },
        jobDescription: {
          ...pair.jobDescription,
          metadata: {
            ...pair.jobDescription.metadata,
            enriched: true,
            enrichedAt: new Date().toISOString()
          }
        },
        updatedAt: new Date().toISOString()
      };

      contextStore.set(pairId, enrichedPair);

      return NextResponse.json({
        success: true,
        pair: enrichedPair,
        message: "Context pair enriched successfully"
      });
    }

    if (action === "validate") {
      if (!pairId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Pair ID is required"
        }, { status: 400 });
      }

      const pair = contextStore.get(pairId);
      if (!pair) {
        return NextResponse.json({
          error: "Not Found",
          message: "Context pair not found"
        }, { status: 404 });
      }

      const validation = {
        isValid: true,
        issues: [] as string[],
        resume: {
          hasContent: pair.resume.content.length > 0,
          hasMetadata: Object.keys(pair.resume.metadata || {}).length > 0,
          length: pair.resume.content.length
        },
        jobDescription: {
          hasContent: pair.jobDescription.content.length > 0,
          hasMetadata: Object.keys(pair.jobDescription.metadata || {}).length > 0,
          length: pair.jobDescription.content.length
        }
      };

      if (!validation.resume.hasContent) {
        validation.isValid = false;
        validation.issues.push("Resume content is missing");
      }

      if (!validation.jobDescription.hasContent) {
        validation.isValid = false;
        validation.issues.push("Job description content is missing");
      }

      if (validation.resume.length < 100) {
        validation.isValid = false;
        validation.issues.push("Resume content is too short (minimum 100 characters)");
      }

      if (validation.jobDescription.length < 100) {
        validation.isValid = false;
        validation.issues.push("Job description content is too short (minimum 100 characters)");
      }

      return NextResponse.json({
        success: true,
        validation
      });
    }

    return NextResponse.json({
      error: "Invalid Action",
      message: "Action must be 'create', 'update', 'get', 'list', 'enrich', or 'validate'"
    }, { status: 400 });

  } catch (error) {
    console.error('Context Manager error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to manage context",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

