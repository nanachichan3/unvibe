'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  loading: () => (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <div style={{
        width: '40px', height: '40px',
        border: '2px solid rgba(123,92,255,0.2)',
        borderTopColor: '#7B5CFF',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 16px',
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading dashboard...</p>
    </div>
  ),
});

export default function Home() {
  const [hasData, setHasData] = useState(false);
  const [data, setData] = useState<{
    files: FileInfo[];
    metrics: ComplexityMetrics;
    questions: GameQuestion[];
  } | null>(null);

  const handleDataLoaded = (files: FileInfo[], metrics: ComplexityMetrics, questions: GameQuestion[]) => {
    setData({ files, metrics, questions });
    setHasData(true);
    setTimeout(() => {
      document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Navbar />
      <Hero onDataLoaded={handleDataLoaded} />
      <Features />
      <HowItWorks />
      {data && (
        <div id="dashboard">
          <Dashboard files={data.files} metrics={data.metrics} questions={data.questions} />
        </div>
      )}
      <Footer />
    </main>
  );
}
