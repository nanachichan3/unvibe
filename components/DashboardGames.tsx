'use client';

import { useState } from 'react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import type { GitHubRoundData } from '@/lib/parser';
import Games from './Games';

interface DashboardGamesProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  questions: GameQuestion[];
  gitHubData?: GitHubRoundData;
}

export function DashboardGames({ files, metrics, questions, gitHubData }: DashboardGamesProps) {
  const [soloGame, setSoloGame] = useState<string | null>(null);

  return (
    <div>
      {/* Games panel — :set game= selector is inside Games.tsx */}
      <Games
        files={files}
        metrics={metrics}
        gitHubData={gitHubData}
        soloGame={soloGame}
        setSoloGame={setSoloGame}
      />
    </div>
  );
}
