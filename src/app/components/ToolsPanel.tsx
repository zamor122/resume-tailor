"use client";

import { useState } from "react";
import { analytics } from "../services/analytics";
import InfoTooltip from "./InfoTooltip";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  endpoint: string;
  requiresResume?: boolean;
  requiresJobDescription?: boolean;
  tooltip?: string;
  needsLocation?: boolean;
  needsIndustry?: boolean;
}

const availableTools: Tool[] = [
  {
    id: "ats-simulator",
    name: "ATS Simulator",
    description: "Test how ATS systems parse your resume",
    icon: "🔍",
    endpoint: "/api/tools/ats-simulator",
    requiresResume: true,
    tooltip: "Simulates how major ATS systems (Workday, Taleo, Greenhouse) parse your resume. Identifies parsing issues before submission.",
  },
  {
    id: "ats-optimizer",
    name: "ATS Score Optimizer",
    description: "Real-time suggestions to improve ATS compatibility",
    icon: "⚡",
    endpoint: "/api/tools/ats-optimizer",
    requiresResume: true,
    tooltip: "Real-time optimization suggestions with projected score improvements. Prioritized by impact vs effort.",
  },
  {
    id: "keyword-analyzer",
    name: "Keyword Analyzer",
    description: "Extract industry-specific keywords from job description",
    icon: "🔑",
    endpoint: "/api/tools/keyword-analyzer",
    requiresJobDescription: true,
    tooltip: "Extracts industry-specific keywords from job descriptions. Identifies missing keywords and suggests natural incorporation strategies.",
    needsIndustry: true,
  },
  {
    id: "skills-gap",
    name: "Skills Gap Analyzer",
    description: "Compare your skills vs job requirements",
    icon: "📊",
    endpoint: "/api/tools/skills-gap",
    requiresResume: true,
    requiresJobDescription: true,
    tooltip: "Compares your skills against job requirements. Provides prioritized learning paths with timelines and resources.",
  },
  {
    id: "skills-market-value",
    name: "Skills Market Value",
    description: "Analyze market demand and value of your skills",
    icon: "💰",
    endpoint: "/api/tools/skills-market-value",
    requiresResume: true,
    tooltip: "Analyzes market demand and salary impact of your skills. Provides ROI-based recommendations for skill development.",
    needsLocation: true,
    needsIndustry: true,
  },
  {
    id: "interview-prep",
    name: "Interview Prep",
    description: "Generate interview questions and prep materials",
    icon: "💼",
    endpoint: "/api/tools/interview-prep",
    requiresJobDescription: true,
    tooltip: "Generates comprehensive interview questions tailored to the job. Includes STAR method examples and talking points from your resume.",
  },
  {
    id: "format-validator",
    name: "Format Validator",
    description: "Check ATS-friendly formatting",
    icon: "✅",
    endpoint: "/api/tools/format-validator",
    requiresResume: true,
    tooltip: "Validates ATS-friendly formatting. Identifies formatting issues that prevent ATS systems from parsing your resume correctly.",
  },
  {
    id: "resume-storyteller",
    name: "Resume Storyteller",
    description: "Transform resume into compelling narrative",
    icon: "📖",
    endpoint: "/api/tools/resume-storyteller",
    requiresResume: true,
    tooltip: "Transforms your resume into a compelling narrative while maintaining ATS compatibility. Enhances storytelling without sacrificing keywords.",
  },
  {
    id: "multi-job-comparison",
    name: "Multi-Job Comparison",
    description: "Compare resume against multiple jobs simultaneously",
    icon: "🔀",
    endpoint: "/api/tools/multi-job-comparison",
    requiresResume: true,
    requiresJobDescription: true,
    tooltip: "Compares your resume against multiple jobs simultaneously. Identifies common themes and optimization strategies for multiple applications.",
  },
  {
    id: "resume-versions",
    name: "Version Control",
    description: "Track and compare resume versions over time",
    icon: "📝",
    endpoint: "/api/tools/resume-versions",
    requiresResume: true,
    tooltip: "Tracks resume versions over time. Compare versions, analyze changes, and understand resume evolution.",
  },
];

interface ToolsPanelProps {
  resume?: string;
  jobDescription?: string;
  onToolResult?: (toolId: string, result: any) => void;
  sessionId?: string | null;
  selectedModel?: string;
  onViewDetails?: (toolId: string, result: any) => void;
}

