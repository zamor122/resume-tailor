"use client";

import { useState, useRef, useEffect } from "react";
import ChatInterface, { ChatMessage } from "./components/ChatInterface";
import ComparisonView from "./components/ComparisonView";
import ControlPanel from "./components/ControlPanel";
import ToolsPanel from "./components/ToolsPanel";
import { RelevancyScores } from "./components/RelevancyScore";
import { analytics } from "./services/analytics";
import JsonLd from "./components/JsonLd";
import { parseCommand, getAvailableCommands, formatCommandSuggestions, type CommandContext } from "./utils/commandParser";

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
    showAIDetection: true,
    showRelevancyScore: true,
    showComparison: true,
    showChat: true,
    layout: "grid",
  });

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
        body: JSON.stringify({ text }),
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
        if (resume && tailoredResume) {
          responseMessage = "✅ Comparison view is now visible! Check the right panel to see the before/after comparison.\n\nYou can switch between Split View, Unified Diff, and Line Diff modes.";
          setSettings(prev => ({ ...prev, showComparison: true }));
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
          existingContext 
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
          // Small delay to let the message appear first
          setTimeout(() => {
            createContextPairAndTailor(content, jobDescription);
          }, 500);
        }
      } else if (classificationResult.type === "job_description") {
        setJobDescription(content);
        
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
        return `ATS Compatibility Score: ${result.atsScore || 0}%\n\nIssues Found: ${result.issues?.length || 0}\n${result.recommendations?.slice(0, 3).map((r: string) => `• ${r}`).join('\n') || 'No recommendations'}`;
      case "keyword-analyzer":
        const keywordCount = Object.values(result.keywords || {}).flat().length;
        return `Found ${keywordCount} keywords\nIndustry: ${result.industry || 'N/A'}\nExperience Level: ${result.experienceLevel || 'N/A'}\n\nTop Recommendations:\n${result.recommendations?.slice(0, 3).map((r: any) => `• ${r.keyword || r}: ${r.suggestion || ''}`).join('\n') || 'No recommendations'}`;
      case "skills-gap":
        return `Match Score: ${result.matchScore || 0}%\n\nMatched Skills: ${result.skills?.matched?.length || 0}\nMissing Skills: ${result.skills?.missing?.length || 0}\n\nTop Action Items:\n${result.actionPlan?.slice(0, 3).map((a: any) => `• ${a.action || a} (${a.timeline || 'N/A'})`).join('\n') || 'No action items'}`;
      case "interview-prep":
        return `Generated ${result.behavioral?.length || 0} behavioral questions\n${result.technical?.length || 0} technical questions\n${result.questionsToAsk?.length || 0} questions to ask\n\nTips:\n${result.interviewTips?.slice(0, 3).map((t: string) => `• ${t}`).join('\n') || 'No tips available'}`;
      case "format-validator":
        return `ATS Compatible: ${result.atsCompatible ? '✓ Yes' : '✗ No'}\nScore: ${result.score || 0}%\nEstimated Parsing: ${result.estimatedParsingAccuracy || 0}%\n\nIssues: ${result.issues?.length || 0}\n${result.issues?.slice(0, 3).map((i: any) => `• ${i.description || i}`).join('\n') || 'No issues found'}`;
      case "resume-versions":
        return `Versions: ${result.versions?.length || 0}\nLatest: ${result.latestVersion || 'N/A'}\n${result.summary || 'No summary available'}`;
      case "ats-optimizer":
        return `Current Score: ${result.currentScore || 0}%\nOptimized Score: ${result.optimizedScore || 0}%\nImprovements: ${result.improvements?.length || 0}\n${result.recommendations?.slice(0, 3).map((r: any) => `• ${r}`).join('\n') || 'No recommendations'}`;
      case "resume-storyteller":
        return `Stories Generated: ${result.stories?.length || 0}\n${result.summary || 'No stories available'}`;
      case "multi-job-comparison":
        return `Jobs Compared: ${result.comparisons?.length || 0}\n${result.summary || 'No comparison available'}`;
      case "skills-market-value":
        return `Skills Analyzed: ${result.skillsAnalysis?.length || 0}\nMarket Value: ${result.marketPositioning?.overallValue || 0}%\n${result.recommendations?.slice(0, 3).map((r: any) => `• ${r.action || r}`).join('\n') || 'No recommendations'}`;
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
        body: JSON.stringify({ resume: resumeText, jobDescription: jobDescText }),
      });

      if (!response.ok) {
        throw new Error("Failed to tailor resume");
      }

      const data = await response.json();
      
      // Check for quota exceeded
      if (data.quotaExceeded) {
        const retryMessage = data.canRetryImmediately 
          ? "You can retry immediately, or wait for better results."
          : `Please wait ${data.retryAfter || 30} seconds before trying again.`;
        
        const quotaMessage: ChatMessage = {
          id: `quota-tailor-${Date.now()}`,
          role: "assistant",
          content: `⚠️ API Quota Exceeded\n\nUnable to optimize resume at this time.\n${retryMessage}\n\nYour original resume is preserved.\n\n💡 Tip: You can try again now - the system will attempt to process your request.\n\nFor more information: https://ai.google.dev/gemini-api/docs/rate-limits`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, quotaMessage]);
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
        content: `✅ Resume optimized successfully!\n\n📊 Relevancy Score: ${scores?.before || 0}% → ${scores?.after || 0}% (${scores?.improvement || "+0%"})\n\n🔍 AI Detection:\n• Original: ${originalAIScore}% AI\n• Tailored: ${tailoredAIScore}% AI\n\n${data.changes?.length || 0} optimizations made. Check the comparison view to see all changes!`,
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

  // Determine grid layout based on what's visible
  const showComparison = settings.showComparison && resume && tailoredResume;
  const gridCols = settings.layout === "grid" 
    ? (showComparison ? "lg:grid-cols-4" : "lg:grid-cols-3")
    : "grid-cols-1";

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
          {settings.showChat && (
            <div className={`flex-1 min-h-0 ${showComparison ? "lg:col-span-2" : "lg:col-span-2"}`}>
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
              />
            </div>
          )}

          {/* Tools Panel */}
          <div className="flex-1 min-h-0">
            <ToolsPanel
              resume={resume}
              jobDescription={jobDescription}
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

          {/* Comparison View */}
          {showComparison && (
            <div className="flex-1 min-h-0 lg:col-span-1">
              <ComparisonView
                original={resume}
                tailored={tailoredResume}
                viewMode="split"
                showLineNumbers={true}
              />
            </div>
          )}

          {/* Placeholder when no comparison available */}
          {settings.showComparison && !showComparison && (
            <div className="flex-1 min-h-0 lg:col-span-1 glass rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-4 mx-auto flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2 gradient-text-cyber">Comparison View</h3>
                <p className="text-gray-400">
                  Optimize your resume to see the before/after comparison
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <ControlPanel
        onViewChange={(view) => console.log("View changed:", view)}
        onSettingsChange={(newSettings) => setSettings(newSettings)}
      />

      <JsonLd />
    </div>
  );
}
