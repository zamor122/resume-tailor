import { describe, it, expect } from "vitest";
import { bulletPlannerNode } from "@/app/agent/nodes/bulletPlanner";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";

describe("bulletPlannerNode - Job Audits", () => {
  const threeJobState: AgentState = {
    rawResume: "Resume text",
    preferences: { ...DEFAULT_PREFERENCES, intensity: "minimal" },
    resumeAST: {
      summary: "Experienced Engineer",
      experience: [
        {
          title: "Senior Engineer",
          company: "Company A",
          dates: "2022 - Present",
          location: "Remote",
          description: "- Handled backend architecture\n- Led database migration",
        },
        {
          title: "Software Engineer II",
          company: "Company B",
          dates: "2020 - 2022",
          location: "San Francisco, CA",
          description: "- Wrote microservices with Kubernetes and GraphQL\n- Managed Kubernetes and GraphQL CI/CD",
        },
        {
          title: "Junior Developer",
          company: "Company C",
          dates: "2018 - 2020",
          location: "Austin, TX",
          description: "- Fixed Kubernetes and GraphQL bugs\n- Wrote Kubernetes and GraphQL tests",
        },
      ],
      education: [],
      skills: { technical: ["Go", "Docker"], soft: [] },
      sections: ["Summary", "Experience", "Skills"],
    },
    sortedMissingKeywords: ["Kubernetes", "GraphQL"],
    logs: [],
    errors: [],
  };

  it("produces jobAudits for every job entry in experience", () => {
    const result = bulletPlannerNode(threeJobState);
    const audits = result.bulletPlan?.jobAudits;

    expect(audits).toBeDefined();
    expect(audits).toHaveLength(3);
  });

  it("records hasChanges: true and rationale for jobs targeted for changes", () => {
    const result = bulletPlannerNode(threeJobState);
    const audits = result.bulletPlan?.jobAudits;

    const job0Audit = audits?.find((a) => a.jobIndex === 0);
    expect(job0Audit).toBeDefined();
    expect(job0Audit?.hasChanges).toBe(true);
    expect(job0Audit?.bulletIndices).toBeDefined();
    expect(job0Audit?.auditRationale).toBeTruthy();
  });

  it("assigns appropriate preservation rationale for untouched intermediate jobs vs earliest tenure", () => {
    const result = bulletPlannerNode(threeJobState);
    const audits = result.bulletPlan?.jobAudits;

    const job1Audit = audits?.find((a) => a.jobIndex === 1);
    const job2Audit = audits?.find((a) => a.jobIndex === 2);

    expect(job1Audit).toBeDefined();
    expect(job1Audit?.hasChanges).toBe(false);
    expect(job1Audit?.bulletIndices).toEqual([]);
    expect(job1Audit?.auditRationale).toBe(
      "Role already satisfies target profile baseline; preserved as-is"
    );

    expect(job2Audit).toBeDefined();
    expect(job2Audit?.hasChanges).toBe(false);
    expect(job2Audit?.bulletIndices).toEqual([]);
    expect(job2Audit?.auditRationale).toBe(
      "Foundational early tenure preserved to maintain genuine career history"
    );
  });

  it("marks all jobs as changed in overhaul mode", () => {
    const state: AgentState = {
      ...threeJobState,
      preferences: { ...DEFAULT_PREFERENCES, intensity: "overhaul" },
    };

    const result = bulletPlannerNode(state);
    const audits = result.bulletPlan?.jobAudits;

    expect(audits).toHaveLength(3);
    audits?.forEach((audit, idx) => {
      expect(audit.jobIndex).toBe(idx);
      expect(audit.hasChanges).toBe(true);
      expect(audit.bulletIndices).toBe("all");
      expect(audit.auditRationale).toBe("complete overhaul mode");
    });
  });

  it("handles empty experience gracefully", () => {
    const state: AgentState = {
      ...threeJobState,
      resumeAST: {
        ...threeJobState.resumeAST!,
        experience: [],
      },
    };

    const result = bulletPlannerNode(state);
    expect(result.bulletPlan?.jobAudits).toEqual([]);
  });

  it("@EARS-EVT-02 sets summaryChange to false when resumeAST has no summary even if sectionsToModify.summary is true", () => {
    const stateWithoutSummary: AgentState = {
      ...threeJobState,
      preferences: {
        ...DEFAULT_PREFERENCES,
        intensity: "targeted",
        sectionsToModify: { summary: true, experience: true, skills: true },
      },
      resumeAST: {
        ...threeJobState.resumeAST!,
        summary: null,
      },
    };

    const result = bulletPlannerNode(stateWithoutSummary);
    expect(result.bulletPlan?.summaryChange).toBe(false);
  });

  it("@EARS-EVT-01 sets summaryChange to true when resumeAST has summary and sectionsToModify.summary is true", () => {
    const stateWithSummary: AgentState = {
      ...threeJobState,
      preferences: {
        ...DEFAULT_PREFERENCES,
        intensity: "targeted",
        sectionsToModify: { summary: true, experience: true, skills: true },
      },
      resumeAST: {
        ...threeJobState.resumeAST!,
        summary: "Senior software engineer with 10 years experience",
      },
    };

    const result = bulletPlannerNode(stateWithSummary);
    expect(result.bulletPlan?.summaryChange).toBe(true);
  });
});
