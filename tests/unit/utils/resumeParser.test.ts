import { describe, it, expect } from "vitest";
import { parseResume, normalizeResumeText } from "@/app/utils/resumeParser";

describe("resumeParser - Deterministic Resume Chunker & Normalizer", () => {
  const userPastedResume = `Shayne Zamora Orange County, CA | (714) 625-2593 | shaynezamora@sbcglobal.net B.S Software Engineering | Chapman University | github:zamor122 Summary ● 11+ Years of Software Engineering Leadership : Architected and scaled high-availability web, mobile, and cloud applications serving 1,000,000+ global users across complex enterprise environments. ● 3+ Years of AI Architecture & Agentic Engineering : Pioneer in deploying production-grade AI-SDLC frameworks, Spec-Driven Development (SDD), and autonomous agent workflows using modern AI tools (Claude Code, Cursor, Codex). ● Full-Stack & GraphQL Expertise : 10+ years designing full-stack GraphQL architectures (resolvers, transformers, subscriptions) and microservices using TypeScript, JavaScript, Python (Django), PHP/Hack, React, Next.js, and React Native. ● Cloud Architecture & Database Mastery : 10+ years architecting resilient cloud infrastructure on AWS (plus GCP and Azure) across Relational (MySQL, Postgres, MSSQL) and NoSQL (DynamoDB, Redis, MongoDB, Firebase) data stores. ● Cross-Functional Team Building : 8+ years leading cross-functional engineering teams, optimizing Agile operations, and delivering 2x improvements in engineering output while reducing system downtime and defect rates. Ticketmaster | LiveNation Technical Manager— AI Innovation Pipeline (Sponsorship) | April 2026 – Present ○ AI-SDLC Framework & SDD Standardization : Authored and operationalized the company-wide AI-Software Development Life Cycle (AI-SDLC) framework and Spec-Driven Development (SDD) skills across Ticketmaster, doubling feature delivery throughput (2x) for initial adoption teams. ○ Enterprise Autonomous Code Review Agent : Architected the company's fi rst autonomous AI agent—an automated code reviewer deployed across 1,500+ repositories—saving over $1.26 per review and decreasing merged defect rates by 86%. ○ Autonomous Observability & Incident Prevention : Designed an intelligent observability agent that decreased overall production incidents by 78% and accelerated developer incident noti fi cations by up to 1.3 hours. ○ AI Bug Triage Automation : Developed an automated bug triage agent that recovered 2.5 weeks of engineering bandwidth and streamlined cross-functional issue resolution. ○ Engineering Leadership & Strategic Partnerships : Direct 2 engineering teams (14 total engineers), working closely with the Director of Software Engineering and collaborating with business, fi nancial, and design leaders to build strategic AI partner products and present bi-weekly enablement sessions to 200+ developers. ○ Executive Strategic Communication : Directly collaborate with C-level executives and upper management to present AI fi ndings, solutions, and proposals for organizational sign-off, de fi ning key metrics, system capabilities, fault analyses, and future product roadmaps. ○ Cross-Vertical AI Pipeline Strategy : Lead a brand new pipeline “Innovation” initiative spanning Concerts, Ticketmaster, and Sponsorship verticals; orchestrate cross-functional teams to gather requirements, manage project budgets and fi nancials, and integrate AI usage across diverse operational work fl ows. Noble AI Full Stack Engineer | February 2023 – April 2026 ○ Agentic AI & MCP Infrastructure : Architected Model Context Protocol (MCP) tool servers enabling LLM agents to execute structured semantic retrieval (RAG), powering dynamic SSR work fl ows and driving a 12% increase in customer retention. ○ Deterministic Tool & Safety Engineering : Designed schema-enforced Zod/Pydantic interfaces and structured fallback routing logic, ensuring deterministic tool invocation, mitigating prompt injection, and eliminating agent hallucinations. ○ AI Microservices & ML Infrastructure : Built scalable Python/Django microservices on ECS/EKS to consume LLM APIs, while optimizing PyTorch and TensorFlow model deployments via KServe on Kubernetes to ensure inference stability. ○ GraphQL Migration & System Architecture : Spearheaded the transition from REST to GraphQL (Graphene), establishing consistent domain modeling and structured data endpoints tailored for AI consumption. ○ Engineering Team Leadership : Led a team of 5 engineers to design AI tool interfaces, contributing to a major product release that expanded active users by 15%. Meta (contract) Software Engineer V | Oct 2022 – Jan 2023 ○ Enterprise React & Platform Architecture : Architected high-performance, reusable React UI components deployed globally across Facebook core surfaces. ○ Data Protection & i18n Infrastructure :Designed and implemented internationalization (i18n) Entity Framework components in Hack and GraphQL, enforcing strict data protection standards. ○ GraphQL & No-Code Platform Development : Engineered enterprise GraphQL API features and backend services, significantly enhancing maintainability and feature velocity for Meta's internal no-code platform. Helium 10 | Pacvue Lead Software Engineer | February 2019 – June 2022 ○ Engineering Leadership & Engagement Growth : Promoted from Senior to Lead Engineer; managed 5 engineers across bi-weekly Agile releases, driving a 120% increase in user engagement (via Segment analytics). ○ Full-Stack & Cloud Architecture : Owned end-to-end PHP/Laravel internal applications and engineered secure RESTful APIs (Laravel/Lumen) on AWS (ECS/EKS) serving 10,000+ active users. ○ CI/CD & Mobile Optimization : Built automated CI/CD pipelines using CircleCI and Fastlane for React Native (iOS/Android), slashing mobile deployment times by 60%. ○ Data Pipelines & Real-Time Syncing: Implemented webhook-driven ETL microservices for third-party integrations and combined AWS and Firebase services to optimize real-time data synchronization. 10 and 10 Solutions Inc. (contract) Lead Software Engineer | May 2017 — October 2022 ○ Cloud Cost Reduction & Serverless Architecture : Architected serverless B2B/B2C applications across AWS and Google Cloud, reducing operational infrastructure costs by 85%. ○ High-Volume Data Processing & GraphQL : Designed complex GraphQL schemas and created a custom S3 multipart file-upload algorithm handling files up to 10GB with minimal latency. ○ Greenfield AWS & API Engineering : Built greenfield AWS infrastructure (VPC, EC2, RDS, IAM) and developed PHP/Laravel REST APIs with Redis caching layers for high-concurrency frontend clients. ○ Cross-Functional Team & Agile Leadership : Managed a cross-functional team of 3 engineers and 2 business admins, mentoring junior developers and leading frontend delivery across React and React Native web/mobile platforms. Vendyr Inc. Software Engineer | Aug 2016 – February 2019 ○ Mobile Product Development : Developed a native iOS application in Swift connecting local businesses with consumers, reaching 1,000+ downloads. ○ Application Optimization & Defect Reduction : Refactored legacy web platforms and built PHP RESTful APIs, improving code maintainability and reducing production defect incidents by 20%.`;

  it("normalizes unformatted single-string resumes with circle bullets and glued job headers", () => {
    const normalized = normalizeResumeText(userPastedResume);

    // Should separate bullets onto their own lines
    expect(normalized).toContain("\n• 11+ Years of Software Engineering Leadership");
    expect(normalized).toContain("\n• AI-SDLC Framework & SDD Standardization");

    // Should separate job headers with date ranges onto their own lines
    expect(normalized).toContain("Ticketmaster");
    expect(normalized).toContain("Noble AI");
    expect(normalized).toContain("Meta (contract)");
    expect(normalized).toContain("Helium 10");
    expect(normalized).toContain("10 and 10 Solutions Inc.");
    expect(normalized).toContain("Vendyr Inc.");
  });

  it("deterministically parses all 6 individual job chunks and summary bullets from the resume", () => {
    const parsed = parseResume(userPastedResume);

    // 1. Summary: must have extracted the 5 summary bullets
    expect(parsed.summary).toBeDefined();
    expect(parsed.summary).toContain("11+ Years of Software Engineering Leadership");
    expect(parsed.summary).toContain("Cross-Functional Team Building");
    // Summary must not leak the entire document
    expect(parsed.summary).not.toContain("Vendyr Inc.");
    expect(parsed.summary).not.toContain("Helium 10");

    // 2. Experience: MUST deterministically identify all 6 jobs held by the individual
    expect(parsed.experience.length).toBe(6);

    // Job 1: Ticketmaster
    expect(parsed.experience[0].company).toContain("Ticketmaster");
    expect(parsed.experience[0].dates).toContain("April 2026 – Present");
    const job1Bullets = parsed.experience[0].description.split("\n");
    expect(job1Bullets.length).toBe(7);
    expect(job1Bullets[0]).toContain("AI-SDLC Framework & SDD Standardization");
    expect(job1Bullets[6]).toContain("Cross-Vertical AI Pipeline Strategy");

    // Job 2: Noble AI
    expect(parsed.experience[1].company).toContain("Noble AI");
    expect(parsed.experience[1].dates).toContain("February 2023 – April 2026");
    const job2Bullets = parsed.experience[1].description.split("\n");
    expect(job2Bullets.length).toBe(5);
    expect(job2Bullets[0]).toContain("Agentic AI & MCP Infrastructure");

    // Job 3: Meta
    expect(parsed.experience[2].company).toContain("Meta");
    expect(parsed.experience[2].dates).toContain("Oct 2022 – Jan 2023");
    const job3Bullets = parsed.experience[2].description.split("\n");
    expect(job3Bullets.length).toBe(3);

    // Job 4: Helium 10
    expect(parsed.experience[3].company).toContain("Helium 10");
    expect(parsed.experience[3].dates).toContain("February 2019 – June 2022");
    const job4Bullets = parsed.experience[3].description.split("\n");
    expect(job4Bullets.length).toBe(4);

    // Job 5: 10 and 10 Solutions
    expect(parsed.experience[4].company).toContain("10 and 10 Solutions");
    expect(parsed.experience[4].dates).toContain("May 2017 — October 2022");
    const job5Bullets = parsed.experience[4].description.split("\n");
    expect(job5Bullets.length).toBe(4);

    // Job 6: Vendyr
    expect(parsed.experience[5].company).toContain("Vendyr");
    expect(parsed.experience[5].dates).toContain("Aug 2016 – February 2019");
    const job6Bullets = parsed.experience[5].description.split("\n");
    expect(job6Bullets.length).toBe(2);
  });

  it("preserves standard markdown resumes with ## Experience and - bullets", () => {
    const standardResume = `# Jane Doe
jane@example.com | 555-123-4567 | San Francisco, CA

## Summary
Experienced engineer building high scale distributed systems.

## Experience
Acme Corp - Senior Engineer
Jan 2021 – Present
- Built fault-tolerant microservices in Go.
- Mentored junior engineers across 3 squads.

Beta Tech - Software Engineer
Jan 2019 – Dec 2020
- Developed React user interfaces.
- Managed PostgreSQL database.

## Education
B.S. Computer Science - University of California
2015 – 2019`;

    const parsed = parseResume(standardResume);
    expect(parsed.summary).toContain("Experienced engineer building high scale distributed systems");
    expect(parsed.experience.length).toBe(2);
    expect(parsed.experience[0].company).toContain("Acme Corp");
    expect(parsed.experience[0].dates).toContain("Jan 2021 – Present");
    expect(parsed.experience[1].company).toContain("Beta Tech");
  });

  it("@EARS-SUM-03 does not classify personal title, credentials, or header lines as summary when no summary header exists", () => {
    const resumeWithoutSummary = `Shayne Zamora
Senior Software Engineer & AI Architect | Distributed Systems
Orange County, CA | (714) 625-2593 | shaynezamora@sbcglobal.net
github:zamor122 | B.S. Software Engineering | Chapman University

## Experience
Acme Corp - Lead Engineer
Jan 2022 – Present
- Built high-throughput distributed microservices in Go.
- Led squad of 6 engineers across Agile releases.`;

    const parsed = parseResume(resumeWithoutSummary);
    // Must NOT extract the title or credentials as summary!
    expect(parsed.summary).toBeNull();
    expect(parsed.experience.length).toBe(1);
    expect(parsed.experience[0].company).toContain("Acme Corp");
  });
});
