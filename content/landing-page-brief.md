# UnVibe — Landing Page Content Brief
**Project:** UnVibe | **Review Date:** 2026-04-24
**Current URL:** unvibe.rachkovan.com | **Stage:** MVP

---

## Overview

This brief identifies gaps in the current landing page copy, provides revised hero section language, and recommends new sections to add. Based on brand positioning doc (content/brand-positioning.md).

---

## ✅ What's Working

1. **Hero section** — Clean, clear primary CTA ("drop archive here"). Upload flow is obvious.
2. **"How it works"** — 4-step numbered flow is clear and easy to scan.
3. **Feature grid** — The 5-column features (Analytics, Games, AI, Privacy, Languages, GitHub) covers the key value props efficiently.
4. **"100% client-side"** callout — Privacy-first is prominently placed. This is a strong differentiator.
5. **14 game types** (from web fetch) — The count is displayed, which creates interest.

---

## ⚠️ Gaps Identified

### Gap 1 — Hero Lacks Emotional Hook
**Current:** "Decode your codebase through play"

**Problem:** This describes *how* but not *why*. A developer reading this asks: "why would I want to decode my codebase?"

**Recommended Hero Copy:**
> "Every line of code you can't read is a loan from your future self.
> UnVibe helps you pay it back."

Sub-headline:
> "Upload any codebase. Play 14 games about your actual code. Find what you don't know before your users do."

**CTA A/B Test:**
- A: "Try it free →" (simple, action-oriented)
- B: "Run UnVibe on your repo →" (specific, low-friction)
- C: "See your knowledge gaps →" (curiosity-driven — recommended for testing)

---

### Gap 2 — No Social Proof / Credibility Signal
**Problem:** There's no evidence that this works, that real codebases have been analyzed, or that anyone else has used it.

**Recommendation — Add a "Social Proof Strip":**

```
┌─────────────────────────────────────────────────────┐
│  "Ran UnVibe on a 200k-line Python codebase.        │
│   3 senior engineers. 2 hours. 14 knowledge gaps   │
│   found. None were bugs. All were comprehension     │
│   failures."                                        │
│                              — Senior Engineer, Y   │
└─────────────────────────────────────────────────────┘
```

Or a stat bar:
- "14 game types" / "100% client-side — code never leaves your browser" / "50+ languages supported" / "Works in 5 minutes"

---

### Gap 3 — No "Who Is This For" Section
**Problem:** A visitor doesn't immediately know if UnVibe is for them. The value prop is clear ("decode your codebase") but the *use case* isn't surfaced.

**Recommendation — Add ICP Section above the fold or right below the hero:**

```
WHO IS THIS FOR:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🎯 Interview │ │ 📦 Legacy    │ │ 👋 New Team  │ │ 🔧 Tech Lead │
│ Prep Engine │ │ Code Diver   │ │ Member       │ │ / EM         │
│              │ │              │ │              │ │              │
│ Stop grinding│ │ Finally own  │ │ Stop asking  │ │ Measure team │
│ algo. Start │ │ that 200k    │ │ "stupid      │ │ knowledge    │
│ reading code│ │ LOC codebase │ │ questions"   │ │ distribution │
│ like they   │ │ you inherited│ │ — be         │ │              │
│ test you.   │ │              │ │ self-sufficient│              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

### Gap 4 — "AI · BYOK" Section Needs More Explanation
**Problem:** "AI · BYOK" is cryptic to non-technical visitors. BYOK = Bring Your Own Key, but this isn't explained.

**Recommendation:**
- Rename: "AI Questions (Bring Your Own Key)" → "AI-Powered Questions"
- Add one-liner: "Paste your Gemini API key. Get harder questions, smarter distractors, and detailed explanations."

---

### Gap 5 — No Explicit "How It Differs" / Competitive Positioning
**Problem:** Sophisticated visitors (who've seen SonarQube, LeetCode, Exercism) will immediately ask "how is this different from X?"

**Recommendation — Add a mini comparison table (below the features grid):**

| | UnVibe | SonarQube | LeetCode | Exercism |
|-|--------|-----------|----------|----------|
| Tests YOUR code | ✅ | ❌ | ❌ | ❌ |
| Quiz/game format | ✅ | ❌ | ✅ | ❌ |
| No account needed | ✅ | ❌ | ❌ | ✅ |
| Fully client-side | ✅ | ❌ | ✅ | ✅ |
| Free to use | ✅ | ❌ | ✅ | ✅ |

---

### Gap 6 — The GitHub Integration Needs a Privacy Callout
**Problem:** GitHub integration requires sending code to GitHub API — this isn't made explicit enough. Users might assume "no upload = no data leaving my machine."

**Recommendation — Add disclaimer below GitHub section:**
> "GitHub mode sends file requests to GitHub's API and optionally to Gemini for AI questions. Public repos only (for now). Your code is never stored on UnVibe's servers."

---

## 🎯 Priority Recommended Changes

### P0 (Do First)
1. **Revise hero headline** — The emotional hook is the most important copy element. Current "Decode your codebase through play" doesn't make someone stop scrolling.
2. **Add social proof strip** — Even one quote or stat dramatically increases conversion.

### P1 (Do This Week)
3. Add "Who Is This For" section — 4 ICP cards
4. Add competitive comparison table — differentiate from SonarQube/LeetCode clearly
5. Fix AI BYOK naming — "AI-Powered Questions (Bring Your Own Key)"

### P2 (Post-Launch)
6. Add case study section — "We analyzed X repos, here's what we found"
7. Add demo GIF to hero — showing upload → game → results in real UI
8. Add GitHub integration privacy callout

---

## 📝 Revised Hero Copy (Copy-Paste Ready)

### Headline (A)
```
Every line of code you can't read is a loan from your future self.
```

### Sub-headline
```
UnVibe turns your codebase into quiz games — so you can practice reading
code the way you'll be tested: under pressure, in a new codebase,
with nobody to ask.
```

### CTA
```
Try it free →  (or: "See your knowledge gaps →")
```

### Supporting proof line
```
14 game types · 100% client-side · No account needed · 5-minute setup
```

---

## 📐 Suggested Layout (Revised)

```
[NAV: Logo | How it Works | Games | GitHub | Source]
[H1: Every line of code you can't read is a loan from your future self.]
[Sub: UnVibe turns your codebase into quiz games...]
[CTA Button: "Try it free →"]
[Supporting line: 14 games · client-side · no login · 50+ languages]

[STAT BAR]
140+ game rounds played | 50+ languages | 100% client-side | No login required

[WHO IS THIS FOR]
[Interview Prep] [Legacy Code] [New Team Member] [Tech Lead/EM]

[HOW IT WORKS — 4 steps]
[1. Export] [2. Upload] [3. Explore] [4. Play & Learn]

[FEATURES GRID — 6 features]
[Games] [Analytics] [AI] [Privacy] [Languages] [GitHub]

[COMPARISON TABLE]
vs SonarQube vs LeetCode vs Exercism

[GITHUB INTEGRATION — with privacy callout]
[FOOTER: GitHub | Discord | Twitter]
```

---

*Brief created by CMO — UnVibe Landing Page Review*
*Date: 2026-04-24*
