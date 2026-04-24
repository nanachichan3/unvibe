/**
 * lib/analytics.ts
 *
 * Centralized PostHog analytics wrapper for UnVibe.
 * Provides typed event helpers for all tracked user actions.
 *
 * Events:
 *  - page_viewed         → landing page loads
 *  - codebase_uploaded  → zip archive uploaded
 *  - github_repo_connected → GitHub repo fetched
 *  - game_started       → a game round begins
 *  - game_completed     → a game round answered
 *  - ai_game_played     → AI solo game (WhatDoesThisDo, FindTheBug, etc.)
 */

import posthog from 'posthog-js';

// ── Env check ────────────────────────────────────────────────────────────────

function getConfig(): { key: string | undefined; host: string } {
  return {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  };
}

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const { key } = getConfig();
  return Boolean(key && key !== 'phc_your_posthog_api_key_here');
}

// ── Capture helpers ─────────────────────────────────────────────────────────

/**
 * Track a page view.
 * PostHog's capture_pageview option handles most pages automatically,
 * but we call this explicitly for important route transitions.
 */
export function trackPageView(path: string, properties?: Record<string, unknown>) {
  if (!isEnabled()) return;
  posthog.capture('$pageview', { path, ...properties });
}

/**
 * Track a codebase archive upload.
 */
export function trackCodebaseUploaded(properties: {
  fileCount: number;
  totalLines: number;
  topLanguage: string;
  archiveSizeMb: number;
  uploadMethod: 'zip' | 'github';
}) {
  if (!isEnabled()) return;
  posthog.capture('codebase_uploaded', {
    ...properties,
    // Enrich with timestamp for daily/weekly aggregation
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track a GitHub repository connection.
 */
export function trackGitHubRepoConnected(properties: {
  owner: string;
  repo: string;
  fileCount: number;
  totalLines: number;
}) {
  if (!isEnabled()) return;
  posthog.capture('github_repo_connected', {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track the start of a game round.
 */
export function trackGameStarted(properties: {
  gameType: string;
  source: 'upload' | 'demo';
  difficulty: 'easy' | 'medium' | 'hard';
}) {
  if (!isEnabled()) return;
  posthog.capture('game_started', {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track a game round completion (answer submitted).
 */
export function trackGameCompleted(properties: {
  gameType: string;
  correct: boolean;
  pointsEarned: number;
  totalPoints: number;
  roundsPlayed: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeSpentMs: number;
}) {
  if (!isEnabled()) return;
  posthog.capture('game_completed', {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track an AI solo game event (WhatDoesThisDo, FindTheBug, etc.).
 */
export function trackAIGamePlayed(properties: {
  gameType: string;
  answered: boolean;
  correct?: boolean;
  tokensUsed?: number;
}) {
  if (!isEnabled()) return;
  posthog.capture('ai_game_played', {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Identify a user (e.g., when they provide an email or sign in).
 * For now this is a no-op since UnVibe is anonymous.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!isEnabled()) return;
  posthog.identify(userId, properties);
}

// ── Expose PostHog for advanced use ─────────────────────────────────────────

export { posthog };
