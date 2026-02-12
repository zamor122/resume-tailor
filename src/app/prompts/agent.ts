/**
 * Agent planning prompts for the orchestration loop.
 */

import { AGENT_TOOLS } from "@/app/config/agent-tools";

const TOOL_DESCRIPTIONS = AGENT_TOOLS.map(
  (t) =>
    `- ${t.id}: ${t.description} (resume: ${t.requiresResume}, job: ${t.requiresJobDescription})`
).join("\n");

export function getAgentPlanningPrompt(
  intent: string,
  hasResume: boolean,
  hasJobDescription: boolean,
  executedSteps: string[],
  lastResult?: string
): string {
  const context = `
User intent: "${intent}"
Available: resume=${hasResume}, jobDescription=${hasJobDescription}
Already executed: ${executedSteps.length > 0 ? executedSteps.join(", ") : "none"}
${lastResult ? `\nLast tool result:\n${lastResult}\n` : ""}

Available tools:
${TOOL_DESCRIPTIONS}

Output ONLY valid JSON (no markdown, no extra text):
{
  "nextAction": "<tool_id from list above or 'done'>",
  "reason": "<brief reason>",
  "done": <true if task complete, false otherwise>
}

If the user's intent is satisfied, set "done": true and "nextAction": "done".
If you need more information, pick the next tool. Do not repeat a tool already executed.
`;

  return `You are a resume preparation assistant. Given the user's goal, decide the next action.

${context}`;
}

export function getAgentPlanningSystemPrompt(): string {
  return `You are a resume preparation assistant. You have access to tools. 
For each turn, output JSON with: nextAction (tool id or "done"), reason, done (boolean).
When the task is complete, set done: true and nextAction: "done".
Never output anything except valid JSON.`;
}
