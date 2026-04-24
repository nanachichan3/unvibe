# UnVibe — Analytics Setup Guide

> Analytics implementation plan for PostHog integration

---

## 📊 Current Status

- **PostHog packages:** `posthog-js` v4.4.1 installed (client-side)
- **Server-side:** Not yet configured
- **API Key:** Not yet configured (see `.env.example`)

---

## 🔧 Setup Instructions

### 1. Create PostHog Project

1. Go to [posthog.com](https://posthog.com) and create a free account
2. Create a new project (select "Self-hosted" or "Cloud" based on your preference)
3. Navigate to **Settings → Project → Keys**
4. Copy your **Project API Key** (starts with `phc_`)

### 2. Configure Environment Variables

Create or update your `.env.local` file:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 3. Initialize PostHog Client

Add to your main layout or API route initialization:

```typescript
// lib/analytics.ts
import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  })
}
```

---

## 📈 MRR Tracking Metrics

| Metric | Event Name | Properties |
|--------|------------|------------|
| **Uploads** | `codebase_uploaded` | `fileCount`, `totalLines`, `topLanguage`, `archiveSizeMb` |
| **Active Users** | `user_active` | `date`, `sessionId` (captured via pageviews) |
| **Game Sessions** | `game_started` | `gameType`, `questionCount` |
| **Game Completions** | `game_completed` | `gameType`, `score`, `timeSpentSeconds` |
| **Paying Users** | N/A (MVP is free) | Track when Stripe added |

### MRR Formula (Post-MVP)
```
MRR = SUM(plan_price) WHERE status = 'active' AND billing_interval = 'monthly'
```

---

## 📊 Adoption Metrics

### Core Metrics

| Metric | Calculation | Target |
|--------|-------------|--------|
| **DAU/MAU Ratio** | `distinct_id` count (daily) / `distinct_id` count (monthly) | > 0.15 |
| **Upload Completion Rate** | `game_started` / `codebase_uploaded` | > 0.70 |
| **Game Generation Rate** | `game_completed` / `game_started` | > 0.60 |
| **Avg Session Duration** | median of `game_completed.timeSpentSeconds` | > 3 min |

### Funnel Analysis

```
Upload → Parse Complete → Game Start → Game Complete → Share/Retry
```

Track each step with dropout rate to identify friction points.

---

## 🗄️ Analytics Schema

### User Identification
- Anonymous users tracked by PostHog's default auto-generated ID
- Identify users when they provide email (future feature)

### Event Properties Schema

```typescript
// Upload event
{
  event: 'codebase_uploaded',
  properties: {
    fileCount: number,
    totalLines: number,
    topLanguage: string,
    archiveSizeMb: number,
    uploadMethod: 'zip' | 'github'
  }
}

// Game event
{
  event: 'game_started',
  properties: {
    gameType: 'loc' | 'language' | 'era' | 'bug' | 'vulnerability' | ..., // see GameType enum
    source: 'upload' | 'demo'
  }
}
```

### Dashboard Panels (PostHog)

1. **Overview** — DAU, MAU, uploads today/week/month
2. **Funnel** — Upload → Game completion rate
3. **Retention** — Week 1/2/4 retention for returning users
4. **Feature Usage** — Game type distribution, avg score by type

---

## 🚀 Deployment Notes

- PostHog client only runs in browser (use `NEXT_PUBLIC_` prefix)
- Server-side tracking uses `posthog-node` (for API events, webhooks)
- For self-hosted PostHog, update `NEXT_PUBLIC_POSTHOG_HOST` to your instance

---

## 📝 Next Steps

1. ✅ PostHog package installed (posthog-js)
2. ⬜ Create PostHog account and get API key
3. ⬜ Add `.env.local` with API key
4. ⬜ Implement `lib/analytics.ts` initialization
5. ⬜ Add tracking calls to upload and game events
6. ⬜ Build PostHog dashboard from template above