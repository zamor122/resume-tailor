"use client";

import { useState, useRef, useEffect } from "react";
import ChatInterface, { ChatMessage } from "./components/ChatInterface";
import ComparisonModal from "./components/ComparisonModal";
import ControlPanel from "./components/ControlPanel";
import ToolsPanel from "./components/ToolsPanel";
import ToolResultsModal from "./components/ToolResultsModal";
import { RelevancyScores } from "./components/RelevancyScore";
import { analytics } from "./services/analytics";
import JsonLd from "./components/JsonLd";
import { parseCommand, getAvailableCommands, formatCommandSuggestions, type CommandContext } from "./utils/commandParser";
import { useEngagementTracking } from "./hooks/useEngagementTracking";

const isDevelopment = process.env.NODE_ENV === "development";

interface AIDetection {
  original: number;
  tailored: number;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [changes, setChanges] = useState<any[]>([]);
  const [relevancyScores, setRelevancyScores] = useState<RelevancyScores | null>(null);
  const [aiDetection, setAiDetection] = useState<AIDetection | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contextPairId, setContextPairId] = useState<string | null>(null);
  const [classification, setClassification] = useState<any>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    layout: "grid",
    fontSize: "medium",
  });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [toolModal, setToolModal] = useState<{ toolId: string; result: any } | null>(null);

  // Track engagement to prevent false bounces
  useEngagementTracking();

  // Track page view on mount
  useEffect(() => {
    // Track page view with analytics
    analytics.trackEvent(analytics.events.PAGE_VIEW, { 
      page: 'home',
      timestamp: new Date().toISOString()
    });
    
    // Track session start
    analytics.trackEvent(analytics.events.SESSION_START, {
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'direct',
    });
  }, []);

  // Initialize session and welcome message
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await fetch("/api/mcp/session-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create" }),
        });
        if (response.ok) {
          const data = await response.json();
          setSessionId(data.sessionId);
          
          // Load model preference from session
          if (data.session?.preferences?.modelPreferences?.defaultModel) {
            setSelectedModel(data.session.preferences.modelPreferences.defaultModel);
          }
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
      }
    };

    if (messages.length === 0) {
      initializeSession();
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome! I'm your AI Resume Assistant. I can help you:\n\n• Optimize your resume for specific job descriptions\n• Compare original vs tailored versions\n• Detect AI-generated content\n• Calculate relevancy scores\n\n💡 You can chat with me naturally! Try commands like:\n• \"reanalyze\" - Check your content again\n• \"tailor\" - Optimize your resume\n• \"show comparison\" - View before/after\n• \"help\" - See all available commands\n\nPaste your resume and job description to get started!",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const detectAI = async (text: string): Promise<number> => {
    try {
      const response = await fetch("/api/ai-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text,
          sessionId,
          modelKey: selectedModel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.aiScore || 0;
      }
    } catch (error) {
      console.error("AI detection error:", error);
    }
    return 0;
  };

  const calculateRelevancy = async (original: string, tailored: string, jobDesc: string) => {
    try {
      const response = await fetch("/api/relevancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalResume: original,
          tailoredResume: tailored,
          jobDescription: jobDesc,
          sessionId,
          modelKey: selectedModel,
        }),
      });

      if (response.ok) {
        const scores = await response.json();
        setRelevancyScores(scores);
        return scores;
      }
    } catch (error) {
      console.error("Relevancy calculation error:", error);
    }
    return null;
  };

  const handleCommand = async (command: string, parameters: Record<string, any>, context: CommandContext) => {
    let responseMessage = "";
    setLastAction(command);

    switch (command) {
      case 'reanalyze':
        if (parameters.target === 'tailored' && tailoredResume) {
          const aiScore = await detectAI(tailoredResume);
          responseMessage = `🔍 Reanalyzed Tailored Resume:\n\nAI Detection Score: ${aiScore}%\n${aiScore > 50 ? "⚠️ High AI content detected" : "✓ Human-like content"}\n\nResume length: ${tailoredResume.length} characters`;
        } else if (resume) {
          const aiScore = await detectAI(resume);
          responseMessage = `🔍 Reanalyzed Resume:\n\nAI Detection Score: ${aiScore}%\n${aiScore > 50 ? "⚠️ High AI content detected" : "✓ Human-like content"}\n\nResume length: ${resume.length} characters`;
        } else if (jobDescription) {
          responseMessage = `🔍 Reanalyzed Job Description:\n\nLength: ${jobDescription.length} characters\n\nI've reviewed the job description again. Ready to optimize your resume when you paste it!`;
        } else {
          responseMessage = "I don't have any content to reanalyze. Please paste your resume or job description first.";
        }
        break;

      case 'tailor':
        if (resume && jobDescription) {
          responseMessage = "🔄 Tailoring your resume now...";
          await createContextPairAndTailor(resume, jobDescription);
          return; // handleTailorResume will add its own messages
        } else {
          responseMessage = `I need both your resume and job description to tailor it.\n\n${!resume ? "❌ Missing: Resume\n" : "✓ Resume ready\n"}${!jobDescription ? "❌ Missing: Job Description" : "✓ Job Description ready"}\n\nPlease paste the missing content. Once both are provided, tailoring will happen automatically.`;
        }
        break;

      case 'showOptions':
        const availableCommands = getAvailableCommands(context);
        const suggestions = formatCommandSuggestions(availableCommands, context);
        responseMessage = `Here's what I can help you with:\n\n${suggestions}\n\n💡 You can also:\n• Type "reanalyze" to check your content again\n• Type "show comparison" to see before/after\n• Type "detect ai" to check AI content scores\n• Type "relevancy" to see match scores\n• Type "clear" to start over\n\nJust type naturally - I'll understand what you need!`;
        break;

      case 'showComparison':
        // Track command usage
        analytics.trackEvent(analytics.events.COMMAND_SHOW_COMPARISON, {
          hasResume: !!resume,
          hasTailoredResume: !!tailoredResume,
          timestamp: new Date().toISOString(),
        });
        
        if (resume && tailoredResume) {
          responseMessage = "✅ Opening comparison view in a modal window...";
          setShowComparisonModal(true);
        } else {
          responseMessage = "I need to optimize your resume first before I can show a comparison. Please paste both your resume and job description, then type 'tailor'.";
        }
        break;

      case 'detectAI':
        if (tailoredResume) {
          const [originalScore, tailoredScore] = await Promise.all([
            detectAI(resume),
            detectAI(tailoredResume)
          ]);
          responseMessage = `🔍 AI Detection Results:\n\nOriginal Resume: ${originalScore}% AI\n${originalScore > 50 ? "⚠️ High AI content" : "✓ Human-like"}\n\nTailored Resume: ${tailoredScore}% AI\n${tailoredScore > 50 ? "⚠️ High AI content" : "✓ Human-like"}`;
        } else if (resume) {
          const aiScore = await detectAI(resume);
          responseMessage = `🔍 AI Detection Result:\n\nResume: ${aiScore}% AI\n${aiScore > 50 ? "⚠️ High AI content detected" : "✓ Human-like content"}`;
        } else {
          responseMessage = "I don't have any resume content to analyze. Please paste your resume first.";
        }
        break;

      case 'relevancy':
        if (resume && jobDescription) {
          if (tailoredResume) {
            const scores = await calculateRelevancy(resume, tailoredResume, jobDescription);
            responseMessage = `📊 Relevancy Scores:\n\nBefore Optimization: ${scores?.before || 0}%\nAfter Optimization: ${scores?.after || 0}%\nImprovement: ${scores?.improvement || "+0%"}\n\n${scores?.after && scores.after > 80 ? "🎉 Excellent match!" : scores?.after && scores.after > 60 ? "👍 Good match!" : "💡 Room for improvement"}`;
          } else {
            responseMessage = "I need to optimize your resume first. Type 'tailor' to optimize it, then I can show you the relevancy scores.";
          }
        } else {
          responseMessage = "I need both your resume and job description to calculate relevancy scores.";
        }
        break;

      case 'clear':
        setResume("");
        setJobDescription("");
        setTailoredResume("");
        setChanges([]);
        setRelevancyScores(null);
        setAiDetection(null);
        setClassification(null);
        setContextPairId(null);
        setLastAction(null);
        responseMessage = "✅ All cleared! Ready to start fresh.\n\nPaste your resume and job description to get started.";
        break;

      case 'export':
        // Track export action
        analytics.trackEvent(analytics.events.EXPORT_RESUME, {
          hasTailoredResume: !!tailoredResume,
          timestamp: new Date().toISOString(),
        });
        
        if (tailoredResume) {
          const blob = new Blob([tailoredResume], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tailored-resume-${Date.now()}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          responseMessage = "✅ Resume exported! Check your downloads folder.";
        } else {
          responseMessage = "I need to optimize your resume first before I can export it. Type 'tailor' to optimize.";
        }
        break;

      default:
        responseMessage = `I'm not sure how to handle "${command}". Type "help" or "show options" to see what I can do.`;
    }

    const commandResponse: ChatMessage = {
      id: `command-${Date.now()}`,
      role: "assistant",
      content: responseMessage,
      timestamp: new Date(),
      metadata: {
        type: "analysis",
        data: { command, parameters }
      },
    };
    setMessages((prev) => [...prev, commandResponse]);

    // Track command in session
    if (sessionId) {
      try {
        await fetch("/api/mcp/session-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "track-tool",
            sessionId,
            data: { toolId: `command-${command}`, result: { success: true } }
          }),
        });
      } catch (e) {
        console.error("Failed to track command:", e);
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Track chat message sent
    analytics.trackEvent(analytics.events.CHAT_MESSAGE_SENT, {
      length: content.length,
      isCommand: content.trim().length <= 150,
      timestamp: new Date().toISOString(),
    });
    
    // Track message in session
    if (sessionId) {
      try {
        await fetch("/api/mcp/session-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-message",
            sessionId,
            data: { role: "user", content }
          }),
        });
      } catch (e) {
        console.error("Failed to track message:", e);
      }
    }

    setLoading(true);

    try {
      // Check if this is a command first (only for short inputs)
      // Long inputs (>150 chars) are always treated as content
      if (content.trim().length <= 150) {
        const commandContext: CommandContext = {
          lastAction: lastAction || undefined,
          hasResume: !!resume,
          hasJobDescription: !!jobDescription,
          hasTailoredResume: !!tailoredResume,
          lastMessage: messages[messages.length - 1]?.content,
          lastClassification: classification?.type
        };

        const parsed = parseCommand(content, commandContext);

        // Handle commands (only if confidence is high and it's clearly a command)
        if (parsed.type === 'command' && parsed.command && parsed.confidence >= 0.8) {
          await handleCommand(parsed.command, parsed.parameters || {}, commandContext);
          setLoading(false);
          return;
        }

        // If unclear and short, try natural language router for tool selection
        if (parsed.type === 'unclear' && content.length < 50) {
          // Try natural language router to see if user wants to use a tool
          try {
            const routerResponse = await fetch("/api/mcp/natural-language-router", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userQuery: content,
                context: {
                  hasResume: !!resume,
                  hasJobDescription: !!jobDescription,
                  hasTailoredResume: !!tailoredResume
                }
              }),
            });

            if (routerResponse.ok) {
              const routerData = await routerResponse.json();
              if (routerData.selectedTools && routerData.selectedTools.length > 0) {
                // Execute the selected tool(s)
                const tool = routerData.selectedTools[0];
                let toolBody: any = {};
                
                if (tool.requires.includes("resume")) {
                  toolBody.resume = resume;
                }
                if (tool.requires.includes("jobDescription")) {
                  toolBody.jobDescription = jobDescription;
                }
                
                const toolResponse = await fetch(tool.endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(toolBody),
                });

                if (toolResponse.ok) {
                  const toolResult = await toolResponse.json();
                  const toolMessage: ChatMessage = {
                    id: `tool-${tool.id}-${Date.now()}`,
                    role: "assistant",
                    content: `🔧 ${tool.name} Results:\n\n${formatToolResult(tool.id, toolResult)}`,
                    timestamp: new Date(),
                    metadata: {
                      type: "analysis",
                      data: toolResult,
                    },
                  };
                  setMessages((prev) => [...prev, toolMessage]);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (e) {
            console.error("Natural language router error:", e);
          }

          // Fallback to help message
          const availableCommands = getAvailableCommands(commandContext);
          const suggestions = formatCommandSuggestions(availableCommands, commandContext);
          
          const helpMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `I'm not sure what you'd like me to do. Here are some things I can help with:\n\n${suggestions}\n\nOr paste your resume or job description to get started!`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, helpMessage]);
          setLoading(false);
          return;
        }
        
        // If parsed as content but was checked, continue to content processing below
      }

      // Step 1: Classify content using AI
      const existingContext = resume ? { type: "resume" } : jobDescription ? { type: "job_description" } : null;
      
      const classifyResponse = await fetch("/api/classify-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: content,
          existingContext,
          sessionId,
          modelKey: selectedModel, 
        }),
      });

      if (!classifyResponse.ok) {
        throw new Error("Failed to classify content");
      }

      const classificationResult = await classifyResponse.json();
      setClassification(classificationResult);

      // Step 2: Validate the content
      const validateResponse = await fetch("/api/mcp/data-validator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: classificationResult.type,
          content: content
        }),
      });

      let validationResult = null;
      if (validateResponse.ok) {
        validationResult = await validateResponse.json();
      }

      // Step 3: Process content based on classification
      if (classificationResult.type === "resume" || classificationResult.type === "mixed") {
        setResume(content);
        
        // Track resume input
        analytics.trackEvent(analytics.events.RESUME_PASTED, {
          length: content.length,
          confidence: classificationResult.confidence,
          timestamp: new Date().toISOString(),
        });
        
        // Track content classification
        analytics.trackEvent(analytics.events.CONTENT_CLASSIFIED, {
          type: classificationResult.type,
          confidence: classificationResult.confidence,
          timestamp: new Date().toISOString(),
        });
        
        // Track user journey step
        analytics.trackEvent(analytics.events.USER_JOURNEY_STEP, {
          step: 'resume_input',
          hasJobDescription: !!jobDescription,
          timestamp: new Date().toISOString(),
        });
        
        // Update session
        if (sessionId) {
          await fetch("/api/mcp/session-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              sessionId,
              data: { resume: content }
            }),
          });
        }

        // Process resume
        const processResponse = await fetch("/api/mcp/content-processor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "resume", content }),
        });

        let processedData = null;
        if (processResponse.ok) {
          processedData = await processResponse.json();
        }

        const aiScore = await detectAI(content);
        
        let messageContent = `✓ Resume received (${content.length} characters)\n\n`;
        
        if (classificationResult.quotaExceeded) {
          messageContent += `⚠️ API Quota Exceeded\n`;
          messageContent += `Using fallback classification (confidence: ${classificationResult.confidence}%)\n`;
          if (classificationResult.canRetryImmediately) {
            messageContent += `💡 You can retry immediately or wait ${classificationResult.retryAfter || 30}s for better results.\n\n`;
          } else {
            messageContent += `Please wait ${classificationResult.retryAfter || 30} seconds before trying again.\n\n`;
          }
        } else {
          messageContent += `Classification Confidence: ${classificationResult.confidence}%\n`;
        }
        
        messageContent += `AI Detection Score: ${aiScore}%\n`;
        messageContent += `${aiScore > 50 ? "⚠️ High AI content detected" : "✓ Human-like content"}\n\n`;
        
        if (validationResult && !validationResult.isValid) {
          messageContent += `⚠️ Validation Issues: ${validationResult.issues.length}\n`;
        }
        
        if (classificationResult.suggestions && classificationResult.suggestions.length > 0) {
          messageContent += `\n${classificationResult.suggestions.slice(0, 2).join("\n")}\n\n`;
        }
        
        messageContent += "Now paste the job description to optimize your resume!\n\n💡 Your resume will be automatically tailored once you paste the job description.";

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: messageContent,
          timestamp: new Date(),
          metadata: {
            type: "resume",
            data: { 
              length: content.length, 
              aiScore,
              classification: classificationResult,
              validation: validationResult,
              processed: processedData
            },
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Track in session
        if (sessionId) {
          await fetch("/api/mcp/session-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add-message",
              sessionId,
              data: { role: "assistant", content: messageContent }
            }),
          });
        }

        // If we have both resume and job description, automatically create context pair and tailor
        if (jobDescription) {
          // Track conversion event - user has both inputs
          analytics.trackEvent(analytics.events.CONVERSION_EVENT, {
            milestone: 'both_inputs_provided',
            timestamp: new Date().toISOString(),
          });
          
          // Small delay to let the message appear first
          setTimeout(() => {
            createContextPairAndTailor(content, jobDescription);
          }, 500);
        }
      } else if (classificationResult.type === "job_description") {
        setJobDescription(content);
        
        // Track job description input
        analytics.trackEvent(analytics.events.JOB_DESCRIPTION_PASTED, {
          length: content.length,
          confidence: classificationResult.confidence,
          timestamp: new Date().toISOString(),
        });
        
        // Track content classification
        analytics.trackEvent(analytics.events.CONTENT_CLASSIFIED, {
          type: classificationResult.type,
          confidence: classificationResult.confidence,
          timestamp: new Date().toISOString(),
        });
        
        // Track user journey step
        analytics.trackEvent(analytics.events.USER_JOURNEY_STEP, {
          step: 'job_description_input',
          hasResume: !!resume,
          timestamp: new Date().toISOString(),
        });
        
        // Update session
        if (sessionId) {
          await fetch("/api/mcp/session-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              sessionId,
              data: { jobDescriptions: [content] }
            }),
          });
        }

        // Process job description
        const processResponse = await fetch("/api/mcp/content-processor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "job_description", content }),
        });

        let processedData = null;
        if (processResponse.ok) {
          processedData = await processResponse.json();
        }

        let messageContent = `✓ Job description received (${content.length} characters)\n\n`;
        
        if (classificationResult.quotaExceeded) {
          messageContent += `⚠️ API Quota Exceeded\n`;
          messageContent += `Using fallback classification (confidence: ${classificationResult.confidence}%)\n`;
          if (classificationResult.canRetryImmediately) {
            messageContent += `💡 You can retry immediately or wait ${classificationResult.retryAfter || 30}s for better results.\n\n`;
          } else {
            messageContent += `Please wait ${classificationResult.retryAfter || 30} seconds before trying again.\n\n`;
          }
        } else {
          messageContent += `Classification Confidence: ${classificationResult.confidence}%\n`;
        }
        
        if (validationResult && !validationResult.isValid) {
          messageContent += `⚠️ Validation Issues: ${validationResult.issues.length}\n`;
        }
        
        messageContent += `\n${resume ? "🔄 Optimizing your resume automatically..." : "Now paste your resume to get started!"}\n\n💡 Your resume will be automatically tailored once you paste both your resume and job description.`;
        
        // Track conversion event if both inputs are now available
        if (resume) {
          analytics.trackEvent(analytics.events.CONVERSION_EVENT, {
            milestone: 'both_inputs_provided',
            timestamp: new Date().toISOString(),
          });
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: messageContent,
          timestamp: new Date(),
          metadata: {
            type: "job_description",
            data: { 
              length: content.length,
              classification: classificationResult,
              validation: validationResult,
              processed: processedData
            },
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Track in session
        if (sessionId) {
          await fetch("/api/mcp/session-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add-message",
              sessionId,
              data: { role: "assistant", content: messageContent }
            }),
          });
        }

        // If we have resume, automatically create context pair and tailor
        if (resume) {
          // Small delay to let the message appear first
          setTimeout(() => {
            createContextPairAndTailor(resume, content);
          }, 500);
        }
      } else {
        // Unclear or mixed - ask for clarification
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `I'm not sure if this is a resume or job description (confidence: ${classificationResult.confidence}%).\n\n${classificationResult.reasoning?.join("\n") || ""}\n\n${classificationResult.suggestions?.join("\n") || "Please clarify what you pasted."}`,
          timestamp: new Date(),
          metadata: {
            type: "unclear",
            data: { classification: classificationResult },
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const createContextPairAndTailor = async (resumeText: string, jobDescText: string) => {
    try {
      // Create context pair
      const contextResponse = await fetch("/api/mcp/context-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          resume: { content: resumeText },
          jobDescription: { content: jobDescText }
        }),
      });

      if (contextResponse.ok) {
        const contextData = await contextResponse.json();
        setContextPairId(contextData.pairId);
        
        // Update session with context pair
        if (sessionId) {
          await fetch("/api/mcp/session-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              sessionId,
              data: { contextPairs: [contextData.pairId] }
            }),
          });
        }
      }

      // Now tailor the resume
      await handleTailorResume(resumeText, jobDescText);
    } catch (error) {
      console.error("Failed to create context pair:", error);
      // Still try to tailor even if context creation fails
      await handleTailorResume(resumeText, jobDescText);
    }
  };

  const formatToolResult = (toolId: string, result: any): string => {
    if (!result) return "No results available.";
    
    switch (toolId) {
      case "ats-simulator":
        const criticalIssues = result.issues?.filter((i: any) => i.severity === 'critical' || i.severity === 'high') || [];
        const compatibleSystems = result.atsSystemCompatibility ? Object.entries(result.atsSystemCompatibility)
          .filter(([_, v]: [string, any]) => v.compatible)
          .map(([name]) => name) : [];
        return `ATS Score: ${result.atsScore || 0}%\nParsing Accuracy: ${result.parsingAccuracy || result.atsScore || 0}%\n\nCritical Issues: ${criticalIssues.length}\nCompatible ATS Systems: ${compatibleSystems.length > 0 ? compatibleSystems.join(', ') : 'None'}\n\nTop Issues:\n${criticalIssues.slice(0, 3).map((i: any) => `• ${i.description} (${i.location || 'Unknown location'})`).join('\n') || 'No critical issues'}\n\nView Details for full analysis and recommendations.`;
      case "keyword-analyzer":
        const keywordCount = Object.values(result.keywords || {}).flat().length;
        const missingCritical = result.missingFromResume?.filter((k: any) => k.importance === 'critical' || k.importanceScore >= 80) || [];
        return `Keywords Found: ${keywordCount}\nIndustry: ${result.industry || 'N/A'}\nExperience Level: ${result.experienceLevel || 'N/A'}\n\nMissing Critical Keywords: ${missingCritical.length}\n${missingCritical.slice(0, 3).map((k: any) => `• ${k.keyword} (${k.importanceScore || 0}% importance)`).join('\n') || 'None'}\n\nView Details for full keyword analysis and incorporation strategies.`;
      case "skills-gap":
        const criticalMissing = result.skills?.missing?.filter((s: any) => s.importance === 'critical' || s.importanceScore >= 80) || [];
        return `Match Score: ${result.matchScore || 0}%\nBreakdown: Skills ${result.matchBreakdown?.skills || 0}% | Experience ${result.matchBreakdown?.experience || 0}% | Education ${result.matchBreakdown?.education || 0}%\n\nMatched: ${result.skills?.matched?.length || 0} | Missing: ${result.skills?.missing?.length || 0} | Extra: ${result.skills?.extra?.length || 0}\n\nCritical Missing Skills:\n${criticalMissing.slice(0, 3).map((s: any) => `• ${s.skill} (Learn in ${s.learningPath?.timeEstimate || 'N/A'})`).join('\n') || 'None'}\n\nEstimated Time to Close Gaps: ${result.estimatedTimeToCloseGaps || 'Unknown'}\n\nView Details for prioritized learning paths and resources.`;
      case "interview-prep":
        return `Generated ${result.behavioral?.length || 0} behavioral questions\n${result.technical?.length || 0} technical questions\n${result.situational?.length || 0} situational questions\n${result.questionsToAsk?.length || 0} questions to ask interviewer\n\nTalking Points: ${result.talkingPoints?.length || 0}\nRed Flags to Address: ${result.redFlags?.length || 0}\n\nView Details for complete STAR examples, answer approaches, and interview strategies.`;
      case "format-validator":
        const criticalFormatIssues = result.issues?.filter((i: any) => i.severity === 'critical' || i.severity === 'high') || [];
        return `ATS Compatible: ${result.atsCompatible ? '✓ Yes' : '✗ No'}\nScore: ${result.score || 0}%\nParsing Accuracy: ${result.estimatedParsingAccuracy || 0}%\n\nCritical Issues: ${criticalFormatIssues.length}\n${criticalFormatIssues.slice(0, 3).map((i: any) => `• ${i.description} (${i.location || 'Unknown'})`).join('\n') || 'No critical issues'}\n\nView Details for section-by-section analysis and fix instructions.`;
      case "resume-versions":
        return `Total Versions: ${result.totalVersions || 0}\nLatest: ${result.latestVersion || 'N/A'}\n\nView Details to compare versions and track improvements.`;
      case "ats-optimizer":
        const quickWins = result.quickWins?.filter((w: any) => w.priority === 'critical' || w.priority === 'high') || [];
        return `Current: ${result.currentScore || 0}% → Projected: ${result.projectedScore || 0}%\nPotential Improvement: +${result.potentialImprovement || 0}%\n\nQuick Wins: ${quickWins.length}\n${quickWins.slice(0, 3).map((w: any) => `• ${w.action} (+${w.impact || 0} points, ${w.timeEstimate || 'N/A'})`).join('\n') || 'None'}\n\nView Details for implementation plan and priority matrix.`;
      case "resume-storyteller":
        return `Narrative Score: ${result.narrativeScore || 0}%\nEnhanced Sections: ${result.enhancedSections?.length || 0}\nStorytelling Techniques: ${result.storytellingTechniques?.length || 0}\n\nView Details for before/after examples and narrative improvements.`;
      case "multi-job-comparison":
        const avgMatch = result.overallAnalysis?.averageMatch || 0;
        const bestMatch = result.jobComparisons?.find((j: any) => j.jobIndex === result.overallAnalysis?.bestMatch);
        return `Jobs Compared: ${result.totalJobs || 0}\nAverage Match: ${avgMatch}%\nBest Match: ${bestMatch?.jobTitle || 'N/A'} (${bestMatch?.matchScore || 0}%)\nVersatility Score: ${result.overallAnalysis?.versatility || 0}%\n\nView Details for individual comparisons and optimization strategies.`;
      case "skills-market-value":
        const topSkills = result.skillsAnalysis?.slice(0, 3).filter((s: any) => s.marketValue?.demandScore >= 70) || [];
        const salaryRange = result.salaryPotential?.currentEstimate || 'N/A';
        const potentialRange = result.salaryPotential?.withSkillDevelopment || 'N/A';
        return `Market Value: ${result.marketPositioning?.overallValue || 0}%\nCompetitive Advantage: ${result.marketPositioning?.competitiveAdvantage || 0}%\n\nSalary: ${salaryRange} → ${potentialRange}\nPotential Increase: ${result.salaryPotential?.potentialIncrease || 'N/A'}\n\nTop High-Value Skills:\n${topSkills.map((s: any) => `• ${s.skill} (${s.marketValue?.demandScore || 0}% demand, ${s.marketValue?.salaryRange || 'N/A'})`).join('\n') || 'None'}\n\nView Details for ROI calculations and skill development recommendations.`;
      default:
        return result.summary || result.message || JSON.stringify(result, null, 2).substring(0, 500);
    }
  };

  const handleTailorResume = async (resumeText: string, jobDescText: string) => {
    const startTime = Date.now();
    setLoading(true);

    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      role: "assistant",
      content: "🔄 Analyzing your resume and job description...\n\n• Extracting key requirements\n• Identifying optimization opportunities\n• Generating tailored content",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, processingMessage]);

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resume: resumeText, 
          jobDescription: jobDescText,
          sessionId,
          modelKey: selectedModel,
        }),
      });

      const data = await response.json();

      // Check for error response
      if (data.error || !response.ok) {
        const errorMessage = data.message || "Failed to tailor resume";
        const model = data.model || selectedModel || "selected model";
        const suggestions = data.suggestions || {};
        
        let errorContent = `❌ Error: ${errorMessage}\n\n`;
        
        if (suggestions.checkApiKey) {
          errorContent += `🔑 **Check Your API Key:**\n`;
          errorContent += `- Verify your API key is correct and valid\n`;
          errorContent += `- Ensure the API key has the necessary permissions\n`;
          errorContent += `- Check that the environment variable is set correctly\n\n`;
        }
        
        if (suggestions.switchModel) {
          errorContent += `🔄 **Try a Different Model:**\n`;
          errorContent += `- Open the settings panel (⚙️ icon)\n`;
          errorContent += `- Select a different model from the dropdown\n`;
          errorContent += `- Some models may have different availability or rate limits\n\n`;
        }
        
        if (suggestions.retryAfter) {
          errorContent += `⏱️ **Wait and Retry:**\n`;
          errorContent += `- Wait ${suggestions.retryAfter} seconds before trying again\n`;
          errorContent += `- Rate limits reset after the specified time\n\n`;
        }
        
        errorContent += `💡 **Your original resume has been preserved.**`;
        
        const errorChatMessage: ChatMessage = {
          id: `error-tailor-${Date.now()}`,
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorChatMessage]);
        setLoading(false);
        return;
      }
      
      const newTailoredResume = data.tailoredResume || "";

      setTailoredResume(newTailoredResume);
      setChanges(data.changes || []);

      // Calculate relevancy
      const scores = await calculateRelevancy(resumeText, newTailoredResume, jobDescText);

      // Detect AI in both versions
      const [originalAIScore, tailoredAIScore] = await Promise.all([
        detectAI(resumeText),
        detectAI(newTailoredResume),
      ]);

      setAiDetection({
        original: originalAIScore,
        tailored: tailoredAIScore,
      });

      // Add success message
      const successMessage: ChatMessage = {
        id: `success-${Date.now()}`,
        role: "assistant",
        content: `✅ Resume optimized successfully!\n\n📊 Relevancy Score: ${scores?.before || 0}% → ${scores?.after || 0}% (${scores?.improvement || "+0%"})\n\n🔍 AI Detection:\n• Original: ${originalAIScore}% AI\n• Tailored: ${tailoredAIScore}% AI\n\n${data.changes?.length || 0} optimizations made.\n\n💡 Click the "Compare" button (bottom right) or type "show comparison" to see all changes!`,
        timestamp: new Date(),
        metadata: {
          type: "analysis",
          data: {
            scores,
            changes: data.changes,
            aiDetection: { original: originalAIScore, tailored: tailoredAIScore },
          },
        },
      };
      setMessages((prev) => [...prev, successMessage]);

      // Track analytics
      analytics.trackEvent(analytics.events.RESUME_TAILOR_SUCCESS, {
        resumeLength: resumeText.length,
        jobDescriptionLength: jobDescText.length,
        changesCount: data.changes?.length || 0,
        relevancyBefore: scores?.before || 0,
        relevancyAfter: scores?.after || 0,
        relevancyImprovement: scores?.improvement || '0%',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      
      // Track conversion event - successful tailoring
      analytics.trackEvent(analytics.events.CONVERSION_EVENT, {
        milestone: 'resume_tailored',
        relevancyImprovement: scores?.improvement || '0%',
        timestamp: new Date().toISOString(),
      });

      // Track successful tool execution
      if (sessionId) {
        await fetch("/api/mcp/session-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "track-tool",
            sessionId,
            data: { 
              toolId: "tailor", 
              result: { success: true, changesCount: data.changes?.length || 0 },
              executionTime: Date.now() - startTime
            }
          }),
        });
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `❌ Error: ${error instanceof Error ? error.message : "Failed to optimize resume"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Track failed tool execution
      if (sessionId) {
        await fetch("/api/mcp/session-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "track-tool",
            sessionId,
            data: { 
              toolId: "tailor", 
              error: error instanceof Error ? error.message : "Unknown error"
            }
          }),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Grid layout - no longer needs to account for comparison view
  const gridCols = settings.layout === "grid" ? "lg:grid-cols-3" : "grid-cols-1";

  return (
    <div className="h-screen bg-background text-foreground grid-pattern overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
          </div>

      <div className="container mx-auto px-4 py-4 max-w-[1800px] relative z-10 flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold mb-2 gradient-text-cyber">
                AI Resume Tailor
              </h1>
              <p className="text-gray-400">
                Futuristic resume optimization with real-time AI analysis
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-sm text-gray-300">System Online</span>
              </div>
            </div>
              </div>
        </header>

        {/* Main Content Grid */}
        <div className={`grid gap-6 ${gridCols} flex-1 min-h-0`}>
          {/* Chat Interface */}
          <div className="flex-1 min-h-0 lg:col-span-2">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={loading}
              relevancyScores={relevancyScores}
              aiDetection={aiDetection || undefined}
              classification={classification}
              contextStatus={{
                hasResume: !!resume,
                hasJobDescription: !!jobDescription,
                contextPairId: contextPairId || undefined
              }}
              onOpenComparison={() => setShowComparisonModal(true)}
              hasTailoredResume={!!tailoredResume}
              fontSize={settings.fontSize as "small" | "medium" | "large"}
              resume={resume}
              jobDescription={jobDescription}
            />
          </div>

          {/* Tools Panel */}
          <div className="flex-1 min-h-0">
            <ToolsPanel
              resume={resume}
              jobDescription={jobDescription}
              sessionId={sessionId}
              selectedModel={selectedModel}
              onViewDetails={(toolId, result) => {
                setToolModal({ toolId, result });
              }}
              onToolResult={(toolId, result) => {
                // Add tool results to chat
                const toolNames: Record<string, string> = {
                  "ats-simulator": "ATS Simulator",
                  "keyword-analyzer": "Keyword Analyzer",
                  "skills-gap": "Skills Gap Analyzer",
                  "interview-prep": "Interview Prep Generator",
                  "format-validator": "Format Validator",
                };
                
                const toolMessage: ChatMessage = {
                  id: `tool-${toolId}-${Date.now()}`,
                  role: "assistant",
                  content: `🔧 ${toolNames[toolId]} Results:\n\n${formatToolResult(toolId, result)}`,
                  timestamp: new Date(),
                  metadata: {
                    type: "analysis",
                    data: result,
                  },
                };
                setMessages((prev) => [...prev, toolMessage]);
              }}
            />
          </div>

        </div>
        </div>

      {/* Control Panel */}
      <ControlPanel
        onViewChange={(view) => console.log("View changed:", view)}
        onSettingsChange={(newSettings) => setSettings(newSettings)}
        sessionId={sessionId}
        selectedModel={selectedModel}
        onModelChange={(modelKey) => setSelectedModel(modelKey)}
      />

      {/* Comparison Modal */}
      {resume && tailoredResume && (
        <ComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          original={resume}
          tailored={tailoredResume}
          fontSize={settings.fontSize as "small" | "medium" | "large"}
        />
      )}

      {/* Tool Results Modal */}
      {toolModal && (
        <ToolResultsModal
          isOpen={!!toolModal}
          onClose={() => setToolModal(null)}
          title={`${toolModal.toolId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Detailed Results`}
          subtitle="Comprehensive analysis and recommendations"
        >
          <div className="space-y-6">
            <pre className="text-xs text-gray-300 bg-gray-900/50 p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(toolModal.result, null, 2)}
            </pre>
            <div className="text-sm text-gray-400">
              <p>Full detailed analysis is available above. Specific modal components for each tool will be implemented to provide better visualization.</p>
            </div>
          </div>
        </ToolResultsModal>
      )}

      <JsonLd />
          </div>
  );
}
