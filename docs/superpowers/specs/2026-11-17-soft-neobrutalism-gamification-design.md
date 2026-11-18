# Design Spec: Soft Neo-Brutalist Redesign & Gamification Engine

- **Date:** 2026-11-17
- **Project:** AI Resume Tailor (`airesumetailor.com`)
- **Status:** Approved Draft
- **Target Release:** v2.0 Soft Neo-Brutalist & Gamified Platform

---

## 1. Executive Summary & Goals

AI Resume Tailor is transitioning from its 2026 dark glassmorphism aesthetic to **Soft Neo-Brutalism with Gamified Progression**. The redesign shifts the product personality from a clinical utility to a tactile, addictive, and rewarding career optimization game.

### 1.1 Core Goals
1. **Soft Neo-Brutalist Visual Identity:**
   - Replace glassmorphic backdrops and neon borders with warm cream canvases (`#FFFDF8`), solid `2.5px` ink borders (`#121212`), rounded pill/card geometry (`14px–16px`), and hard offset drop shadows (`4px 4px 0px #121212`).
   - Tactile mechanical feedback: buttons and interactive cards compress upon click (`translate(2px, 2px)` with shadow shrinking to `2px 2px 0px`).
   - Vibrant candy accents: Electric Lemon (`#FFE600`), Soft Mint (`#00E599`), Punchy Coral (`#FF5C5C`), and Periwinkle (`#706BF6`).
2. **Addictive Daily Gamification Loop:**
   - **ATS Score Surge:** Real-time animated score surge from baseline (e.g. `44%` *Scrapped by Bot*) to tailored score (e.g. `94%` *Offer Magnet*) with confetti celebration.
   - **XP & Levels:** Earn XP per scan (+50 XP), tailor (+150 XP), and bullet accepted (+25 XP). Advance through tiers (*Resume Rookie* → *ATS Assassin* → *Offer Magnet*).
   - **Duolingo-Style Streaks:** Daily application streak counter (🔥 X Day Streak) paired with daily mini-quests (e.g., *"Tailor 1 resume today"*, *"Fix 2 passive verbs"*).
3. **Animated Mascot ("TailorBot"):**
   - Interactive SVG mascot that reacts to user state: Idle/Blinking, Thinking/Scanning, Hyped/Confetti, and poke/tap dialogue responses.
4. **Zero-Disruption Architecture:**
   - Preserve 100% of the existing backend, ClinePass open-weight models, Supabase database schemas, and Stripe checkout pipelines.
   - Maintain all 710 existing unit and integration tests green.

### 1.2 Non-Goals
- Changing the underlying AI tailoring algorithms, prompt strategies, or chunking APIs.
- Replacing Stripe checkout tiers ($9 Sprint Pass, $19 Pro Week).
- Adding complex multi-player or social networking features (streaks and XP are single-player focused).

---

## 2. Design System: Soft Neo-Brutalism

### 2.1 Color Tokens
The color palette replaces the previous dark neon scheme with warm, high-contrast, playful tones:

| Token Name | Hex Code | Purpose |
|---|---|---|
| `--neo-canvas` | `#FFFDF8` | Global page background |
| `--neo-card-bg` | `#FFFFFF` | Primary surface background |
| `--neo-ink` | `#121212` | Borders, primary typography, hard shadows |
| `--neo-accent-yellow` | `#FFE600` | Primary brand punch, hero cards, level badges |
| `--neo-accent-green` | `#00E599` | Success states, CTA buttons, score surges |
| `--neo-accent-coral` | `#FF5C5C` | Critical warnings, low ATS scores, missing keywords |
| `--neo-accent-purple` | `#706BF6` | Mascot card, XP indicators, premium highlights |
| `--neo-muted` | `#6B7280` | Secondary helper text |

### 2.2 Shadow and Border System
- **Default Card Shadow:** `box-shadow: 4px 4px 0px #121212;`
- **Small Element Shadow:** `box-shadow: 2.5px 2.5px 0px #121212;`
- **Border Width:** `2.5px solid #121212` (standard), `2px solid #121212` (compact badges).
- **Corner Radii:** `14px–16px` for cards, `12px` for buttons, `9999px` for pill tags.
- **Button Active State:**
  ```css
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px #121212;
  ```

### 2.3 Typography
- **Headlines & Display:** Space Grotesk / System Grotesk (`font-display font-black tracking-tight`).
- **Body & Data:** Inter (`font-sans font-medium`).
- **Code & Resume Bullets:** JetBrains Mono / SF Mono (`font-mono text-sm leading-relaxed`).

---

## 3. Component Primitives

The new primitives live under `src/app/components/neo/`:

