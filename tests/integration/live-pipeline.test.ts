/**
 * LIVE pipeline verification — exercises the REAL agent graph against REAL providers.
 *
 * This is deliberately NOT part of `npm test`: it makes real network calls to LLM
 * providers, so it is slow and non-deterministic. Every other agent test mocks the
 * model; this one exists to prove the wiring actually works end to end.
 *
 * Run explicitly:
 *   bash scripts/run-live-verify.sh
 * (which loads .env.local so the free-tier provider keys are present)
 */
import { describe, it, expect } from 'vitest';
import { buildResumeAgentGraph } from '@/app/agent/graph';
import { DEFAULT_PREFERENCES } from '@/app/types/tailoringPreferences';
import type { AgentState } from '@/app/agent/state';

const RESUME = `JORDAN AVERY
jordan.avery@example.com | (555) 010-2030 | Seattle, WA | github.com/jordanavery

SUMMARY
Software engineer with 6 years building web applications. Comfortable across the stack.

EXPERIENCE
Senior Software Engineer — Northwind Logistics (2022 - Present)
- Worked on the shipment tracking dashboard used by internal operations teams.
- Helped migrate some services to a containerised deployment on AWS.
- Reviewed code for two junior engineers and participated in sprint planning.

Software Engineer — Bluepeak Systems (2019 - 2022)
- Built customer-facing features in a React application.
- Wrote backend endpoints for the billing service.
- Fixed bugs reported by support.

SKILLS
JavaScript, TypeScript, React, Node.js, PostgreSQL, AWS, Docker, Git

EDUCATION
B.S. Computer Science — University of Washington (2019)`;

const JOB_DESCRIPTION = `Senior Full Stack Engineer — Platform Team

We are hiring a Senior Full Stack Engineer to own services end to end.

What you'll do
- Design, build and operate distributed services handling high request volume.
- Own reliability: define SLOs, instrument observability, lead incident response.
- Improve CI/CD pipelines and infrastructure-as-code (Terraform).
- Mentor engineers and drive technical design reviews.

What we're looking for
- 5+ years professional software engineering experience.
- Strong TypeScript and Node.js; production experience with React.
- Experience with AWS, containerisation (Docker, Kubernetes) and Infrastructure as Code.
- Track record of measurable impact: you can point to systems you designed and the results they produced.
- Experience with observability tooling (Datadog, OpenTelemetry) and performance optimisation.`;

describe('LIVE pipeline verification (real providers)', () => {
  it('runs the real agent graph and produces a tailored resume', async () => {
    const graph = buildResumeAgentGraph();

    const initialState = {
      rawResume: RESUME,
      rawJobDescription: JOB_DESCRIPTION,
      sessionId: 'live-verify-1',
      preferences: DEFAULT_PREFERENCES,
    } as unknown as AgentState;

    const started = Date.now();
    const out = (await graph.invoke(initialState)) as AgentState;
    const elapsedMs = Date.now() - started;

    const report = {
      elapsedMs,
      logs: out.logs ?? [],
      errors: out.errors ?? [],
      jobTitle: out.jobTitle ?? null,
      canonicalRole: out.canonicalRole ?? null,
      seniorityTier: out.seniorityTier ?? null,
      keywordResult: out.keywordResult
        ? {
            hasResult: true,
            missing: (out.keywordResult as { missingKeywords?: unknown }).missingKeywords ?? null,
          }
        : null,
      baselineScore: out.baselineScore ?? null,
      beforeScore: out.beforeScore ?? null,
      afterScore: out.afterScore ?? null,
      suggestions: out.suggestions?.length ?? 0,
      sectionGroups: out.sectionGroups?.length ?? 0,
      finalResumeChars: out.finalResumeText?.length ?? 0,
      finalResumePreview: (out.finalResumeText ?? '').slice(0, 600),
    };

    console.log('\n===== LIVE PIPELINE REPORT =====');
    console.log(JSON.stringify(report, null, 2));
    console.log('===== END REPORT =====\n');

    // Structural assertions only — content quality is judged by a human reading the report.
    expect(out).toBeTruthy();
    expect(out.errors ?? []).toHaveLength(0);
    expect((out.finalResumeText ?? '').length).toBeGreaterThan(200);
    expect(out.suggestions?.length ?? 0).toBeGreaterThan(0);
  }, 600_000);
});
