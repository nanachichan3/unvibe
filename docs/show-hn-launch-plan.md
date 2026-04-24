# UnVibe — Show HN Launch Plan
**Project:** UnVibe | **Stage:** MVP → Launch
**Goal:** Execute Show HN launch on Hacker News (best days: Tue–Thu, 9AM–11AM PT = 17:00–19:00 UTC)
**Target:** Front page, 100+ upvotes, meaningful comments, GitHub stars

---

## 📅 Launch Timing

**Best days:** Tuesday, Wednesday, Thursday
**Best time:** 9:00–11:00 AM PT (17:00–19:00 UTC)
- HN front page refreshes every 10–15 min
- Early morning PT catches peak traffic
- Posted at top of hour = better initial velocity

**Recommended launch date:** Tuesday 2026-04-28 or Wednesday 2026-04-29
*(CMO note: Confirm with CTO if deployed by then — check LAUNCH.md pre-reqs)*

---

## 🧵 Show HN Post Structure

### Title (most important — 2 options to A/B)

**Option A (curiosity):** "I built an app that quizzes you about your own codebase"
**Option B (product-first):** "UnVibe — turn your code into a game you can actually win"

*Recommended: Option A — "I built X" format performs well on HN and is authentic*

### Body Template

```
title: I built an app that quizzes you about your own codebase

---

Show HN! I've been thinking about this for a while: how well do you actually know the codebase you stare at every day?

**UnVibe** analyzes your code archive (or any GitHub repo) and generates quiz games about it.

You can play:
- "How many lines of code is this file?" (LOC estimation)
- "What language is this snippet?" (language detection)
- "Find the bug in this code sample?" (bug spotting)
- "When was this function last changed?" (era identification)

It's built for developers who want to build institutional knowledge — and honestly, to make codebases less intimidating.

**Tech:** Next.js 14 + TypeScript + Gemini AI for question generation + JSZip for archive parsing

**What works:**
- Archive upload (zip/tar/tar.gz) — files parsed client-side
- GitHub integration (public repos work without a token)
- 11 game types across 5 AI-powered categories
- Self-hosted option (Docker one-liner)

**What I'm still building:**
- User auth + history dashboard
- Private repo support with GitHub token
- More game types

**Live:** [unvibe.rachkovan.com or deployed URL]
**GitHub:** [github repo]

Curious what questions UnVibe generates about YOUR codebase. Happy to answer questions about the architecture.
```

---

## 🔑 HN Success Factors

### What HN readers want to see:
1. **Honest "I built this" story** — not marketing fluff
2. **Real problem + real solution** — explain WHY you built it
3. **Technical depth in comments** — be ready to discuss tradeoffs, architecture
4. **Code accessibility** — GitHub repo with working code
5. **Show code, not just product** — screenshots, demos, gifs

### What kills HN posts:
1. Video-first content (HN readers want text/code)
2. App store links (HN devs want to click through immediately)
3. Vague positioning ("AI-powered game-changer!")
4. No GitHub repo (even if proprietary, a demo is expected)

---

## 📋 Pre-Launch Checklist (CTO must complete)

- [ ] Deploy to Vercel or public URL (required — HN needs live link)
- [ ] Set up PostHog analytics
- [ ] Clean landing page with clear value prop
- [ ] GitHub repo public with README + screenshots
- [ ] OG image + social preview set
- [ ] Domain ready (unvibe.rachkovan.com or similar)

## 📋 CMO Actions Before Launch

- [ ] Draft post in Google Docs or plaintext
- [ ] Time draft with CTO's confirmed deploy date
- [ ] Prepare 3-5HN-friendly follow-up comments in advance
- [ ] Draft Twitter cross-post (same day, 2 hours after HN post)

---

## 📊 Cross-Posting Strategy

### Day-of (same time as HN post):
**Twitter/X thread:**
```
Show HN! 🧵

Built UnVibe — a quiz game generated from YOUR codebase.

Here's what it does and how I built the AI question generator 👇
[link to HN post]
```

### Day-after:
**r/programming or r/startups** (only if HN post gains traction)
- X-post to r/programming with modified angle ("I analyzed 5 famous OSS codebases — here's what UnVibe found")

### Week 2:
- Blog post on yev.dev: "How I built an AI that quizzes developers about their own code"
- LinkedIn post about the HN experience

---

## 🎯 Success Metrics

| Metric | Target | Nice-to-have |
|--------|--------|-------------|
| HN Upvotes | 100+ | 200+ |
| HN Front Page | ✅ (top 5) | ✅ (top 3) |
| GitHub Stars | 50+ | 100+ |
| Comments | 20+ | 40+ |
| Waitlist signups | 20+ | 50+ |

---

## ⚠️ Risk Factors

1. **App not deployed in time** — Blocked by CTO completing Vercel deploy
   - Mitigation: CTO Work Session must confirm deploy readiness before launch date
2. **No unique angle** — "Code quiz" is new but needs clear demo
   - Mitigation: Landing page screenshot or GIF is mandatory
3. **Timing conflict** — Other big launches on same day
   - Mitigation: Check HN front page on launch day morning; if big launches, wait a day

---

## 🤝 CMO + CTO Coordination Needed

**CTO deliverables (blocking):**
1. Confirm deployment URL before launch date selection
2. Provide 1-sentence product description for post title refinement
3. Share GitHub repo URL

**CMO deliverables (ready now):**
1. ✅ Post title + body drafted
2. ✅ Cross-post strategy planned
3. ✅ Success metrics defined

**CMO: Confirm launch date with CTO by next work session (30 min).**

---

*CMO Work Session — 2026-04-24*
*Project: UnVibe | Phase: Launch Prep*
