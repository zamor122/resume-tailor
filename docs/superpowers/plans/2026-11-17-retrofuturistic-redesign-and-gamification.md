# Retrofuturistic Soft Neo-Brutalist Redesign & Gamification Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the entire AI Resume Tailor web platform into a warm, broadly-appealing Retrofuturistic Soft Neo-Brutalist experience with TailorBot MK-II as the new mascot and favicon, Web Audio SFX, addictive gamification loops (streaks, XP, quests), and prominent conversion CTAs across all blog posts.

**Architecture:** A centralized design system layer (`globals.css`, `src/app/components/neo/*`) replaces legacy glassmorphic styles with warm retro-tech hardware primitives (`#FAF7F0` canvas, `#1C2028` slate borders, `#FF5722` safety orange). A lightweight `GamificationContext` manages daily streaks and XP progression in `localStorage`, while a zero-dependency Web Audio API synthesizer drives tactile micro-interactions and audio feedback. All pages, modals, and blog posts are re-themed to match this unified aesthetic.

**Tech Stack:** Next.js 16 (Turbopack, App Router), React 19, Tailwind CSS, Web Audio API, Vitest / React Testing Library, Canvas Confetti.

**Spec:** [`docs/superpowers/specs/2026-11-17-soft-neobrutalism-gamification-design.md`](file:///Users/shaynezamora/Documents/resume-tailor/docs/superpowers/specs/2026-11-17-soft-neobrutalism-gamification-design.md)

## Global Constraints
- **$0 Out-of-Pocket Spend:** Zero external paid assets, fonts, or sound libraries; all audio generated via native Web Audio API oscillators, all icons/mascots rendered via pure SVG.
- **Preserve Existing Backend & Monetization:** Never break the ClinePass open-weight model integration, Supabase RLS, or Stripe checkout session flow ($9 Sprint Pass, $19 Pro Week, with UTM attribution).
- **100% Test Integrity:** All 710 existing tests must continue to pass throughout and after implementation (`npm test`).
- **Broad Accessibility & Universal Appeal:** WCAG AAA high contrast ratio on all text, warm inviting retro-tech aesthetic without intimidating terminal clutter.

---

### Task 1: TailorBot MK-II Mascot Component & App Favicon

**Files:**
- Create: `src/app/icon.svg`
- Create: `public/favicon.svg`
- Create: `src/app/components/neo/TailorBot.tsx`
- Test: `tests/unit/components/neo/TailorBot.test.tsx`

**Interfaces:**
- Consumes: None
- Produces: `<TailorBot state="idle" | "scanning" | "celebrating" onPoke={() => void} size={number} />`

- [ ] **Step 1: Write failing unit test for `TailorBot`**

```tsx
// tests/unit/components/neo/TailorBot.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TailorBot from "@/app/components/neo/TailorBot";

describe("TailorBot Component", () => {
  it("renders SVG mascot with accessible label", () => {
    render(<TailorBot state="idle" />);
    expect(screen.getByLabelText(/TailorBot MK-II Mascot/i)).toBeInTheDocument();
  });

  it("handles poke interaction click", () => {
    const onPoke = vi.fn();
    render(<TailorBot state="idle" onPoke={onPoke} />);
    const bot = screen.getByRole("button", { name: /Poke TailorBot/i });
    fireEvent.click(bot);
    expect(onPoke).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/neo/TailorBot.test.tsx`
Expected: FAIL (Cannot find module `@/app/components/neo/TailorBot`)

- [ ] **Step 3: Implement `TailorBot.tsx`, `src/app/icon.svg`, and `public/favicon.svg`**

Implement the interactive TailorBot SVG component with CRT monitor chassis, blinking eyes, tuning knob, and beacon antenna. Save the standalone SVG version to `src/app/icon.svg` and `public/favicon.svg`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/neo/TailorBot.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/icon.svg public/favicon.svg src/app/components/neo/TailorBot.tsx tests/unit/components/neo/TailorBot.test.tsx
git commit -m "feat(mascot): add TailorBot MK-II mascot component and app favicon"
```

---

### Task 2: Retrofuturistic Design Tokens & Web Audio SFX Synthesizer

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/app/utils/audioSfx.ts`
- Test: `tests/unit/utils/audioSfx.test.ts`

**Interfaces:**
- Consumes: Web Audio API
- Produces: `playAudioSfx(type: 'click' | 'boop' | 'success' | 'alert', enabled?: boolean): void`

- [ ] **Step 1: Write failing unit test for `audioSfx.ts`**

```ts
// tests/unit/utils/audioSfx.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { playAudioSfx } from "@/app/utils/audioSfx";

describe("audioSfx utility", () => {
  it("does not throw when audio is disabled", () => {
    expect(() => playAudioSfx("click", false)).not.toThrow();
  });

  it("safely handles environments where AudioContext is undefined", () => {
    expect(() => playAudioSfx("success", true)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/audioSfx.test.ts`
Expected: FAIL (Cannot find module `@/app/utils/audioSfx`)

- [ ] **Step 3: Implement `audioSfx.ts` and update `globals.css`**

Implement `playAudioSfx` using native oscillators (sine/triangle waves for mechanical clicks, boops, and success chords). In `src/app/globals.css`, add the warm canvas background (`#FAF7F0`), engineering dot grid pattern, and `.neo-box`, `.neo-btn`, `.neo-tag` utility classes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/audioSfx.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/utils/audioSfx.ts tests/unit/utils/audioSfx.test.ts
git commit -m "feat(design): configure warm retrofuturistic design tokens and web audio synthesizer"
```

---

### Task 3: Gamification State & Quest Engine

**Files:**
- Create: `src/app/types/gamification.ts`
- Create: `src/app/contexts/GamificationContext.tsx`
- Test: `tests/unit/contexts/GamificationContext.test.tsx`

**Interfaces:**
- Consumes: `localStorage`
- Produces: `<GamificationProvider>`, `useGamification()`: `{ xp, level, streak, awardXp, completeQuest, sfxEnabled, toggleSfx }`

- [ ] **Step 1: Write failing unit test for `GamificationContext`**

```tsx
// tests/unit/contexts/GamificationContext.test.tsx
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { GamificationProvider, useGamification } from "@/app/contexts/GamificationContext";
import React from "react";

describe("GamificationContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with default state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GamificationProvider>{children}</GamificationProvider>
    );
    const { result } = renderHook(() => useGamification(), { wrapper });
    expect(result.current.streak).toBeGreaterThanOrEqual(1);
    expect(result.current.xp).toBeGreaterThanOrEqual(0);
  });

  it("awards XP and calculates level up", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GamificationProvider>{children}</GamificationProvider>
    );
    const { result } = renderHook(() => useGamification(), { wrapper });
    act(() => {
      result.current.awardXp(600);
    });
    expect(result.current.xp).toBe(600);
    expect(result.current.level).toBe(3); // Level 3 >= 500 XP
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/contexts/GamificationContext.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `src/app/types/gamification.ts` and `src/app/contexts/GamificationContext.tsx`**

