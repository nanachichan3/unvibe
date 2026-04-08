'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SiteHeader from '@/components/site-header';
import Hero from '@/components/Hero';
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
      setPhase({ name: 'data', files, metrics, questions });
      setTimeout(() => { document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof Error ? err.message : 'Failed to parse archive' });
    }
  }, []);

  const onGitHubData = useCallback((
    files: FileInfo[],
    metrics: ComplexityMetrics,
    questions: GameQuestion[],
    gitHubData: GitHubSource
  ) => {
    setPhase({ name: 'data', files, metrics, questions, gitHubData });
    setTimeout(() => { document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  }, []);

  const onError = useCallback((message: string) => {
    setPhase({ name: 'error', message });
  }, []);

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
    <main>
      <SiteHeader />
      {phase.name === 'error' && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 32px 0' }}>
          <div className="error-banner">
            <span><strong>Error:</strong> {phase.message}</span>
            <button onClick={() => setPhase({ name: 'landing' })}>Try again</button>
          </div>
        </div>
      )}
      <Hero onFile={onFile} onGitHubData={onGitHubData} onError={onError} />
      <Features />
      <HowItWorks />
      <Footer />
    </main>
  );
}
