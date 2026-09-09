import { bulletPlannerNode } from "@/app/agent/nodes/bulletPlanner";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";

describe("Bullet Planner Node", () => {
  const sampleState: AgentState = {
    rawResume: "Software Engineer with experience in React and Node.",
    preferences: DEFAULT_PREFERENCES,
    resumeAST: {
      summary: "Experienced Engineer",
      experience: [
        {
          title: "Senior Full Stack Engineer",
          company: "Acme Corp",
          dates: "2021 - Present",
          location: "San Francisco, CA",
          description: "- Built frontend UI\n- Developed backend APIs\n- Maintained database",
        },
        {
          title: "Software Engineer",
          company: "Beta Inc",
          dates: "2019 - 2021",
          location: "New York, NY",
          description: "- Handled bug fixes\n- Wrote unit tests",
        },
      ],
      education: [],
      skills: { technical: ["React", "TypeScript"], soft: [] },
      sections: ["Summary", "Experience", "Skills"],
    },
    sortedMissingKeywords: ["TypeScript", "Microservices", "Docker"],
    logs: [],
    errors: [],
  };

  test("minimal intensity selects at most 2 bullets across jobs and leaves summary intact", () => {
    const state: AgentState = {
      ...sampleState,
      preferences: { ...DEFAULT_PREFERENCES, intensity: "minimal" },
    };
    const result = bulletPlannerNode(state);
    expect(result.bulletPlan?.summaryChange).toBe(false);
    const totalBullets = (result.bulletPlan?.jobBulletChanges || []).reduce(
      (sum, c) => sum + (c.bulletIndices === "all" ? 99 : c.bulletIndices.length),
      0
    );
    expect(totalBullets).toBeLessThanOrEqual(2);
  });

  test("targeted intensity selects 3-5 bullets and updates summary", () => {
    const state: AgentState = {
      ...sampleState,
      preferences: { ...DEFAULT_PREFERENCES, intensity: "targeted" },
    };
    const result = bulletPlannerNode(state);
    expect(result.bulletPlan?.summaryChange).toBe(true);
    const totalBullets = (result.bulletPlan?.jobBulletChanges || []).reduce(
      (sum, c) => sum + (c.bulletIndices === "all" ? 99 : c.bulletIndices.length),
      0
    );
    expect(totalBullets).toBeGreaterThan(0);
    expect(totalBullets).toBeLessThanOrEqual(5);
  });

  test("overhaul intensity targets all bullets for every job entry", () => {
    const state: AgentState = {
      ...sampleState,
      preferences: { ...DEFAULT_PREFERENCES, intensity: "overhaul" },
    };
    const result = bulletPlannerNode(state);
    expect(result.bulletPlan?.summaryChange).toBe(true);
    expect(result.bulletPlan?.jobBulletChanges.length).toBe(2);
    expect(result.bulletPlan?.jobBulletChanges[0].bulletIndices).toBe("all");
    expect(result.bulletPlan?.jobBulletChanges[1].bulletIndices).toBe("all");
  });
});
