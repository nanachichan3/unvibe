'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Dashboard from '@/components/Dashboard';
import Footer from '@/components/Footer';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';

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
