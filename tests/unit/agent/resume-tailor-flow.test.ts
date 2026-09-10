import { describe, it, expect } from "vitest";
import { intakeParserNode } from "@/app/agent/nodes/intakeParser";
import { bulletPlannerNode } from "@/app/agent/nodes/bulletPlanner";
import { reassembleAndScoreNode } from "@/app/agent/nodes/reassembleAndScore";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";

describe("Resume Tailor Agent Pipeline Flow", () => {
  const sampleResume = `# John Doe
john@example.com | 555-123-4567 | San Francisco, CA

## Summary
Software Engineer with 4 years of experience building web applications with React and Node.js.

## Experience
Senior Full Stack Engineer - Acme Tech - 2022 - Present
- Built and maintained React frontend applications with Redux.
- Designed RESTful backend services using Node.js and PostgreSQL.
- Improved CI/CD deployment pipeline efficiency by 25%.

Software Developer - Startup Labs - 2020 - 2022
- Developed responsive web interfaces.
- Collaborated with QA team to fix bugs.

## Skills
JavaScript, TypeScript, React, Node.js, PostgreSQL, Git

## Education
B.S. in Computer Science - State University - 2020
`;

  const sampleJob = `
We are looking for a Senior Full Stack Engineer.
Must have experience in:
- TypeScript and React
- Node.js and AWS Cloud Infrastructure
- Scalable Microservices
`;

  it("Step 1: intakeParser parses resume structure into structured AST", async () => {
    const initialState: AgentState = {
      rawResume: sampleResume,
      rawJobDescription: sampleJob,
      preferences: DEFAULT_PREFERENCES,
      logs: [],
      errors: [],
    };

    const parsedState = await intakeParserNode(initialState);
    expect(parsedState.resumeAST).toBeDefined();
    expect(parsedState.resumeAST?.experience.length).toBeGreaterThan(0);
    expect(parsedState.resumeAST?.skills.technical.length).toBeGreaterThan(0);
    expect(parsedState.resumeAST?.summary).toContain("Software Engineer");
  });

  it("Step 2: bulletPlanner plans targeted changes based on intensity", () => {
    const stateWithAST: AgentState = {
      rawResume: sampleResume,
      rawJobDescription: sampleJob,
      preferences: { ...DEFAULT_PREFERENCES, intensity: "targeted" },
      resumeAST: {
        summary: "Software Engineer with experience",
        experience: [
          {
            title: "Senior Full Stack Engineer",
            company: "Acme Tech",
            dates: "2022 - Present",
            description: "- Built React apps\n- Designed RESTful services",
          },
        ],
        skills: { technical: ["React", "Node.js"], soft: [] },
        education: [],
        sections: ["Summary", "Experience", "Skills"],
      },
      sortedMissingKeywords: ["AWS Cloud Infrastructure", "Microservices"],
      logs: [],
      errors: [],
    };

    const planned = bulletPlannerNode(stateWithAST);
    expect(planned.bulletPlan).toBeDefined();
    expect(planned.bulletPlan?.summaryChange).toBe(true);
    expect(planned.bulletPlan?.jobBulletChanges.length).toBeGreaterThan(0);
  });

  it("Step 3: reassembleAndScore rebuilds final markdown and calculates improvement", async () => {
    const tailoredState: AgentState = {
      rawResume: sampleResume,
      rawJobDescription: sampleJob,
      preferences: DEFAULT_PREFERENCES,
      resumeAST: {
        summary: "Software Engineer with experience",
        experience: [
          {
            title: "Senior Full Stack Engineer",
            company: "Acme Tech",
            dates: "2022 - Present",
            description: "- Built React apps\n- Designed RESTful services",
          },
        ],
        skills: { technical: ["React", "Node.js"], soft: [] },
        education: [],
        sections: ["Summary", "Experience", "Skills"],
      },
      tailoredSummary: "Senior Full Stack Engineer with expertise in AWS Cloud Infrastructure and Microservices.",
      tailoredBulletsByJob: [
        "- Built React apps leveraging AWS Cloud services\n- Architected scalable Microservices in Node.js",
      ],
      baselineScore: 65,
      logs: [],
      errors: [],
    };

    const scored = await reassembleAndScoreNode(tailoredState);
    expect(scored.finalResumeText).toBeDefined();
    expect(scored.finalResumeText).toContain("AWS Cloud Infrastructure");
    expect(scored.afterScore).toBeGreaterThanOrEqual(scored.beforeScore ?? 0);
    expect(scored.improvementMetrics?.scoreImprovement).toBeGreaterThanOrEqual(0);
  });
});
