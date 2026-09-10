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

  it("Preserves full experience, skills, and education on unstructured plain-text resumes", async () => {
    const plainResume = `Shayne Zamora
Orange County, CA | (714) 625-2593 | shaynezamora@sbcglobal.net

Summary
Professional with 11+ years of software engineering leadership, architecting and scaling web applications.

Experience
Lead Software Architect at Enterprise Inc (2018 - Present)
• Led engineering team of 15 developers across 3 microservice squads
• Architected cloud-native distributed platform processing 10M+ daily events

Senior Software Engineer at Tech Start (2014 - 2018)
• Built core billing and monetization engine

Skills
TypeScript, React, Node.js, Next.js, PostgreSQL, AWS, Docker, Kubernetes

Education
B.S. in Computer Science, University of California (2014)
`;

    const state: AgentState = {
      rawResume: plainResume,
      rawJobDescription: sampleJob,
      preferences: DEFAULT_PREFERENCES,
      resumeAST: {
        summary: "Professional with 11+ years of software engineering leadership",
        experience: [],
        education: [],
        skills: { technical: [], soft: [] },
        sections: ["Summary", "Experience", "Skills", "Education"],
      },
      tailoredSummary: "Accomplished Software Architect with 11+ years leading high-growth teams and distributed cloud platforms.",
      tailoredBulletsByJob: [],
      baselineScore: 70,
      logs: [],
      errors: [],
    };

    const scored = await reassembleAndScoreNode(state);
    expect(scored.finalResumeText).toBeDefined();
    // Must preserve tailored summary
    expect(scored.finalResumeText).toContain("Accomplished Software Architect");
    // MUST preserve original Experience details
    expect(scored.finalResumeText).toContain("Lead Software Architect at Enterprise Inc");
    expect(scored.finalResumeText).toContain("processing 10M+ daily events");
    // MUST preserve original Skills
    expect(scored.finalResumeText).toContain("TypeScript, React, Node.js");
    // MUST preserve original Education
    expect(scored.finalResumeText).toContain("University of California");
  });

  it("Preserves all sections when resume is 100+ lines and sections are past line 50", async () => {
    const fillerLines = Array.from({ length: 60 }, (_, i) => `- Managed sprint backlog item #${i + 1} with cross-functional team`).join("\n");
    const longResume = `Jane Doe
New York, NY | jane@example.com | 555-987-6543

## Summary
Experienced software engineer with deep expertise in scalable cloud architectures.

## Experience
Staff Engineer - Cloud Scale Corp - 2019 - Present
${fillerLines}

## Skills
Go, Python, Rust, Kubernetes, Terraform, Distributed Systems

## Education
M.S. in Computer Science - Columbia University - 2018
`;

    const state: AgentState = {
      rawResume: longResume,
      rawJobDescription: "Looking for Go and Kubernetes expert",
      preferences: DEFAULT_PREFERENCES,
      resumeAST: {
        summary: "Experienced software engineer with deep expertise in scalable cloud architectures.",
        experience: [
          {
            title: "Staff Engineer",
            company: "Cloud Scale Corp",
            dates: "2019 - Present",
            description: fillerLines,
          },
        ],
        skills: { technical: ["Go", "Python", "Kubernetes"], soft: [] },
        education: [
          { degree: "M.S. in Computer Science", institution: "Columbia University", dates: "2018" },
        ],
        sections: ["Summary", "Experience", "Skills", "Education"],
      },
      tailoredSummary: "Staff Engineer specializing in Go, Kubernetes, and highly available distributed systems.",
      tailoredBulletsByJob: [fillerLines],
      baselineScore: 75,
      logs: [],
      errors: [],
    };

    const scored = await reassembleAndScoreNode(state);
    expect(scored.finalResumeText).toBeDefined();
    expect(scored.finalResumeText?.length).toBeGreaterThan(1500);
    expect(scored.finalResumeText).toContain("Go, Python, Rust, Kubernetes");
    expect(scored.finalResumeText).toContain("Columbia University");
    expect(scored.finalResumeText).toContain("Staff Engineer");
    expect(scored.finalResumeText).toContain("backlog item #59");
  });
});
