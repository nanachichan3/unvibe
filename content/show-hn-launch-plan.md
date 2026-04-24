# UnVibe — Show HN Launch Plan

**Product:** UnVibe — Fight cognitive debt through game-based code learning
**Stage:** MVP | Ready to launch
**Target:** Hacker News audience (developers, indie hackers, technical founders)

---

## 🎯 Show HN Strategy

### Best Time to Post
**Tuesday, Wednesday, or Thursday — 9:00 AM EST / 6:00 AM PST / 1:00 PM UTC**

AVOID: Mondays (low engagement), Fridays (weekend scroll), 6 PM+ EST (misses peak HN traffic)

**Target Date: Tuesday April 29 or Wednesday April 30**

---

## 📝 Show HN Post Template

```
title: UnVibe — turn your codebase into quiz games so you actually remember what it does

---

2 years ago I joined a company with 800K lines of legacy code. I spent more time asking "what does this file even do" than writing new features.

I built UnVibe so the next person doesn't have to.

**What it does:**
Upload any code archive (zip/tar) or connect a GitHub repo. UnVibe analyzes it and generates interactive quiz games about YOUR codebase:
- "How many lines of code is this file?" (LOC estimation)
- "What language is this snippet?" (language detection)
- "Where's the bug in this function?" (bug spotting)
- "When was this function last changed and by whom?" (GitHub-powered)

**Why quiz games?**
Active recall is one of the most effective learning techniques. You don't learn code by reading it — you learn it by interacting with it. UnVibe makes your codebase the study material.

**Tech stack:** Next.js 14, TypeScript, JSZip for parsing, Google Gemini AI for question generation, GitHub API integration, PostHog for analytics.

**Security:** CSP headers, zip slip protection, zip bomb detection. All parsing happens client-side.

**Current state:** MVP. Looking for early users who work in non-trivial codebases and want to understand them better.

Try it: [unvibe.rachkovan.com]

Source: [GitHub link]
```

---

## 🔥 Post Timing Strategy

| Day | Action | Notes |
|-----|--------|-------|
| Launch -1 | Prep demo account + screenshots | HN shows thumbnail from link — need good OG image |
| Launch AM | Post to Show HN | 9 AM EST sharp |
| Launch +1hr | Post to Twitter/X with same copy | Use #ShowHN |
| Launch +2hr | Engage with every comment | First 2 hours critical for ranking |
| Launch +4hr | If no traction: refine title and re-post | Check "newest" list |
| Launch +24hr | X-post to r/ProgrammerHumor, r/indiehackers | Only if good initial reception |

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| HN points | 100+ |
| HN comments | 20+ |
| Website visits (24hr) | 500+ |
| Waitlist signups | 50+ |
| GitHub stars | 20+ |

---

## 🚨 Title Formulas That Work on HN

DO:
- Specific outcome: "turn your codebase into quiz games"
- Personal pain-to-build story: "I joined a company with 800K lines of legacy code..."
- Novel framing: "fight cognitive debt"

AVOID:
- Generic: "I built a code analysis tool"
- Over-technical: "Static analysis + spaced repetition for monorepos"
- No-viral: "Introducing [ProductName] — [generic description]"

---

## 👀 What HN Readers Look For

1. **Interesting problem** — Cognitive debt in codebases is relatable
2. **Novel solution** — Quiz games from YOUR code is unique
3. **Credible tech** — Show security, GitHub API, client-side parsing
4. **Honest status** — Say MVP, ask for feedback, don't oversell
5. **Demo or it didn't happen** — Must have working link

---

## 📦 Pre-Launch Checklist

- [ ] Deploy to Vercel (or working URL)
- [ ] OG image / social preview generated
- [ ] README.md on GitHub (HN readers check source)
- [ ] Screenshots ready (dashboard, game example, GitHub integration)
- [ ] Create HN account (if not done) — post from established account
- [ ] Prep demo archive (sample codebase to test with)
- [ ] PostHog configured (shows "serious" product)

---

*Drafted by CMO subagent — UnVibe Launch*
*Date: 2026-04-24*
