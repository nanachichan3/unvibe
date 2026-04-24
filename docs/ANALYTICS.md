# UnVibe — Analytics Setup Guide

> Analytics implementation for PostHog integration

---

## ✅ Current Status

- **PostHog packages:** `posthog-js` v1.371.3 and `posthog-node` v4.4.1 installed
- **Client-side:** Fully configured via `PostHogProvider.tsx` + `lib/analytics.ts`
- **API Key:** Add to `.env.local` → `NEXT_PUBLIC_POSTHOG_KEY=phc_your_key`
- **All event types:** Implemented in `lib/analytics.ts`

---

## 🔧 Setup Instructions

### 1. Create PostHog Project

1. Go to [posthog.com](https://posthog.com) and create a free account
2. Create a new project
3. Navigate to **Settings → Project → Keys**
4. Copy your **Project API Key** (starts with `phc_`)

### 2. Configure Environment Variables

```bash
# .env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

> Get your key at [posthog.com](https://posthog.com) → Settings → Project → Keys

### 3. Start Development

```bash
npm run dev   # runs on http://localhost:3014
```

PostHog will auto-capture pageviews and pageleaves. Custom events are tracked via `lib/analytics.ts`.

---

## 📊 Events Tracked

### Core Events

| Event | When | Properties |
|-------|------|------------|
| `codebase_uploaded` | User uploads a zip archive | `fileCount`, `totalLines`, `topLanguage`, `archiveSizeMb`, `uploadMethod` |
| `github_repo_connected` | User fetches a GitHub repo | `owner`, `repo`, `fileCount`, `totalLines` |
| `game_started` | A new game round begins | `gameType`, `source` (`upload`/`demo`), `difficulty` |
| `game_completed` | User submits an answer | `gameType`, `correct`, `pointsEarned`, `totalPoints`, `roundsPlayed`, `difficulty`, `timeSpentMs` |
| `ai_game_played` | User answers an AI solo game | `gameType`, `answered`, `correct`, `tokensUsed` |
| `$pageview` | Page load (PostHog auto) | `path`, `referrer` |

### AI Solo Games Tracked

| Game | `gameType` property |
|------|---------------------|
| What Does This Do | `what-does-this-do` |
| Find the Bug | `find-the-bug` |
| Spot the Vulnerability | `spot-the-vuln` |
| Trace the Call | `dependency-path` |
| Type Inference | `type-inference` |
| Refactor This | `refactor-this` |
| Read the Architecture | `read-the-arch` |
| Commit Timeline | `function-age` |
| Code Timeline | `code-author` |
| Commit Author | `commit-message` |
| Line Author | `line-author` |

---

## 📈 PostHog Dashboard Queries

### Key Metrics to Set Up

**1. Total Uploads (all time)**
```sql
SELECT count(*) FROM events WHERE event = 'codebase_uploaded'
```

**2. GitHub Connections**
```sql
SELECT count(*) FROM events WHERE event = 'github_repo_connected'
```

**3. Uploads by Method**
```sql
SELECT properties.uploadMethod, count(*) FROM events WHERE event = 'codebase_uploaded' GROUP BY properties.uploadMethod
```

**4. Game Sessions Started**
```sql
SELECT count(DISTINCT hash(v.uuid)) FROM events WHERE event = 'game_started'
```

**5. Game Completion Rate**
```sql
SELECT
  countIf(event='game_completed' AND properties.correct = true) * 1.0 / countIf(event='game_completed')
FROM events WHERE event IN ('game_started', 'game_completed')
```

**6. Most Popular Game Types**
```sql
SELECT properties.gameType, count(*) FROM events WHERE event = 'game_completed' GROUP BY properties.gameType ORDER BY count(*) DESC
```

**7. Average Score per Game Type**
```sql
SELECT
  properties.gameType,
  avg(properties.pointsEarned) as avg_points,
  count(*) as completions
FROM events WHERE event = 'game_completed'
GROUP BY properties.gameType
ORDER BY completions DESC
```

**8. DAU / MAU**
```sql
-- DAU
SELECT count(DISTINCT distinct_id) FROM events WHERE toDate(timestamp) = today()
-- MAU
SELECT count(DISTINCT distinct_id) FROM events WHERE timestamp > today() - INTERVAL 30 DAY
```

---

## 📋 MRR Tracking

> **UnVibe is currently free (no paid plans).** MRR tracking will be added when Stripe is integrated.

When Stripe is added, track:

| Event | When |
|-------|------|
| `subscription_started` | New paying user |
| `subscription_cancelled` | Churn |
| `plan_upgraded` | Plan change |

Stripe webhook → server-side `posthog-node` capture.

---

## 🔌 Using the Analytics API

```typescript
import {
  trackCodebaseUploaded,
  trackGitHubRepoConnected,
  trackGameStarted,
  trackGameCompleted,
  trackAIGamePlayed,
  trackPageView,
} from '@/lib/analytics';

// In any component:
trackCodebaseUploaded({ fileCount: 42, totalLines: 1200, topLanguage: 'TypeScript', archiveSizeMb: 0.8, uploadMethod: 'zip' });
trackGameStarted({ gameType: 'find-the-bug', source: 'upload', difficulty: 'medium' });
trackGameCompleted({ gameType: 'what-does-this-do', correct: true, pointsEarned: 100, totalPoints: 500, roundsPlayed: 5, difficulty: 'medium', timeSpentMs: 4500 });
trackAIGamePlayed({ gameType: 'spot-the-vuln', answered: true, correct: false, tokensUsed: 800 });
```

Events are **silently no-ops** when `NEXT_PUBLIC_POSTHOG_KEY` is not set — safe to call everywhere in development.
