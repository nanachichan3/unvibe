# UnVibe

> Fight cognitive debt in your codebase through game-based learning

**[→ Try it now at unvibe.rachkovan.com](https://unvibe.rachkovan.com)** · [GitHub](https://github.com/nanachichan3/unvibe)

---

## 🤔 Why This Exists

You just joined a team with a 200k-line codebase. The README was last updated two years ago. Your onboarding buddy is helpful but they're also 12 time zones away.

You have questions. The code has answers. But reading code — really understanding it — is a skill nobody taught you.

UnVibe turns *your codebase* into a quiz so you can practice reading it the way you'll be tested: under pressure, in a new codebase, with nobody to ask.

> "Every line of code you can't read is a loan from your future self."
> — The thing nobody tells you in code reviews

---

## 🎮 What It Does

1. **Upload** a code archive (zip, tar, tar.gz) or connect any public GitHub repo by URL
2. **UnVibe** parses it client-side — nothing leaves your machine — and computes complexity metrics
3. **Play.** 14 game types test what you actually understand vs. what you *think* you understand

---

## ✨ 14 Game Types

| # | Game | What It Tests |
|---|------|---------------|
| 1 | **LOC Estimation** | Do you know how big your files actually are? |
| 2 | **Language Detection** | Can you identify a language from a snippet? |
| 3 | **Era Identification** | When was this code written? (style-based) |
| 4 | **Bug Spotting** | Common bug patterns — can you find them? |
| 5 | **Vulnerability Detection** | eval(), innerHTML, SQL injection — spot the issues |
| 6 | **Type Inference** | Fill in the missing TypeScript types |
| 7 | **Architecture Reading** | Directory tree → understand the structure |
| 8 | **Trace the Call** | Follow the execution path through functions |
| 9 | **Commit Timeline** | Which file changed most in the last 30 days? |
| 10 | **Code Timeline** | When was this function last touched? |
| 11 | **Commit Author** | Which developer wrote this commit? |
| 12 | **Line Author** | Which developer wrote these specific lines? |
| 13 | **Find the Bug** | Advanced bug hunting — severity rated |
| 14 | **AI Quiz** | Gemini-powered questions on any codebase section |

Every game has two modes:
- **Simple** — Parser-based, instant, free
- **AI** — Gemini generates distractors and detailed analysis (BYOK: bring your own API key)

---

## 🔒 Privacy First

- **100% client-side parsing.** Your zip archive never leaves your browser. Zero backend for upload mode.
- **GitHub mode** uses GitHub's public API (for public repos) and optionally Gemini for AI questions — both explicit and opt-in.
- **No account required.** No login, no tracking cookie, no data stored on any server.
- Security: zip slip protection, zip bomb detection, 500MB uncompressed cap, per-file 100MB limit.

---

## 🚀 Quick Start

### Try the live version

**[unvibe.rachkovan.com](https://unvibe.rachkovan.com)** — no install needed

### Run locally

```bash
git clone https://github.com/nanachichan3/unvibe.git
cd unvibe
npm install
cp .env.example .env.local
# Add your PostHog API key to .env.local (optional — analytics only)
npm run dev
```

Open [http://localhost:3014](http://localhost:3014)

### Environment Variables

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here   # Optional — for analytics
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
GOOGLE_GEMINI_API_KEY=your_key_here             # Optional — for AI game mode
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Archive Parsing | JSZip (client-side) |
| AI | Google Gemini API |
| Analytics | PostHog |
| Icons | Lucide React |
| Hosting | Vercel (recommended) |

---

## 📁 Project Structure

```
unvibe/
├── app/               # Next.js App Router pages
├── components/        # React components (UI, games)
├── lib/               # Core logic
│   ├── parser.ts      # Client-side archive parsing
│   ├── types.ts       # TypeScript interfaces
│   ├── complexity.ts  # Complexity scoring heuristics
│   ├── prng.ts        # Seeded PRNG for reproducible questions
│   └── ai/            # Gemini AI client + prompt templates
├── docs/              # Launch plan, analytics, deployment
├── content/           # Brand positioning, SEO, social copy
└── middleware.ts      # Security headers (CSP, etc.)
```

---

## 🚢 Deployment

```bash
# Vercel (recommended — zero config)
npm i -g vercel && vercel

# Docker
docker build -t unvibe . && docker run -p 3000:3000 unvibe
```

See [docs/LAUNCH.md](docs/LAUNCH.md) for detailed deployment instructions.

---

## 🤝 Contributing

Contributions are welcome. Here's how to think about what fits:

**Fits naturally:**
- New game types (every game type lives in `lib/games/`)
- UI improvements (the game UI components in `components/games/`)
- Better complexity heuristics (`lib/complexity.ts`)
- Archive format support (new archive types beyond zip/tar)

**Out of scope for MVP:**
- Backend/persistence (this is intentionally client-side)
- User accounts and profiles
- Social features

```bash
# Dev workflow
git clone https://github.com/nanachichan3/unvibe.git
cd unvibe
npm install
npm run dev
# Open http://localhost:3014
```

**Branch strategy:** `main` is production. Open PRs against `main`. Squash merge on approval.

---

## 📊 Analytics

PostHog is configured but optional. It tracks:
- Archive upload events
- Game session starts/completions by game type
- AI mode usage
- GitHub integration usage

No personal data is collected. Configure your own PostHG project in `.env.local` if you want to see your own instance's metrics.

See [docs/ANALYTICS.md](docs/ANALYTICS.md) for the full tracking schema.

---

## 📚 More Resources

- [Launch Plan](docs/LAUNCH.md) — HN strategy, timing, checklist
- [Brand Positioning](content/brand-positioning.md) — Voice, personas, messaging pillars
- [Content Calendar](content/content-calendar.md) — Twitter posts for weeks 1–2
- [Dev Community Posts](docs/dev-community-posts.md) — r/programming, r/startups, Dev.to copy
- [SEO Strategy](content/seo-strategy.md) — Keyword clusters, 4-week content calendar

---

## ⚖️ License

MIT — do what you want with it.

---

**Built with 🧠 for developers who want to own their codebases, not just run them.**
