import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 30;

interface Session {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  resume?: string;
  jobDescriptions: string[];
  contextPairs: string[]; // Pair IDs
  toolExecutions: Array<{
    toolId: string;
    timestamp: string;
    result?: any;
    error?: string;
    executionTime?: number;
  }>;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  preferences?: {
    autoTailor?: boolean;
    showAIDetection?: boolean;
    defaultWorkflow?: string;
  };
  metrics?: {
    totalToolsRun: number;
    averageExecutionTime: number;
    successRate: number;
  };
}

// In-memory storage (can be replaced with database later)
const sessionStore = new Map<string, Session>();

export async function POST(req: NextRequest) {
  try {
    const { action, sessionId, data } = await req.json();
    
    if (action === "create") {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const session: Session = {
        sessionId: newSessionId,
        createdAt: now,
        updatedAt: now,
        jobDescriptions: [],
        contextPairs: [],
        toolExecutions: [],
        conversationHistory: [],
        preferences: data?.preferences || {},
        metrics: {
          totalToolsRun: 0,
          averageExecutionTime: 0,
          successRate: 100
        }
      };

      sessionStore.set(newSessionId, session);

      return NextResponse.json({
        success: true,
        sessionId: newSessionId,
        session
      });
    }

    if (action === "get") {
      if (!sessionId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Session ID is required"
        }, { status: 400 });
      }

      const session = sessionStore.get(sessionId);
      if (!session) {
        return NextResponse.json({
          error: "Not Found",
          message: "Session not found"
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        session
      });
    }

    if (action === "update") {
      if (!sessionId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Session ID is required"
        }, { status: 400 });
      }

      let session = sessionStore.get(sessionId);
      // Auto-create session if it doesn't exist (for dev mode resilience)
      if (!session) {
        const now = new Date().toISOString();
        session = {
          sessionId,
          createdAt: now,
          updatedAt: now,
          jobDescriptions: [],
          contextPairs: [],
          toolExecutions: [],
          conversationHistory: [],
          preferences: {},
          metrics: {
            totalToolsRun: 0,
            averageExecutionTime: 0,
            successRate: 100
          }
        };
        sessionStore.set(sessionId, session);
      }

      const updatedSession: Session = {
        ...session,
        updatedAt: new Date().toISOString()
      };

      if (data?.resume !== undefined) {
        updatedSession.resume = data.resume;
      }
      if (data?.jobDescriptions) {
        updatedSession.jobDescriptions = data.jobDescriptions;
      }
      if (data?.contextPairs) {
        updatedSession.contextPairs = data.contextPairs;
      }
      if (data?.preferences) {
        updatedSession.preferences = { ...updatedSession.preferences, ...data.preferences };
      }

      sessionStore.set(sessionId, updatedSession);

      return NextResponse.json({
        success: true,
        session: updatedSession
      });
    }

    if (action === "add-message") {
      if (!sessionId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Session ID is required"
        }, { status: 400 });
      }

      let session = sessionStore.get(sessionId);
      // Auto-create session if it doesn't exist (for dev mode resilience)
      if (!session) {
        const now = new Date().toISOString();
        session = {
          sessionId,
          createdAt: now,
          updatedAt: now,
          jobDescriptions: [],
          contextPairs: [],
          toolExecutions: [],
          conversationHistory: [],
          preferences: {},
          metrics: {
            totalToolsRun: 0,
            averageExecutionTime: 0,
            successRate: 100
          }
        };
        sessionStore.set(sessionId, session);
      }

      if (!data?.role || !data?.content) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Role and content are required"
        }, { status: 400 });
      }

      const updatedSession: Session = {
        ...session,
        updatedAt: new Date().toISOString(),
        conversationHistory: [
          ...session.conversationHistory,
          {
            role: data.role,
            content: data.content,
            timestamp: new Date().toISOString()
          }
        ]
      };

      sessionStore.set(sessionId, updatedSession);

      return NextResponse.json({
        success: true,
        session: updatedSession
      });
    }

    if (action === "track-tool") {
      if (!sessionId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Session ID is required"
        }, { status: 400 });
      }

      let session = sessionStore.get(sessionId);
      // Auto-create session if it doesn't exist (for dev mode resilience)
      if (!session) {
        const now = new Date().toISOString();
        session = {
          sessionId,
          createdAt: now,
          updatedAt: now,
          jobDescriptions: [],
          contextPairs: [],
          toolExecutions: [],
          conversationHistory: [],
          preferences: {},
          metrics: {
            totalToolsRun: 0,
            averageExecutionTime: 0,
            successRate: 100
          }
        };
        sessionStore.set(sessionId, session);
      }

      if (!data?.toolId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Tool ID is required"
        }, { status: 400 });
      }

      const toolExecution = {
        toolId: data.toolId,
        timestamp: new Date().toISOString(),
        result: data.result,
        error: data.error,
        executionTime: data.executionTime
      };

      const updatedSession: Session = {
        ...session,
        updatedAt: new Date().toISOString(),
        toolExecutions: [...session.toolExecutions, toolExecution]
      };

      // Update metrics
      const totalTools = updatedSession.toolExecutions.length;
      const successfulTools = updatedSession.toolExecutions.filter(e => !e.error).length;
      const totalTime = updatedSession.toolExecutions
        .filter(e => e.executionTime)
        .reduce((sum, e) => sum + (e.executionTime || 0), 0);
      const avgTime = totalTime / updatedSession.toolExecutions.filter(e => e.executionTime).length || 0;

      updatedSession.metrics = {
        totalToolsRun: totalTools,
        averageExecutionTime: avgTime,
        successRate: (successfulTools / totalTools) * 100 || 100
      };

      sessionStore.set(sessionId, updatedSession);

      return NextResponse.json({
        success: true,
        session: updatedSession
      });
    }

    if (action === "analytics") {
      if (!sessionId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Session ID is required"
        }, { status: 400 });
      }

      const session = sessionStore.get(sessionId);
      if (!session) {
        return NextResponse.json({
          error: "Not Found",
          message: "Session not found"
        }, { status: 404 });
      }

      const analytics = {
        sessionDuration: new Date().getTime() - new Date(session.createdAt).getTime(),
        totalMessages: session.conversationHistory.length,
        totalToolsRun: session.toolExecutions.length,
        toolUsage: session.toolExecutions.reduce((acc, exec) => {
          acc[exec.toolId] = (acc[exec.toolId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        successRate: session.metrics?.successRate || 100,
        averageExecutionTime: session.metrics?.averageExecutionTime || 0,
        hasResume: !!session.resume,
        jobDescriptionCount: session.jobDescriptions.length,
        contextPairCount: session.contextPairs.length
      };

      return NextResponse.json({
        success: true,
        analytics
      });
    }

    if (action === "list") {
      const sessions = Array.from(sessionStore.values());
      
      return NextResponse.json({
        success: true,
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          hasResume: !!s.resume,
          jobDescriptionCount: s.jobDescriptions.length,
          toolExecutionsCount: s.toolExecutions.length,
          metrics: s.metrics
        })),
        count: sessions.length
      });
    }

    return NextResponse.json({
      error: "Invalid Action",
      message: "Action must be 'create', 'get', 'update', 'add-message', 'track-tool', 'analytics', or 'list'"
    }, { status: 400 });

  } catch (error) {
    console.error('Session Manager error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to manage session",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