### 3.1 `NeoButton` (`src/app/components/neo/NeoButton.tsx`)
```tsx
interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'yellow' | 'green' | 'purple' | 'white' | 'coral';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  xpReward?: number;
}
```
- Includes mechanical depression on hover/active.
- Optional `xpReward` chip rendering `+150 XP` badge inside the button.

### 3.2 `NeoCard` (`src/app/components/neo/NeoCard.tsx`)
- Standard container with 2.5px border, 4px hard shadow, and optional color headers or pill badges.

### 3.3 `NeoBadge` (`src/app/components/neo/NeoBadge.tsx`)
- Pill-shaped tags (`neo-tag`) with 2px borders, used for missing/matched keywords, streak counters, and tier tags.

### 3.4 `NeoGauge` (`src/app/components/neo/NeoGauge.tsx`)
- Replaces the dark gauge with an animated rolling score meter (0–100%).
- Color shifts dynamically:
  - `< 60%`: `#FF5C5C` (*Scrapped by Bot*)
  - `60%–80%`: `#FFE600` (*Borderline Match*)
  - `> 80%`: `#00E599` (*Offer Magnet*)

---

## 4. Gamification Subsystem Architecture

### 4.1 State Management: `GamificationContext` (`src/app/contexts/GamificationContext.tsx`)
State is kept client-side in `localStorage` under `resume_tailor_game_state` and synced with Supabase `user_metadata` or profile table when authenticated.

```typescript
export interface GamificationState {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  completedQuests: string[];
  unlockedBadges: string[];
  resumesTailoredTotal: number;
  highestMatchScore: number;
}
```

### 4.2 XP & Level Progression Curves
- **Level 1 (0 – 199 XP):** *Resume Rookie*
- **Level 2 (200 – 499 XP):** *Keyword Hunter*
- **Level 3 (500 – 999 XP):** *ATS Assassin*
- **Level 4 (1000 – 1999 XP):** *Interview Magnet*
- **Level 5 (2000+ XP):** *Offer Collector*

### 4.3 Daily Streak Engine
- Evaluates `lastActiveDate`:
  - If `today == lastActiveDate`: Streak maintained.
  - If `yesterday == lastActiveDate`: Streak increments by +1.
  - If gap > 1 day: Streak resets to 1 (with streak freeze option if XP > 200).

### 4.4 Daily Quests
Refreshes daily at 00:00 local time:
1. **Daily Scan:** Scan/diagnose 1 resume (`+50 XP`).
2. **Tailor Pro:** Tailor a resume to a job description (`+150 XP`).
3. **Score Crusher:** Achieve an ATS match score ≥ 90% (`+100 XP`).

---

## 5. Mascot Architecture ("TailorBot")

`TailorBot` (`src/app/components/neo/TailorBot.tsx`) is an animated SVG character with interactive physics:
- **Idle State:** Soft vertical float (`translateY(-6px)`), periodic eye blinks.
- **Scanning State:** Antenna orb pulses electric yellow, scanning eye beam across visor.
- **Celebration State:** Wide happy eyes, blushing cheeks, confetti canvas particle explosion.
- **Interactive Pokes:** Clicking TailorBot triggers humorous career coach one-liners and Easter eggs.

---

## 6. Implementation & Migration Plan

### 6.1 Phase 1: CSS & Design Tokens
- Update `src/app/globals.css` with soft neo-brutalist custom utilities (`.neo-box`, `.neo-btn`, `.neo-tag`, animations).
- Add `Space Grotesk` font import.

### 6.2 Phase 2: Primitive Components
- Implement `NeoButton`, `NeoCard`, `NeoBadge`, `NeoGauge`, and `TailorBot`.
- Implement `launchConfetti()` canvas particle utility.

### 6.3 Phase 3: Gamification Engine
- Build `GamificationContext.tsx` with streak detection, XP rewards, and local storage persistence.
- Add sound/haptic feedback hooks (with user mute toggle).

### 6.4 Phase 4: Page Reskinning
- Update `Navigation.tsx` to render streak and XP pill counters.
- Update Homepage Hero (`src/app/page.tsx`) with the new soft neo-brutalist layout and TailorBot.
- Update `ResumeSuggestionReviewer.tsx` with tactile approval cards and rolling score updates.
- Update `pricing/page.tsx` with neo-brutalist tier cards ($9 Sprint Pass, $19 Pro Week).

### 6.5 Phase 5: Verification & Safety
- Run full test suite (`npm test`) to guarantee all 710 tests pass.
- Verify TypeScript compilation (`tsc --noEmit`).
- Verify Stripe checkout integration with UTM attribution remains unbroken.

---

## 7. Verification Checklist
- [x] Approval of visual artifact sample by user
- [ ] TypeScript type-checking passes with 0 errors
- [ ] 710/710 existing tests pass
- [ ] Stripe checkout session creation executes cleanly
- [ ] Mascot and confetti render smoothly at 60 FPS without memory leaks
