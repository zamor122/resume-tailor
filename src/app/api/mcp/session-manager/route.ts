import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server";

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
    modelPreferences?: {
      defaultModel?: string;
      fallbackModels?: string[];
    };
    apiKeys?: Record<string, string>; // For future user-provided keys
  };
  metrics?: {
    totalToolsRun: number;
    averageExecutionTime: number;
    successRate: number;
  };
}

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

      // Store in Supabase
      const { error: insertError } = await supabaseAdmin
        .from('sessions')
        .insert({
          id: newSessionId,
          data: session as any,
          user_id: data?.userId || null,
        });

      if (insertError) {
        console.error('Error creating session:', insertError);
        return NextResponse.json({
          error: "Server Error",
          message: "Failed to create session"
        }, { status: 500 });
      }

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

      const { data: sessionRow, error: fetchError } = await supabaseAdmin
        .from('sessions')
        .select('data')
        .eq('id', sessionId)
        .single();

      if (fetchError || !sessionRow) {
        return NextResponse.json({
          error: "Not Found",
          message: "Session not found"
        }, { status: 404 });
      }

      const session = sessionRow.data as Session;

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

      // Get existing session or create new one
      const { data: sessionRow } = await supabaseAdmin
        .from('sessions')
        .select('data')
        .eq('id', sessionId)
        .single();

      let session: Session;
      if (!sessionRow) {
        // Auto-create session if it doesn't exist (for dev mode resilience)
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
        
        await supabaseAdmin
          .from('sessions')
          .insert({
            id: sessionId,
            data: session as any,
            user_id: data?.userId || null,
          });
      } else {
        session = sessionRow.data as Session;
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

      // Update in Supabase
      const { error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          data: updatedSession as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
        return NextResponse.json({
          error: "Server Error",
          message: "Failed to update session"
        }, { status: 500 });
      }

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

      if (!data?.role || !data?.content) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Role and content are required"
        }, { status: 400 });
      }

      // Get existing session or create new one
      const { data: sessionRow } = await supabaseAdmin
        .from('sessions')
        .select('data')
        .eq('id', sessionId)
        .single();

      let session: Session;
      if (!sessionRow) {
        // Auto-create session if it doesn't exist (for dev mode resilience)
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
        
        await supabaseAdmin
          .from('sessions')
          .insert({
            id: sessionId,
            data: session as any,
            user_id: data?.userId || null,
          });
      } else {
        session = sessionRow.data as Session;
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

      // Update in Supabase
      const { error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          data: updatedSession as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
        return NextResponse.json({
          error: "Server Error",
          message: "Failed to update session"
        }, { status: 500 });
      }

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

      if (!data?.toolId) {
        return NextResponse.json({
          error: "Invalid Input",
          message: "Tool ID is required"
        }, { status: 400 });
      }

      // Get existing session or create new one
      const { data: sessionRow } = await supabaseAdmin
        .from('sessions')
        .select('data')
        .eq('id', sessionId)
        .single();

      let session: Session;
      if (!sessionRow) {
        // Auto-create session if it doesn't exist (for dev mode resilience)
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
        
        await supabaseAdmin
          .from('sessions')
          .insert({
            id: sessionId,
            data: session as any,
            user_id: data?.userId || null,
          });
      } else {
        session = sessionRow.data as Session;
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

      // Update in Supabase
      const { error: updateError } = await supabaseAdmin
        .from('sessions')
        .update({
          data: updatedSession as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
        return NextResponse.json({
          error: "Server Error",
          message: "Failed to update session"
        }, { status: 500 });
      }

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

      const { data: sessionRow, error: fetchError } = await supabaseAdmin
        .from('sessions')
        .select('data, created_at')
        .eq('id', sessionId)
        .single();

      if (fetchError || !sessionRow) {
        return NextResponse.json({
          error: "Not Found",
          message: "Session not found"
        }, { status: 404 });
      }

      const session = sessionRow.data as Session;

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
      const { data: sessions, error: fetchError } = await supabaseAdmin
        .from('sessions')
        .select('id, data, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('Error listing sessions:', fetchError);
        return NextResponse.json({
          error: "Server Error",
          message: "Failed to list sessions"
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        sessions: (sessions || []).map(s => {
          const sessionData = s.data as Session;
          return {
            sessionId: s.id,
            createdAt: sessionData.createdAt || s.created_at,
            updatedAt: sessionData.updatedAt || s.updated_at,
            hasResume: !!sessionData.resume,
            jobDescriptionCount: sessionData.jobDescriptions?.length || 0,
            toolExecutionsCount: sessionData.toolExecutions?.length || 0,
            metrics: sessionData.metrics
          };
        }),
        count: sessions?.length || 0
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

