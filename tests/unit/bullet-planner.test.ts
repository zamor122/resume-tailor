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

  test("targeted intensity targets all bullets for every job entry with recency tiers and updates summary", () => {
    const state: AgentState = {
      ...sampleState,
      preferences: { ...DEFAULT_PREFERENCES, intensity: "targeted" },
    };
    const result = bulletPlannerNode(state);
    expect(result.bulletPlan?.summaryChange).toBe(true);
    expect(result.bulletPlan?.jobBulletChanges.length).toBe(2);
    expect(result.bulletPlan?.jobBulletChanges[0].bulletIndices).toBe("all");
    expect(result.bulletPlan?.jobBulletChanges[1].bulletIndices).toBe("all");
    expect(result.bulletPlan?.jobBulletChanges[0].recencyTier).toBe("recent_deep");
    expect(result.bulletPlan?.jobBulletChanges[1].recencyTier).toBe("recent_deep");
    expect(result.bulletPlan?.jobAudits?.[0].recencyTier).toBe("recent_deep");
    expect(result.bulletPlan?.jobAudits?.[1].recencyTier).toBe("recent_deep");
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

  test("processes all jobs with recency-graduated depth across any resume length (REQ-EVT-02, REQ-STA-01)", () => {
    const mockExp = [
      { company: "Alpha Health", description: "- Led ICU nursing team\n- Cut readmissions 12%" },
      { company: "Beta Clinic", description: "- Provided acute care\n- Mentored staff" },
      { company: "Gamma Center", description: "- Administered medication\n- Maintained charts" },
    ];
    const state: any = {
      preferences: { intensity: "targeted", sectionsToModify: { summary: true, experience: true, skills: true } },
      resumeAST: { experience: mockExp },
      sortedMissingKeywords: ["Compliance", "JCAHO", "Triage"],
    };

    const { bulletPlan } = bulletPlannerNode(state);
    expect(bulletPlan).toBeDefined();
    expect(bulletPlan?.jobBulletChanges.length).toBe(3); // Every job chunk is processed!
    expect(bulletPlan?.jobAudits?.[0].recencyTier).toBe("recent_deep");
    expect(bulletPlan?.jobAudits?.[1].recencyTier).toBe("recent_deep");
    expect(bulletPlan?.jobAudits?.[2].recencyTier).toBe("mid_career");
  });

  test("assigns foundational recency tier for jobs at index 4 and beyond", () => {
    const mockExp = [
      { company: "Job 0", description: "- Bullet 1" },
      { company: "Job 1", description: "- Bullet 2" },
      { company: "Job 2", description: "- Bullet 3" },
      { company: "Job 3", description: "- Bullet 4" },
      { company: "Job 4", description: "- Bullet 5" },
    ];
    const state: any = {
      preferences: { intensity: "targeted", sectionsToModify: { summary: true, experience: true, skills: true } },
      resumeAST: { experience: mockExp },
      sortedMissingKeywords: ["Keyword"],
    };

    const { bulletPlan } = bulletPlannerNode(state);
    expect(bulletPlan?.jobBulletChanges.length).toBe(5);
    expect(bulletPlan?.jobAudits?.[0].recencyTier).toBe("recent_deep");
    expect(bulletPlan?.jobAudits?.[1].recencyTier).toBe("recent_deep");
    expect(bulletPlan?.jobAudits?.[2].recencyTier).toBe("mid_career");
    expect(bulletPlan?.jobAudits?.[3].recencyTier).toBe("mid_career");
    expect(bulletPlan?.jobAudits?.[4].recencyTier).toBe("foundational");
  });
});