export default function ToolsPanel({ resume, jobDescription, onToolResult, sessionId, selectedModel, onViewDetails }: ToolsPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [location, setLocation] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [showContextInputs, setShowContextInputs] = useState<Record<string, boolean>>({});

  const runTool = async (tool: Tool) => {
    if (tool.requiresResume && !resume) {
      alert("Resume is required for this tool");
      return;
    }
    if (tool.requiresJobDescription && !jobDescription) {
      alert("Job description is required for this tool");
      return;
    }

    // Track tool opened
    analytics.trackEvent(analytics.events.TOOL_OPENED, {
      toolId: tool.id,
      toolName: tool.name,
      timestamp: new Date().toISOString(),
    });
    
    // Track specific tool event
    const toolEventMap: { [key: string]: string } = {
      'ats-simulator': analytics.events.ATS_SIMULATOR,
      'keyword-analyzer': analytics.events.KEYWORD_ANALYZER,
      'skills-gap': analytics.events.SKILLS_GAP,
      'interview-prep': analytics.events.INTERVIEW_PREP,
      'format-validator': analytics.events.FORMAT_VALIDATOR,
      'ats-optimizer': analytics.events.ATS_OPTIMIZER,
      'resume-versions': analytics.events.RESUME_VERSIONS,
      'resume-storyteller': analytics.events.RESUME_STORYTELLER,
      'multi-job-comparison': analytics.events.MULTI_JOB_COMPARISON,
      'skills-market-value': analytics.events.SKILLS_MARKET_VALUE,
    };
    
    if (toolEventMap[tool.id]) {
      analytics.trackEvent(toolEventMap[tool.id], {
        timestamp: new Date().toISOString(),
      });
    }

    setLoading(tool.id);
    const startTime = Date.now();

    try {
      const body: any = {};
      if (tool.requiresResume) body.resume = resume;
      if (tool.requiresJobDescription) {
        body.jobDescription = jobDescription;
        // For multi-job-comparison, also send as array for compatibility
        if (tool.id === "multi-job-comparison") {
          body.jobDescriptions = jobDescription ? [jobDescription] : [];
        }
      }
      // Add location and industry context
      if (tool.needsLocation && location) {
        body.location = location;
      }
      if (tool.needsIndustry) {
        if (industry) {
          body.industry = industry;
        } else if (jobDescription) {
          // Try to detect industry from job description
          const industryMatch = jobDescription.match(/(software|tech|finance|healthcare|education|marketing|sales|engineering|design|consulting)/i);
          if (industryMatch) body.industry = industryMatch[1];
        }
      }
      // Add sessionId and modelKey for all tools
      if (sessionId) {
        body.sessionId = sessionId;
      }
      if (selectedModel) {
        body.modelKey = selectedModel;
      }
      // Add sessionId for resume-versions if available (fallback to localStorage)
      if (tool.id === "resume-versions" && !sessionId) {
        // Try to get sessionId from localStorage or generate one
        if (typeof window !== 'undefined') {
          let localSessionId = localStorage.getItem('resume-tailor-session-id');
          if (!localSessionId) {
            localSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('resume-tailor-session-id', localSessionId);
          }
          body.sessionId = localSessionId;
        }
      }

      const response = await fetch(tool.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Tool failed: ${response.statusText}`);
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;
      
      setResults((prev) => ({ ...prev, [tool.id]: result }));
      
      // Track tool completed
      analytics.trackEvent(analytics.events.TOOL_COMPLETED, {
        toolId: tool.id,
        toolName: tool.name,
        executionTime,
        success: true,
        timestamp: new Date().toISOString(),
      });
      
      onToolResult?.(tool.id, result);
    } catch (error) {
      console.error(`Error running tool ${tool.id}:`, error);
      alert(`Failed to run ${tool.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      
      // Track tool error
      analytics.trackEvent(analytics.events.TOOL_ERROR, {
        toolId: tool.id,
        toolName: tool.name,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(null);
    }
  };

  const getToolStatus = (tool: Tool) => {
    if (loading === tool.id) return "loading";
    if (results[tool.id]) return "completed";
    if (tool.requiresResume && !resume) return "disabled";
    if (tool.requiresJobDescription && !jobDescription) return "disabled";
    return "ready";
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold gradient-text-cyber">AI Tools</h3>
        <div className="text-xs text-gray-400">
          {Object.keys(results).length} / {availableTools.length} tools used
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableTools.map((tool) => {
          const status = getToolStatus(tool);
          const isDisabled = status === "disabled";
          const isLoading = status === "loading";
          const isCompleted = status === "completed";

          return (
            <button
              key={tool.id}
              onClick={() => !isDisabled && !isLoading && runTool(tool)}
              disabled={isDisabled || isLoading}
              className={`
                relative p-4 rounded-xl border-2 transition-all text-left
                ${isDisabled 
                  ? "bg-white/5 border-white/10 opacity-50 cursor-not-allowed" 
                  : isLoading
                  ? "bg-primary/10 border-primary/50 cursor-wait"
                  : isCompleted
                  ? "bg-green-500/10 border-green-500/50 hover:bg-green-500/20"
                  : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-primary/50 cursor-pointer"
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{tool.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{tool.name}</h4>
                    {tool.tooltip && (
                      <InfoTooltip content={tool.tooltip} />
                    )}
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isCompleted && (
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{tool.description}</p>
                  {(tool.needsLocation || tool.needsIndustry) && !isDisabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowContextInputs(prev => ({ ...prev, [tool.id]: !prev[tool.id] }));
                      }}
                      className="mt-1 text-xs text-primary hover:text-primary-light transition-colors"
                    >
                      {showContextInputs[tool.id] ? "Hide" : "Add"} context
                    </button>
                  )}
                  {showContextInputs[tool.id] && (
                    <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                      {tool.needsLocation && (
                        <input
                          type="text"
                          placeholder="Location (e.g., San Francisco, CA)"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary/50"
                        />
                      )}
                      {tool.needsIndustry && (
                        <input
                          type="text"
                          placeholder="Industry (e.g., Software, Finance)"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary/50"
                        />
                      )}
                    </div>
                  )}
                  {isDisabled && (
                    <p className="text-xs text-red-400 mt-1">
                      {tool.requiresResume && !resume ? "Resume required" : ""}
                      {tool.requiresJobDescription && !jobDescription ? "Job description required" : ""}
                    </p>
                  )}
                </div>
              </div>
              
              {isCompleted && results[tool.id] && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <div className="text-xs text-gray-400">
                    {tool.id === "ats-simulator" && (
                      <span>ATS Score: <span className="text-primary font-bold">{results[tool.id].atsScore}%</span></span>
                    )}
                    {tool.id === "keyword-analyzer" && (
                      <span>Keywords: <span className="text-primary font-bold">{Object.values(results[tool.id].keywords || {}).flat().length}</span></span>
                    )}
                    {tool.id === "skills-gap" && (
                      <span>Match: <span className="text-primary font-bold">{results[tool.id].matchScore}%</span></span>
                    )}
                    {tool.id === "format-validator" && (
                      <span>Compatibility: <span className={results[tool.id].atsCompatible ? "text-green-400" : "text-red-400"}>{results[tool.id].atsCompatible ? "✓ Compatible" : "✗ Issues Found"}</span></span>
                    )}
                    {tool.id === "interview-prep" && (
                      <span>Questions: <span className="text-primary font-bold">{results[tool.id].behavioral?.length || 0} behavioral</span></span>
                    )}
                    {tool.id === "ats-optimizer" && (
                      <span>Potential: <span className="text-green-400 font-bold">+{results[tool.id].potentialImprovement || 0}%</span></span>
                    )}
                    {tool.id === "resume-storyteller" && (
                      <span>Narrative: <span className="text-primary font-bold">{results[tool.id].narrativeScore || 0}%</span></span>
                    )}
                    {tool.id === "skills-market-value" && (
                      <span>Value: <span className="text-primary font-bold">{results[tool.id].marketPositioning?.overallValue || 0}%</span></span>
                    )}
                    {tool.id === "multi-job-comparison" && (
                      <span>Jobs: <span className="text-primary font-bold">{results[tool.id].totalJobs || 0} compared</span></span>
                    )}
                    {tool.id === "resume-versions" && (
                      <span>Versions: <span className="text-green-400 font-bold">{results[tool.id]?.totalVersions || 0}</span></span>
                    )}
                  </div>
                  {onViewDetails && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(tool.id, results[tool.id]);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-semibold bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => {
              availableTools.forEach(tool => {
                if (getToolStatus(tool) === "ready") {
                  runTool(tool);
                }
              });
            }}
            className="flex-1 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 
                     transition-colors text-sm font-semibold"
          >
            Run All Available Tools
          </button>
          <button
            onClick={() => setResults({})}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 
                     transition-colors text-sm"
          >
            Clear Results
          </button>
        </div>
      </div>
    </div>
  );
}

