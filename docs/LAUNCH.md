# UnVibe — Launch Checklist

> MVP deployment guide and current status

---

## 🚀 Current Status: Ready for Deployment

### What's Working
- ✅ Landing page with hero, features, how-it-works sections
- ✅ Dashboard with code parsing and game generation
- ✅ Archive parsing (zip, tar, tar.gz) via JSZip
- ✅ 11 game types (6 parser-based + 5 GitHub-powered)
- ✅ Gemini AI integration for question generation
- ✅ GitHub API integration (repo contents, commits, blame)
- ✅ Security: CSP headers, zip slip protection, zip bomb detection
- ✅ `posthog-js` installed for analytics

### What's Missing / Needs Configuration
- ⬜ PostHog API key (create account at posthog.com)
- ⬜ `.env.local` file with API keys
- ⬜ README.md with usage instructions
- ⬜ Analytics tracking calls in code
- ⬜ Deployment platform setup (Vercel recommended)

---

## 📋 Pre-Launch Checklist

### Must Have (MVP)
- [ ] Add PostHog API key to `.env.local`
- [ ] Create `README.md` with:
  - Installation steps
  - Usage guide
  - Environment variables
  - Tech stack
- [ ] Deploy to Vercel (recommended) or Railway

### Should Have
- [ ] Analytics tracking: `codebase_uploaded`, `game_started`, `game_completed`
- [ ] Custom domain setup
- [ ] OG image / social preview

### Nice to Have (Post-MVP)
- [ ] Stripe integration for paid plans
- [ ] Email authentication
- [ ] User dashboard with history

---

## 🌍 Deployment Guide

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd /data/workspace/unvibe-work
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_POSTHOG_KEY` — your PostHog API key
   - `NEXT_PUBLIC_POSTHOG_HOST` — https://app.posthog.com (or your self-hosted URL)

### Option 2: Railway

1. Connect your GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy automatically on push to main

### Option 3: Docker (Self-hosted)

```bash
cd /data/workspace/unvibe-work
docker build -t unvibe .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_POSTHOG_KEY=your_key \
  -e NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com \
  unvibe
```

---

## 🔐 Environment Variables

Create `.env.local` in project root:

```bash
# PostHog Analytics (required for tracking)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Optional: Gemini AI (if using AI features)
# GEMINI_API_KEY=your_gemini_api_key
```

---

## 🏃 Running Locally

```bash
cd /data/workspace/unvibe-work
npm install
npm run dev
# Open http://localhost:3014
```

---

## 📁 Project Structure

```
unvibe-work/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing + dashboard (SPA)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/             # UI components
│   ├── Dashboard.tsx      # Main game interface
│   ├── Hero.tsx           # Landing hero
│   ├── Features.tsx       # Feature showcase
│   ├── HowItWorks.tsx     # Usage steps
│   ├── site-header.tsx   # Navigation
│   └── Footer.tsx         # Footer
├── lib/                    # Core logic
│   ├── parser.ts          # Archive parsing
│   ├── types.ts           # TypeScript types
│   └── ai/                # Gemini AI integration
├── docs/                   # Documentation
│   ├── ANALYTICS.md       # Analytics setup
│   ├── LAUNCH.md          # This file
│   └── content-calendar.md # Marketing plan
├── middleware.ts           # Security headers (CSP)
└── package.json           # Dependencies
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** CSS (custom)
- **Icons:** Lucide React
- **Charts:** Recharts
- **Archive Parsing:** JSZip
- **Analytics:** PostHog (posthog-js)
- **AI:** Google Gemini API
- **Deployment:** Vercel / Railway / Docker

---

*Last updated: 2026-04-24*