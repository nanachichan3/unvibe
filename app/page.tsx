'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import SiteHeader from '@/components/site-header';
import LandingUpload from '@/components/landing-upload';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import { parseArchive, calculateMetrics, generateStaticQuestions } from '@/lib/parser';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  loading: () => (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-spinner" />
        <p className="loading-title">Analyzing your codebase…</p>
        <p className="loading-sub">Extracting files, measuring complexity, building games</p>
      </div>
    </div>
  ),
});

interface GitHubSource {
  owner: string;
  repo: string;
  token?: string;
}

type Phase =
  | { name: 'landing' }
  | { name: 'loading' }
  | { name: 'data'; files: FileInfo[]; metrics: ComplexityMetrics; questions: GameQuestion[]; gitHubData?: GitHubSource }
  | { name: 'error'; message: string };

export default function Home() {
  const [phase, setPhase] = useState<Phase>({ name: 'landing' });

  const handleDataLoaded = useCallback((
    files: FileInfo[],
    metrics: ComplexityMetrics,
    questions: GameQuestion[],
    gitHubData?: GitHubSource
  ) => {
    setPhase({ name: 'data', files, metrics, questions, gitHubData });
    setTimeout(() => {
      document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleError = useCallback((message: string) => {
    setPhase({ name: 'error', message });
  }, []);

  const onFile = useCallback(async (file: File) => {
    setPhase({ name: 'loading' });
    try {
      const files = await parseArchive(file);
      if (files.length === 0) {
        setPhase({ name: 'error', message: 'No readable files found in this archive. Make sure you uploaded a valid zip, tar, or tar.gz file.' });
        return;
      }
      const metrics = calculateMetrics(files);
      const questions = generateStaticQuestions(files, metrics);
      handleDataLoaded(files, metrics, questions);
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof Error ? err.message : 'Failed to parse archive' });
    }
  }, [handleDataLoaded]);

  // Loading state
  if (phase.name === 'loading') {
    return (
      <div className="loading-overlay">
        <div className="loading-card">
          <div className="loading-spinner" />
          <p className="loading-title">Analyzing your codebase…</p>
          <p className="loading-sub">Extracting files, measuring complexity, building games</p>
        </div>
      </div>
    );
  }

  // Dashboard state
  if (phase.name === 'data') {
    return (
      <main>
        <SiteHeader />
        <div id="dashboard">
          <Dashboard
            files={phase.files}
            metrics={phase.metrics}
            questions={phase.questions}
            gitHubData={phase.gitHubData}
            onReset={() => setPhase({ name: 'landing' })}
          />
        </div>
        <Footer />
      </main>
    );
  }

  // Landing state
  return (
    <main className="page-shell">
      <SiteHeader />

      {/* Error banner */}
      {phase.name === 'error' && (
        <div className="error-banner">
          <span><strong>Error:</strong> {phase.message}</span>
          <button onClick={() => setPhase({ name: 'landing' })}>Try again</button>
        </div>
      )}

      {/* HERO */}
      <section className="hero-band">
        <div className="hero-band__decor" aria-hidden="true">
          <div className="hero-glow" />
        </div>
        <p className="hero-eyebrow">Codebase Mental-Debt Fighter · 100% Private</p>
        <h1>
          Decode your<br />
          <span className="txt-red">codebase</span>{' '}
          <span className="txt-outline">through play.</span>
        </h1>
        <p className="hero-lead">
          Upload any project archive and get instant insights. Games that make you understand your own code.
          No account. No server uploads. AI-assisted analysis when you want it.
        </p>
        <div className="hero-actions">
          <a href="#upload" className="btn-primary">Upload Your Code</a>
          <a href="https://github.com/nanachichan3/unvibe" target="_blank" rel="noreferrer" className="btn-outline">
            View Source on GitHub →
          </a>
        </div>
      </section>

      {/* STATS BENTO */}
      <div className="stats-bento">
        <div className="stat-tile">
          <span className="stat-num">100<span className="accent">%</span></span>
          <p className="stat-desc">Private — runs locally in your browser</p>
        </div>
        <div className="stat-tile">
          <span className="stat-num">14</span>
          <p className="stat-desc">Unique game types</p>
        </div>
        <div className="stat-tile">
          <span className="stat-num">0</span>
          <p className="stat-desc">Server uploads required</p>
        </div>
        <div className="stat-tile">
          <span className="stat-num">∞</span>
          <p className="stat-desc">Languages and frameworks supported</p>
        </div>
      </div>

      {/* UPLOAD */}
      <LandingUpload onFile={onFile} />

      {/* FEATURES */}
      <Features />

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* FOOTER */}
      <Footer />
    </main>
  );
}
