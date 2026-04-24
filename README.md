# UnVibe

> Fight cognitive debt in your codebase through game-based learning

UnVibe analyzes your code archives and generates interactive quiz games that test your understanding of code complexity, patterns, and architecture.

## 🎮 What It Does

1. **Upload** a code archive (zip, tar, tar.gz) or connect a GitHub repository
2. **UnVibe** extracts files, measures complexity, and generates educational games
3. **Play** quiz-style games about your own codebase — test what you know!

## ✨ Features

- **11 Game Types**: LOC estimation, language detection, era identification, bug/vulnerability spotting, and more
- **AI-Powered**: Gemini AI generates intelligent distractors and detailed analysis
- **GitHub Integration**: Analyze live repositories with commit history and blame data
- **Security First**: Zip slip protection, zip bomb detection, CSP headers
- **Analytics**: Track uploads, game sessions, and adoption metrics (PostHog)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/nanachichan3/unvibe.git
cd unvibe

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local and add your PostHog API key

# Start development server
npm run dev
```

Open [http://localhost:3014](http://localhost:3014)

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

Get your PostHog API key at [posthog.com](https://posthog.com) → Settings → Project → Keys

## 🕹️ Usage

### Upload Mode

1. Go to the landing page
2. Drag & drop or click to upload a code archive (zip/tar/tar.gz)
3. Wait for analysis (files are parsed client-side)
4. Start playing games!

### GitHub Mode

1. Enter `owner/repo` format (e.g., `facebook/react`)
2. Optional: Add GitHub token for private repos
3. Browse repository contents and select files to analyze
4. Generate AI-powered questions

## 🏗️ Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Archive Parsing | JSZip |
| AI | Google Gemini API |
| Analytics | PostHog |
| Icons | Lucide React |
| Charts | Recharts |

## 📁 Project Structure

```
├── app/               # Next.js pages
├── components/        # React components
├── lib/              # Core logic
│   ├── parser.ts     # Archive parsing
│   ├── types.ts      # TypeScript types
│   └── ai/           # Gemini AI client
├── docs/             # Documentation
├── middleware.ts     # Security headers
└── package.json      # Dependencies
```

## 🚢 Deployment

See [docs/LAUNCH.md](docs/LAUNCH.md) for detailed deployment instructions.

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### Docker

```bash
docker build -t unvibe .
docker run -p 3000:3000 unvibe
```

## 📊 Analytics

UnVibe uses PostHog for product analytics. Configure your API key to enable tracking:

- Upload events
- Game session start/complete
- DAU/MAU metrics

See [docs/ANALYTICS.md](docs/ANALYTICS.md) for detailed tracking schema.

## 📝 License

MIT

---

Built with 🧠 for developers fighting cognitive debt