Implement streak tracking against `lastActiveDate`, level calculations, quest progress tracking, and persistence to `localStorage`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/contexts/GamificationContext.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/types/gamification.ts src/app/contexts/GamificationContext.tsx tests/unit/contexts/GamificationContext.test.tsx
git commit -m "feat(gamification): implement gamification context, streak engine, and xp levels"
```

---

### Task 4: Retrofuturistic Component Primitives (`NeoButton`, `NeoCard`, `NeoBadge`, `NeoGauge`)

**Files:**
- Create: `src/app/components/neo/NeoButton.tsx`
- Create: `src/app/components/neo/NeoCard.tsx`
- Create: `src/app/components/neo/NeoBadge.tsx`
- Create: `src/app/components/neo/NeoGauge.tsx`
- Test: `tests/unit/components/neo/NeoComponents.test.tsx`

**Interfaces:**
- Consumes: `useGamification()` (for audio SFX triggering on button click)
- Produces: Reusable UI primitives with hardware bezels and tactile states.

- [ ] **Step 1: Write failing test for Neo components**

```tsx
// tests/unit/components/neo/NeoComponents.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NeoButton from "@/app/components/neo/NeoButton";
import NeoGauge from "@/app/components/neo/NeoGauge";

describe("Neo Primitives", () => {
  it("renders NeoButton with tactile classes and handles click", () => {
    const onClick = vi.fn();
    render(<NeoButton variant="orange" onClick={onClick}>Activate</NeoButton>);
    const btn = screen.getByRole("button", { name: /Activate/i });
    expect(btn).toHaveClass("neo-btn");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  it("renders NeoGauge with numeric score and label", () => {
    render(<NeoGauge score={94} label="Recruiter Ready" />);
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getByText("Recruiter Ready")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/neo/NeoComponents.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `NeoButton`, `NeoCard`, `NeoBadge`, and `NeoGauge`**

Build the primitives using Tailwind and the design tokens from Task 2.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/neo/NeoComponents.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/neo/ tests/unit/components/neo/NeoComponents.test.tsx
git commit -m "feat(ui): add retrofuturistic neo component primitives"
```

---

### Task 5: Global Layout, Navigation & Footer Transformation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/components/Navigation.tsx`
- Modify: `src/app/components/Footer.tsx`
- Test: `tests/unit/components/Navigation.test.tsx` (or existing navigation test)

**Interfaces:**
- Consumes: `<GamificationProvider>`, `useGamification()`
- Produces: Header HUD with live streak badge, XP badge, SFX mute toggle, and TailorBot brand icon.

- [ ] **Step 1: Update `Navigation.tsx` and `layout.tsx`**

Wrap `RootLayout` in `<GamificationProvider>`. In `Navigation.tsx`, replace the glass navigation with the warm hardware console nav bar featuring the TailorBot logo, daily mission streak pill (`🔥 3 Day Mission`), XP counter (`⚡ 350 XP`), SFX toggle button, and Sign In button.

- [ ] **Step 2: Update `Footer.tsx`**

Restyle `Footer.tsx` with clean warm retro-tech styling, copyright, mission statement, and links to `/blog`, `/pricing`, `/faq`.

- [ ] **Step 3: Run TypeScript and test suite**

Run: `./node_modules/.bin/tsc --noEmit && npm test`
Expected: 0 type errors, all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/components/Navigation.tsx src/app/components/Footer.tsx
git commit -m "feat(navigation): apply warm retrofuturistic HUD navigation and footer"
```

---

### Task 6: Homepage Hero & Interactive Tailor Console Reskin

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/components/Hero.tsx` (if present) or homepage sections
- Modify: `src/app/components/ResumeSuggestionReviewer.tsx`

**Interfaces:**
- Consumes: `TailorBot`, `NeoButton`, `NeoGauge`, `useGamification()`
- Produces: Main application view with interactive TailorBot mascot, ATS score surge animation, and Google X-Y-Z transformation flow.

- [ ] **Step 1: Apply warm retrofuturistic theme to `src/app/page.tsx`**

Replace legacy dark cyberpunk glass containers with the warm console layout validated in `preview-neo`. Connect TailorBot reactions and ATS surge animations into the real resume paste & upload workflow.

- [ ] **Step 2: Update `ResumeSuggestionReviewer.tsx`**

Replace diff review cards with tactile hardware panels. Highlight added Google X-Y-Z metrics in phosphor emerald and eliminated passive verbs in muted coral.

- [ ] **Step 3: Run tests and type check**

Run: `./node_modules/.bin/tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/components/ResumeSuggestionReviewer.tsx
git commit -m "feat(homepage): reskin main tailoring console with retrofuturistic gamified theme"
```

---

### Task 7: Blog & Alternatives Styling + Conversion Hook CTAs

**Files:**
- Create: `src/app/components/BlogCtaBanner.tsx`
- Modify: `src/app/blog/page.tsx`
- Modify: `src/app/blog/[slug]/page.tsx`
- Modify: `src/app/alternatives/page.tsx`

**Interfaces:**
- Consumes: `TailorBot`
- Produces: High-converting retrofuturistic CTA banner with TailorBot MK-II promoting 3 free tailors with UTM tracking (`?utm_source=blog&utm_medium=cta&utm_campaign=resume_audit`).

- [ ] **Step 1: Create `BlogCtaBanner.tsx`**

```tsx
// src/app/components/BlogCtaBanner.tsx
import React from "react";
import Link from "next/link";
import TailorBot from "@/app/components/neo/TailorBot";

export default function BlogCtaBanner({ postTitle }: { postTitle?: string }) {
  return (
    <aside className="my-10 p-6 neo-box bg-[#F4F1EA] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] flex flex-col sm:flex-row items-center gap-6">
      <div className="w-24 h-24 shrink-0">
        <TailorBot state="idle" size={96} />
      </div>
      <div className="flex-grow text-center sm:text-left">
        <div className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 inline-block font-mono font-bold mb-2">
          3 FREE TAILORS INCLUDED
        </div>
        <h3 className="font-extrabold text-xl text-[#1C2028] mb-1 font-display">
          Ready to beat the ATS robot?
        </h3>
        <p className="text-xs text-gray-700 max-w-md mb-4 font-medium">
          Paste your resume and target job. Get Google X-Y-Z rewritten bullets and a real-time relevancy surge in 10 seconds.
        </p>
        <Link
          href="/?utm_source=blog&utm_medium=cta&utm_campaign=resume_audit#tailorResume"
          className="neo-btn bg-[#FF5722] text-white px-5 py-2.5 text-xs font-bold font-mono uppercase inline-flex items-center gap-2"
        >
          <span>⚡ TAILOR MY RESUME FREE</span>
          <span>→</span>
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Update `blog/page.tsx` and `blog/[slug]/page.tsx`**

Replace legacy dark/glass styles with warm retrofuturistic typography (`Space Grotesk` headings, `Inter` prose, `#FAF7F0` canvas). Insert `<BlogCtaBanner />` at both the midpoint and end of every blog article.

- [ ] **Step 3: Run tests and type check**

Run: `./node_modules/.bin/tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/BlogCtaBanner.tsx src/app/blog/page.tsx src/app/blog/[slug]/page.tsx
git commit -m "feat(blog): re-theme blog with retro-tech style and add high-converting TailorBot CTAs"
```

---

### Task 8: Pricing Page & Checkout Modal Reskin

**Files:**
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/app/components/TierSelectionModal.tsx`

**Interfaces:**
- Consumes: `NeoButton`, `NeoCard`, `getStoredUtmParams()`
- Produces: High-converting retrofuturistic pricing cards with $9 Sprint Pass, $19 Pro Week, and UTM checkout forwarding.

- [ ] **Step 1: Reskin `pricing/page.tsx`**

Restyle tier cards into tactile hardware console cards with thick ink borders, hard offset shadows, and badges highlighting "$9 Sprint Pass (2 Days)" and "$19 Pro Week (7 Days)". Retain all existing Stripe checkout parameters and UTM attribution.

- [ ] **Step 2: Reskin `TierSelectionModal.tsx`**

Apply soft neo-brutalist modal chassis with tactile dismiss button and instant tier selection.

- [ ] **Step 3: Run tests and type check**

Run: `./node_modules/.bin/tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/pricing/page.tsx src/app/components/TierSelectionModal.tsx
git commit -m "feat(pricing): update pricing cards and tier checkout modal with retro-tech styling"
```

---

### Task 9: Full Verification, Clean Build & Production Deployment

**Files:**
- All touched files

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: 710+ passing tests, 0 failures.

- [ ] **Step 2: Run TypeScript compilation**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run production build check**

Run: `npm run build`
Expected: Next.js production build succeeds with clean static and dynamic routes.

- [ ] **Step 4: Push to origin and merge PR to deploy live**

Create PR into `main`, merge, and verify live deployment on `https://airesumetailor.com`.

---
