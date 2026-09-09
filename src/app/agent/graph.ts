import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import type {
  AgentState,
  CandidateProfile,
  DiscoveredJob,
  BulletPlan,
  ImprovementMetrics,
} from "./state";
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import type { ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";
import type { JDInterpreterResult } from "@/app/utils/keyword-extraction";

import { intakeParserNode } from "./nodes/intakeParser";
import { candidateProfilerNode } from "./nodes/candidateProfiler";
import { jobDiscoveryNode } from "./nodes/jobDiscovery";
import { keywordAnalyzerNode } from "./nodes/keywordAnalyzer";
import { bulletPlannerNode } from "./nodes/bulletPlanner";
import { surgicalTailorNode } from "./nodes/surgicalTailor";
import { reassembleAndScoreNode } from "./nodes/reassembleAndScore";

// Define the State Annotation
export const AgentStateAnnotation = Annotation.Root({
  rawResume: Annotation<string>(),
  rawJobDescription: Annotation<string | undefined>(),
  sessionId: Annotation<string | undefined>(),
  userId: Annotation<string | undefined>(),
  parentResumeId: Annotation<string | undefined>(),
  preferences: Annotation<TailoringPreferences>(),
  modelKey: Annotation<string | undefined>(),
  sessionApiKeys: Annotation<Record<string, string> | undefined>(),

  resumeAST: Annotation<ParsedResumeForReassemble | undefined>(),
  candidateProfile: Annotation<CandidateProfile | undefined>(),
  selectedJobDescription: Annotation<string | undefined>(),
  discoveredJobs: Annotation<DiscoveredJob[] | undefined>(),
  companyResearch: Annotation<any>(),
  jobTitle: Annotation<string | undefined>(),

  keywordResult: Annotation<JDInterpreterResult | undefined>(),
  sortedMissingKeywords: Annotation<string[] | undefined>(),
  baselineScore: Annotation<number | undefined>(),

  bulletPlan: Annotation<BulletPlan | undefined>(),
  tailoredSummary: Annotation<string | undefined>(),
  tailoredBulletsByJob: Annotation<string[] | undefined>(),
  tailoredSkills: Annotation<string | undefined>(),

  finalResumeText: Annotation<string | undefined>(),
  beforeScore: Annotation<number | undefined>(),
  afterScore: Annotation<number | undefined>(),
  keywordGap: Annotation<{ foundInResume: string[]; missingKeywords: string[] } | undefined>(),
  improvementMetrics: Annotation<ImprovementMetrics | undefined>(),

  logs: Annotation<string[]>({
    reducer: (curr, update) => (update ? [...(curr || []), ...update] : curr || []),
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (curr, update) => (update ? [...(curr || []), ...update] : curr || []),
    default: () => [],
  }),
});

/**
 * Builds and compiles the LangGraph StateGraph for resume tailoring.
 */
export function buildResumeAgentGraph() {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("intakeParser", intakeParserNode)
    .addNode("candidateProfiler", candidateProfilerNode)
    .addNode("jobDiscovery", jobDiscoveryNode)
    .addNode("keywordAnalyzer", keywordAnalyzerNode)
    .addNode("bulletPlanner", bulletPlannerNode)
    .addNode("surgicalTailor", surgicalTailorNode)
    .addNode("reassembleAndScore", reassembleAndScoreNode)

    // Graph routing
    .addEdge(START, "intakeParser")
    .addEdge("intakeParser", "candidateProfiler")
    .addConditionalEdges("candidateProfiler", (state) => {
      // If user provided a detailed JD, go straight to keyword analysis; otherwise discover jobs
      if (state.rawJobDescription && state.rawJobDescription.trim().length > 30) {
        return "keywordAnalyzer";
      }
      return "jobDiscovery";
    })
    .addEdge("jobDiscovery", "keywordAnalyzer")
    .addEdge("keywordAnalyzer", "bulletPlanner")
    .addEdge("bulletPlanner", "surgicalTailor")
    .addEdge("surgicalTailor", "reassembleAndScore")
    .addEdge("reassembleAndScore", END);

  return workflow.compile();
}

/**
 * Convenience runner that executes the compiled agent graph with a timeout guard.
 */
export async function runResumeAgent(
  initialState: AgentState,
  onStep?: (stepName: string, message: string, progress: number) => void
): Promise<AgentState> {
  const app = buildResumeAgentGraph();

  // Initial event
  onStep?.("intakeParser", "Parsing resume structure...", 10);

  // Run graph with streamEvents or invoke
  const result = await app.invoke(initialState);
  return result as AgentState;
}
