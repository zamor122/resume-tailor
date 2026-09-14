"use client";

import React, { useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import CopyButton from "./CopyButton";
import ResumeDownloadButton from "./ResumeDownloadButton";
import ResumeSuggestionReviewer from "./ResumeSuggestionReviewer";
import { getProseFontSizeClass } from "@/app/utils/fontSize";
import { deduplicateResumeSections } from "@/app/utils/resumeSectionDedupe";
import { applySuggestionsToOriginal, deriveSuggestionsFromDiff, type ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";
import type { FormatSpec } from "@/app/types/format";
import type { ResumeSuggestion } from "@/app/types/humanize";
import type { ResumeSectionGroup } from "@/app/agent/state";

interface TailoredResumeOutputProps {
  newResume: string;
  originalResume?: string;
  suggestions?: ResumeSuggestion[];
  onSuggestionsChange?: (updatedSuggestions: ResumeSuggestion[]) => void;
  loading: boolean;
  detectedTitle?: string;
  error?: string;
  fontSize?: "small" | "medium" | "large";
  formatSpec?: FormatSpec | null;
  /** Show PDF / Markdown download buttons (MLA-style margins). */
  showDownload?: boolean;
  /** Job title for download filename. */
  downloadJobTitle?: string;
  /** Resume ID for analytics. */
  resumeId?: string;
  isUnlocked?: boolean;
  onUnlockRequest?: () => void;
  beforeScore?: number;
  matchScore?: number;
  activeSectionId?: string | null;
  onActiveSectionChange?: (id: string | null) => void;
  sectionGroups?: ResumeSectionGroup[];
  onSectionGroupsChange?: (groups: ResumeSectionGroup[]) => void;
  resumeAST?: ParsedResumeForReassemble;
}

function extractTextContent(children: React.ReactNode): string {
  if (!children) return "";
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join("");
  }
  if (typeof children === "object" && "props" in children && (children as any).props?.children) {
    return extractTextContent((children as any).props.children);
  }
  return "";
}

export interface DocumentSectionBlock {
  key: string;
  id?: string;
  sectionType: "header" | "summary" | "experience_header" | "experience" | "skills" | "other";
  title?: string;
  content: string;
}

function cleanHeadingText(text: string): string {
  return text.replace(/^#+\s*/, "").trim();
}

function getExperienceGroupId(
  expIndex: number,
  headingText: string,
  sectionGroups?: ResumeSectionGroup[]
): string {
  if (sectionGroups && sectionGroups.length > 0) {
    const cleanHeading = headingText.toLowerCase();

    // 1. Match by title / company name
    const byTitle = sectionGroups.find((g) => {
      if (g.sectionType !== "experience") return false;
      const cleanTitle = g.title.toLowerCase();
      const companyPart = g.title.split("–")[0]?.split("-")[0]?.trim().toLowerCase();
      return (
        cleanTitle.includes(cleanHeading) ||
        cleanHeading.includes(cleanTitle) ||
        (companyPart && companyPart.length >= 3 && cleanHeading.includes(companyPart))
      );
    });
    if (byTitle) return byTitle.id;

    // 2. Match by jobIndex
    const byJobIndex = sectionGroups.find(
      (g) => g.sectionType === "experience" && g.jobIndex === expIndex
    );
    if (byJobIndex) return byJobIndex.id;

    // 3. Match by order among experience groups
    const expGroups = sectionGroups.filter((g) => g.sectionType === "experience");
    if (expGroups[expIndex]) return expGroups[expIndex].id;
  }

  return `section-exp-${expIndex}`;
}

function getSummaryGroupId(sectionGroups?: ResumeSectionGroup[]): string {
  if (sectionGroups) {
    const summaryGroup = sectionGroups.find((g) => g.sectionType === "summary");
    if (summaryGroup) return summaryGroup.id;
  }
  return "section-summary";
}

function getSkillsGroupId(sectionGroups?: ResumeSectionGroup[]): string {
  if (sectionGroups) {
    const skillsGroup = sectionGroups.find((g) => g.sectionType === "skills");
    if (skillsGroup) return skillsGroup.id;
  }
  return "section-skills";
}

function isSectionActive(sectionId?: string, activeId?: string | null): boolean {
  if (!sectionId || !activeId) return false;
  const cleanActive = activeId.replace(/^#/, "").toLowerCase();
  const cleanSection = sectionId.replace(/^#/, "").toLowerCase();
  return cleanActive === cleanSection;
}

function parseDocumentSections(
  markdown: string,
  sectionGroups?: ResumeSectionGroup[]
): DocumentSectionBlock[] {
  if (!markdown || !markdown.trim()) return [];

  const lines = markdown.split("\n");
  const blocks: DocumentSectionBlock[] = [];

  let currentLines: string[] = [];
  let currentId: string | undefined = undefined;
  let currentType: DocumentSectionBlock["sectionType"] = "header";
  let currentTitle: string | undefined = undefined;

  let inExperienceSection = false;
  let expIndex = 0;

  const flushCurrent = () => {
    if (currentLines.length > 0) {
      const content = currentLines.join("\n");
      if (content.trim()) {
        blocks.push({
          key: `block-${blocks.length}-${currentId || currentType}`,
          id: currentId,
          sectionType: currentType,
          title: currentTitle,
          content,
        });
      }
      currentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for H2 headings (## ...)
    if (/^##\s+/.test(trimmed)) {
      const headingText = cleanHeadingText(trimmed);

      // Summary section
      if (/^(summary|professional summary|executive summary|profile|about|career summary)\b/i.test(headingText)) {
        flushCurrent();
        inExperienceSection = false;
        currentId = getSummaryGroupId(sectionGroups);
        currentType = "summary";
        currentTitle = headingText;
        currentLines.push(line);
        continue;
      }

      // Experience section
      if (/^(experience|work experience|professional experience|employment history|work history)\b/i.test(headingText)) {
        flushCurrent();
        inExperienceSection = true;

        // Check if there are any ### subsections under experience before the next ## heading
        let hasSubsections = false;
        for (let j = i + 1; j < lines.length; j++) {
          const ahead = lines[j].trim();
          if (/^##\s+/.test(ahead)) break;
          if (/^###\s+/.test(ahead)) {
            hasSubsections = true;
            break;
          }
        }

        if (hasSubsections) {
          // Render ## Experience heading as its own header block
          currentId = "section-experience";
          currentType = "experience_header";
          currentTitle = headingText;
          currentLines.push(line);
          flushCurrent();
          currentId = undefined;
          currentType = "experience";
          currentTitle = undefined;
        } else {
          // Entire experience is a single section block
          currentId = getExperienceGroupId(expIndex, headingText, sectionGroups);
          expIndex++;
          currentType = "experience";
          currentTitle = headingText;
          currentLines.push(line);
        }
        continue;
      }

      // Skills section
      if (/^(skills|technical skills|core competencies|proficiencies|technologies|areas of expertise)\b/i.test(headingText)) {
        flushCurrent();
        inExperienceSection = false;
        currentId = getSkillsGroupId(sectionGroups);
        currentType = "skills";
        currentTitle = headingText;
        currentLines.push(line);
        continue;
      }

      // Education section
      if (/^(education|academic background)\b/i.test(headingText)) {
        flushCurrent();
        inExperienceSection = false;
        currentId = "section-education";
        currentType = "other";
        currentTitle = headingText;
        currentLines.push(line);
        continue;
      }

      // Any other H2 section (Projects, Certifications, etc.)
      flushCurrent();
      inExperienceSection = false;
      const slug = headingText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      currentId = `section-${slug}`;
      currentType = "other";
      currentTitle = headingText;
      currentLines.push(line);
      continue;
    }

    // Check for H3 headings (### ...)
    if (/^###\s+/.test(trimmed)) {
      const headingText = cleanHeadingText(trimmed);

      // If in experience section or we're not in another known section (like education, skills, summary)
      if (
        inExperienceSection ||
        currentType === "header" ||
        currentType === "experience"
      ) {
        flushCurrent();
        inExperienceSection = true;
        currentId = getExperienceGroupId(expIndex, headingText, sectionGroups);
        expIndex++;
        currentType = "experience";
        currentTitle = headingText;
        currentLines.push(line);
        continue;
      }
    }

    // Regular line: append to current block
    currentLines.push(line);
  }

  flushCurrent();
  return blocks;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({
  newResume,
  originalResume,
  suggestions = [],
  onSuggestionsChange,
  loading,
  error,
  fontSize = "medium",
  formatSpec = null,
  showDownload = false,
  downloadJobTitle,
  resumeId,
  isUnlocked = true,
  onUnlockRequest,
  beforeScore = 50,
  matchScore = 85,
  activeSectionId,
  onActiveSectionChange,
  sectionGroups,
  onSectionGroupsChange,
  resumeAST,
}) => {
  const [internalSuggestions, setInternalSuggestions] = useState<ResumeSuggestion[]>(suggestions || []);

  const [internalActiveSectionId, setInternalActiveSectionId] = useState<string | null>(
    activeSectionId ?? null
  );

  useEffect(() => {
    if (activeSectionId !== undefined) {
      setInternalActiveSectionId(activeSectionId);
    }
  }, [activeSectionId]);

  const effectiveActiveSectionId =
    activeSectionId !== undefined ? activeSectionId : internalActiveSectionId;

  const handleActiveSectionChange = (id: string | null) => {
    if (activeSectionId === undefined) {
      setInternalActiveSectionId(id);
    }
    onActiveSectionChange?.(id);
  };

  useEffect(() => {
    if (!effectiveActiveSectionId) return;
    const cleanId = effectiveActiveSectionId.replace(/^#/, "");
    const targetElement =
      document.getElementById(cleanId) ||
      document.querySelector(`[data-section-id="${cleanId}"]`) ||
      document.querySelector(`[data-section-id="#${cleanId}"]`);

    if (targetElement && typeof targetElement.scrollIntoView === "function") {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [effectiveActiveSectionId]);

  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setInternalSuggestions(suggestions);
    } else if (originalResume && newResume && originalResume.trim() !== newResume.trim()) {
      setInternalSuggestions(deriveSuggestionsFromDiff(originalResume, newResume));
    }
  }, [suggestions, originalResume, newResume]);

  const effectiveSuggestions = internalSuggestions;
  const hasSuggestions = effectiveSuggestions && effectiveSuggestions.length > 0;
  const [viewLayout, setViewLayout] = useState<"cockpit" | "document">("cockpit");
  const [userToggledLayout, setUserToggledLayout] = useState(false);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    effectiveSuggestions?.[0]?.id ?? null
  );

  React.useEffect(() => {
    if (hasSuggestions && !activeSuggestionId) {
      setActiveSuggestionId(effectiveSuggestions[0].id);
    }
  }, [hasSuggestions, effectiveSuggestions, activeSuggestionId]);

  React.useEffect(() => {
    if (hasSuggestions && !userToggledLayout) {
      setViewLayout("cockpit");
    }
  }, [hasSuggestions, userToggledLayout]);

  const handleSuggestionsUpdate = (updated: ResumeSuggestion[]) => {
    setInternalSuggestions(updated);
    onSuggestionsChange?.(updated);
  };

  // Compute live active resume text from suggestions if available
  const activeResumeText = useMemo(() => {
    if (originalResume && hasSuggestions) {
      return applySuggestionsToOriginal(originalResume, effectiveSuggestions);
    }
    return newResume;
  }, [originalResume, effectiveSuggestions, hasSuggestions, newResume]);

  const displayResume = useMemo(() => {
    const deduped = deduplicateResumeSections(activeResumeText);
    // Ensure every line has proper markdown newline formatting so it never collapses into a single paragraph
    return deduped
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (/^[-*•–—]\s+/.test(trimmed)) {
          return `- ${trimmed.replace(/^[-*•–—]\s+/, "")}`;
        }
        if (
          /^(Summary|Experience|Skills|Education|Projects|Certifications|Awards)\b/i.test(trimmed) &&
          trimmed.split(/\s+/).length <= 4 &&
          !trimmed.startsWith("#")
        ) {
          return `\n## ${trimmed}\n`;
        }
        return line;
      })
      .join("\n\n");
  }, [activeResumeText]);

  const documentSections = useMemo(() => {
    return parseDocumentSections(displayResume, sectionGroups);
  }, [displayResume, sectionGroups]);

  const proseFontSizeClass = getProseFontSizeClass(fontSize);
  const formatStyles = formatSpec ? {
    fontFamily: formatSpec.fontFamily,
    fontSize: `${formatSpec.fontSize.base}pt`,
    lineHeight: formatSpec.lineHeight,
    padding: `${formatSpec.margins.top}px ${formatSpec.margins.right}px ${formatSpec.margins.bottom}px ${formatSpec.margins.left}px`,
  } : undefined;

  const findMatchingSuggestion = (text: string) => {
    if (!text || !hasSuggestions) return null;
    const clean = text.replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();
    if (clean.length < 5) return null;

    for (let i = 0; i < effectiveSuggestions.length; i++) {
      const s = effectiveSuggestions[i];
      const origClean = (s.originalText || "").replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();
      const suggClean = (s.suggestedText || "").replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();

      const matchesOrig = origClean && (clean.includes(origClean) || origClean.includes(clean) || (origClean.length > 20 && clean.slice(0, 25) === origClean.slice(0, 25)));
      const matchesSugg = suggClean && (clean.includes(suggClean) || suggClean.includes(clean) || (suggClean.length > 20 && clean.slice(0, 25) === suggClean.slice(0, 25)));

      if (matchesOrig || matchesSugg) {
        return { suggestion: s, index: i };
      }
    }
    return null;
  };

  if (error) {
    return (
      <div className="mb-4 p-4 bg-pink-50 dark:bg-red-900/20 text-pink-600 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="resume-output-container">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-7 bg-emerald-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-7 w-12 bg-emerald-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Common Markdown components with active change highlighting
  const getMarkdownComponents = (isSplit: boolean) => ({
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 text-center !mt-0 !mb-2 tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400 border-b-2 border-cyan-500/30 dark:border-cyan-500/20 !mt-6 !mb-2.5 pb-1">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 !mt-3 !mb-1">
        {children}
      </h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => {
      const rawText = extractTextContent(children);
      const match = isSplit ? findMatchingSuggestion(rawText) : null;
      const isActive = match && match.suggestion.id === activeSuggestionId;
      const isAccepted = match ? match.suggestion.status !== "rejected" : false;

      if (match && isSplit) {
        return (
          <div
            onClick={() => setActiveSuggestionId(match.suggestion.id)}
            className={`my-2 p-3 rounded-xl transition-all duration-300 cursor-pointer ${
              isActive
                ? "ring-2 ring-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/40 shadow-md"
                : "hover:bg-cyan-500/5 border border-transparent rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                {isActive && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />}
                Change {match.index + 1} ({match.suggestion.section})
              </span>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = effectiveSuggestions.map((s) =>
                      s.id === match.suggestion.id ? { ...s, status: "accepted" as const } : s
                    );
                    handleSuggestionsUpdate(updated);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    isAccepted
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                  }`}
                >
                  ✓ Accept
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = effectiveSuggestions.map((s) =>
                      s.id === match.suggestion.id ? { ...s, status: "rejected" as const } : s
                    );
                    handleSuggestionsUpdate(updated);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    !isAccepted
                      ? "bg-gray-700 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  ✕ Keep Original
                </button>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 !my-0 whitespace-pre-line font-medium">
              {children}
            </p>
          </div>
        );
      }

      return (
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 !my-1.5 whitespace-pre-line">
          {children}
        </p>
      );
    },
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc !pl-5 space-y-2 !my-2.5 text-sm text-gray-700 dark:text-gray-300">
        {children}
      </ul>
    ),
    li: ({ children }: { children?: React.ReactNode }) => {
      const rawText = extractTextContent(children);
      const match = isSplit ? findMatchingSuggestion(rawText) : null;
      const isActive = match && match.suggestion.id === activeSuggestionId;
      const isAccepted = match ? match.suggestion.status !== "rejected" : false;

      if (match && isSplit) {
        return (
          <li
            onClick={() => setActiveSuggestionId(match.suggestion.id)}
            className={`leading-relaxed pl-0.5 transition-all duration-300 cursor-pointer list-none -ml-5 my-1.5 p-2.5 rounded-xl ${
              isActive
                ? "ring-2 ring-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/50 shadow-md font-medium text-gray-900 dark:text-white"
                : "hover:bg-cyan-500/5 border border-transparent rounded-lg text-gray-700 dark:text-gray-300"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                {isActive && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />}
                Change {match.index + 1}
              </span>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = effectiveSuggestions.map((s) =>
                      s.id === match.suggestion.id ? { ...s, status: "accepted" as const } : s
                    );
                    handleSuggestionsUpdate(updated);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    isAccepted
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                  }`}
                >
                  ✓ Accept
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = effectiveSuggestions.map((s) =>
                      s.id === match.suggestion.id ? { ...s, status: "rejected" as const } : s
                    );
                    handleSuggestionsUpdate(updated);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    !isAccepted
                      ? "bg-gray-700 text-white shadow-xs"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  ✕ Keep Original
                </button>
              </div>
            </div>
            <div>• {children}</div>
          </li>
        );
      }

      return (
        <li className="leading-relaxed pl-0.5">
          {children}
        </li>
      );
    },
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100">
        {children}
      </strong>
    ),
  });

  const renderMarkdownCanvas = (isSplit = false) => (
    <div
      className={`prose prose-emerald dark:prose-invert max-w-none resume-prose ${proseFontSizeClass} pb-4`}
      style={formatStyles}
      data-format-spec={formatSpec ? JSON.stringify(formatSpec) : undefined}
    >
      {documentSections.map((section, idx) => {
        const isActive = isSectionActive(section.id, effectiveActiveSectionId);
        const hasId = Boolean(section.id);
        const sectionClassName = hasId
          ? isActive
            ? "border-l-4 border-cyan-500 pl-3 bg-cyan-500/10 dark:bg-cyan-950/20 rounded-r-xl transition-all duration-300 my-2 cursor-pointer"
            : "border-l-4 border-transparent pl-3 transition-all duration-300 rounded-r-xl my-2 cursor-pointer hover:bg-cyan-500/5"
          : "my-2";

        return (
          <div
            key={section.key || `${section.id || "sec"}-${idx}`}
            id={section.id}
            data-section-id={section.id}
            onClick={() => {
              if (section.id) {
                handleActiveSectionChange(section.id);
              }
            }}
            className={sectionClassName}
          >
            <ReactMarkdown components={getMarkdownComponents(isSplit)}>
              {section.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="resume-output-container bg-white/90 dark:bg-gray-900/95 backdrop-blur-lg transition-all duration-300 rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200/80 dark:border-gray-800">
      {/* Top Header & Layout Controls */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Tailored Resume
          </h2>
          {hasSuggestions && (
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setUserToggledLayout(true);
                  setViewLayout("cockpit");
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewLayout === "cockpit"
                    ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                ⚡ Review Cockpit ({effectiveSuggestions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserToggledLayout(true);
                  setViewLayout("document");
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewLayout === "document"
                    ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                📄 Full Document
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showDownload && (
            <ResumeDownloadButton
              markdownContent={displayResume}
              jobTitle={downloadJobTitle}
              variant="buttons"
              resumeId={resumeId}
              source="resume_detail"
              section="output"
            />
          )}
          <CopyButton text={displayResume} resumeId={resumeId} source="resume_detail" section="output" />
        </div>
      </div>

      {/* VIEW MODE 1: SIDE-BY-SIDE REVIEW COCKPIT */}
      {viewLayout === "cockpit" && hasSuggestions ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Reviewer Panel (Sticky on desktop) */}
          <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-20">
            <ResumeSuggestionReviewer
              originalResume={originalResume || displayResume}
              suggestions={effectiveSuggestions}
              onSuggestionsChange={handleSuggestionsUpdate}
              isUnlocked={isUnlocked}
              onUnlockRequest={onUnlockRequest}
              beforeScore={beforeScore}
              matchScore={matchScore}
              activeSuggestionId={activeSuggestionId}
              onActiveSuggestionChange={setActiveSuggestionId}
              sectionGroups={sectionGroups}
              onSectionGroupsChange={onSectionGroupsChange}
              activeSectionId={effectiveActiveSectionId}
              onActiveSectionChange={handleActiveSectionChange}
              resumeAST={resumeAST}
            />
          </div>

          {/* Right Live Resume Canvas */}
          <div className="xl:col-span-7 bg-gray-50/70 dark:bg-gray-950/70 p-4 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                <span>📄 Live Document Preview</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  Interactive
                </span>
              </span>
              <span className="text-[11px] text-gray-500">
                Click any highlighted bullet to inspect
              </span>
            </div>
            {renderMarkdownCanvas(true)}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: FULL DOCUMENT VIEW */
        <div className="bg-white dark:bg-gray-950 p-6 sm:p-8 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
          {renderMarkdownCanvas(false)}
        </div>
      )}
    </div>
  );
};

export default TailoredResumeOutput;
