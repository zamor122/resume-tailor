"use client";

import { useState, useRef, useEffect } from "react";
import { RelevancyScores } from "./RelevancyScore";
import { getFontSizeClass } from "@/app/utils/fontSize";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    type?: "resume" | "job_description" | "comparison" | "analysis" | "unclear";
    data?: any;
  };
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  relevancyScores?: RelevancyScores | null;
  aiDetection?: {
    original: number; // 0-100, percentage AI detected
    tailored: number;
  };
  classification?: {
    type: string;
    confidence: number;
  } | null;
  contextStatus?: {
    hasResume: boolean;
    hasJobDescription: boolean;
    contextPairId?: string;
  };
  onOpenComparison?: () => void;
  hasTailoredResume?: boolean;
  fontSize?: "small" | "medium" | "large";
  resume?: string;
  jobDescription?: string;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  relevancyScores,
  aiDetection,
  classification,
  contextStatus,
  onOpenComparison,
  hasTailoredResume = false,
  fontSize = "medium",
  resume,
  jobDescription,
}: ChatInterfaceProps) {
  const fontSizeClass = getFontSizeClass(fontSize);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showContextViewer, setShowContextViewer] = useState(false);
  const [expandedContext, setExpandedContext] = useState<"resume" | "job" | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  // Filter out messages that are resume or job description submissions
  const visibleMessages = messages.filter((message) => {
    // Hide assistant messages with resume/job_description metadata
    if (message.metadata?.type === "resume" || message.metadata?.type === "job_description") {
      return false;
    }
    // Hide user messages that are very long (likely resume/job description pastes)
    // and have a following assistant message with resume/job_description type
    if (message.role === "user" && message.content.length > 500) {
      const nextMessage = messages[messages.findIndex(m => m.id === message.id) + 1];
      if (nextMessage?.metadata?.type === "resume" || nextMessage?.metadata?.type === "job_description") {
        return false;
      }
    }
    return true;
  });

  // Generate summary for resume/job description
  const getSummary = (text: string, maxLength: number = 150) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="flex flex-col h-full glass rounded-2xl flex-shrink-0 overflow-visible">
      {/* Chat Header */}
      <div className="glass-strong border-b border-white/10 p-4 flex-shrink-0 overflow-visible">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
            <h2 className="text-xl font-bold gradient-text-cyber">AI Resume Assistant</h2>
          </div>
          {relevancyScores && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 group relative">
                <span className="text-gray-400">Relevancy Before:</span>
                <span className="font-bold text-red-400">{relevancyScores.before}%</span>
                <div className="relative z-[9999]">
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] border border-white/20">
                    <strong>Relevancy Score (Before):</strong> This percentage indicates how well your original resume matches the job description. Higher scores mean better alignment with the job requirements.
                  </div>
                </div>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div className="flex items-center gap-2 group relative">
                <span className="text-gray-400">Relevancy After:</span>
                <span className="font-bold text-green-400">{relevancyScores.after}%</span>
                <div className="relative z-[9999]">
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] border border-white/20">
                    <strong>Relevancy Score (After):</strong> This percentage shows how well your optimized resume matches the job description after tailoring. The goal is to improve this score through optimization.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Context Status */}
        {(contextStatus || classification) && (
          <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t border-white/5">
            {contextStatus && (
              <>
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${contextStatus.hasResume ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                  <div className={`w-2 h-2 rounded-full ${contextStatus.hasResume ? "bg-green-400" : "bg-gray-400"}`}></div>
                  <span>Resume</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${contextStatus.hasJobDescription ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                  <div className={`w-2 h-2 rounded-full ${contextStatus.hasJobDescription ? "bg-green-400" : "bg-gray-400"}`}></div>
                  <span>Job Description</span>
                </div>
              </>
            )}
            {classification && (
              <div className="ml-auto flex items-center gap-2 text-gray-400">
                <span>Classification:</span>
                <span className="font-semibold">{classification.type}</span>
                <span>({classification.confidence}%)</span>
              </div>
            )}
          </div>
        )}

        {/* Compact Context Viewer */}
        {(resume || jobDescription) && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <button
              onClick={() => setShowContextViewer(!showContextViewer)}
              className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>View Context</span>
                {resume && jobDescription && (
                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px]">Both loaded</span>
                )}
              </div>
              <svg 
                className={`w-4 h-4 transition-transform ${showContextViewer ? "rotate-180" : ""}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showContextViewer && (
              <div className="mt-2 space-y-2">
                {resume && (
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <button
                      onClick={() => setExpandedContext(expandedContext === "resume" ? null : "resume")}
                      className="w-full flex items-center justify-between text-xs mb-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span className="font-semibold text-green-400">Resume</span>
                        <span className="text-gray-500">({resume.length} chars)</span>
                      </div>
                      <svg 
                        className={`w-3 h-3 transition-transform ${expandedContext === "resume" ? "rotate-180" : ""}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`text-xs text-gray-400 whitespace-pre-wrap overflow-y-auto ${
                      expandedContext === "resume" ? "max-h-64" : ""
                    }`}>
                      {expandedContext === "resume" ? (
                        <div className="space-y-1">
                          <div className="text-[10px] text-gray-500 mb-1">Full content (scrollable):</div>
                          <div>{resume}</div>
                        </div>
                      ) : (
                        <div>
                          {getSummary(resume, 100)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedContext("resume");
                            }}
                            className="mt-1 text-[10px] text-primary hover:text-primary/80 underline"
                          >
                            View full →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {jobDescription && (
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <button
                      onClick={() => setExpandedContext(expandedContext === "job" ? null : "job")}
                      className="w-full flex items-center justify-between text-xs mb-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="font-semibold text-blue-400">Job Description</span>
                        <span className="text-gray-500">({jobDescription.length} chars)</span>
                      </div>
                      <svg 
                        className={`w-3 h-3 transition-transform ${expandedContext === "job" ? "rotate-180" : ""}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`text-xs text-gray-400 whitespace-pre-wrap overflow-y-auto ${
                      expandedContext === "job" ? "max-h-64" : ""
                    }`}>
                      {expandedContext === "job" ? (
                        <div className="space-y-1">
                          <div className="text-[10px] text-gray-500 mb-1">Full content (scrollable):</div>
                          <div>{jobDescription}</div>
                        </div>
                      ) : (
                        <div>
                          {getSummary(jobDescription, 100)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedContext("job");
                            }}
                            className="mt-1 text-[10px] text-primary hover:text-primary/80 underline"
                          >
                            View full →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 grid-pattern min-h-0">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2 gradient-text-cyber">Welcome to AI Resume Tailor</h3>
            <p className="text-gray-400 max-w-md">
              Start by pasting your resume and job description. I'll help you optimize your resume with real-time analysis and AI detection.
            </p>
          </div>
        ) : (
          visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${
                message.role === "user" ? "user" : message.role === "assistant" ? "assistant" : "system"
              }`}
            >
              <div className="flex items-start gap-3">
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {message.role === "user" ? "You" : message.role === "assistant" ? "AI Assistant" : "System"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={`${fontSizeClass} leading-relaxed whitespace-pre-wrap`}>{message.content}</div>
                  {message.metadata?.type === "analysis" && message.metadata.data && (
                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-400 mb-2">Analysis Results</div>
                      {message.metadata.data.changes && (
                        <div className="text-xs">
                          <span className="text-green-400">✓ {message.metadata.data.changes.length} optimizations made</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="chat-message assistant">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Comparison Button - Prominent */}
      {hasTailoredResume && onOpenComparison && (
        <div className="px-4 py-3 border-t border-white/10 glass-strong flex-shrink-0">
          <button
            onClick={onOpenComparison}
            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 
                     border-2 border-primary/50 hover:border-primary transition-all
                     flex items-center justify-center gap-3 group hover:scale-[1.02] active:scale-[0.98]
                     shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            <svg className="w-6 h-6 text-primary group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span className="text-lg font-bold gradient-text-cyber">View Comparison</span>
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* AI Detection Indicator */}
      {aiDetection && (
        <div className="px-4 py-2 border-t border-white/10 glass-strong flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 group relative">
                <span className="text-gray-400">Original AI Score:</span>
                <span className={`font-bold ${aiDetection.original > 50 ? "text-red-400" : "text-green-400"}`}>
                  {aiDetection.original}%
                </span>
                <span className={`ai-badge ${aiDetection.original > 50 ? "ai-detected" : "human"}`}>
                  {aiDetection.original > 50 ? "AI Detected" : "Human-like"}
                </span>
                <div className="relative z-[9999]">
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute bottom-full right-0 mb-2 w-72 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] border border-white/20">
                    <strong>AI Detection Score (Original):</strong> This percentage indicates the likelihood that your original resume was written or heavily modified by AI. Scores above 50% suggest AI-generated content, while lower scores indicate more human-written text. Many ATS systems and recruiters prefer resumes that appear more human-written.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 group relative">
                <span className="text-gray-400">Tailored AI Score:</span>
                <span className={`font-bold ${aiDetection.tailored > 50 ? "text-red-400" : "text-green-400"}`}>
                  {aiDetection.tailored}%
                </span>
                <span className={`ai-badge ${aiDetection.tailored > 50 ? "ai-detected" : "human"}`}>
                  {aiDetection.tailored > 50 ? "AI Detected" : "Human-like"}
                </span>
                <div className="relative z-[9999]">
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute bottom-full right-0 mb-2 w-72 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] border border-white/20">
                    <strong>AI Detection Score (Tailored):</strong> This percentage shows the AI detection score for your optimized resume. The goal is to keep this score low (below 50%) to ensure your resume appears human-written, which is preferred by most ATS systems and hiring managers.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 glass-strong flex-shrink-0">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a command (e.g., 'reanalyze', 'tailor', 'help') or paste resume/job description..."
              className={`w-full px-4 py-3 pr-12 rounded-xl glass border border-white/10 
                       resize-none focus:outline-none focus:ring-2 focus:ring-primary/50
                       text-foreground placeholder:text-gray-500
                       max-h-[200px] overflow-y-auto ${fontSizeClass}`}
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary/20 hover:bg-primary/30 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{input.length} characters</span>
        </div>
      </form>
    </div>
  );
}

