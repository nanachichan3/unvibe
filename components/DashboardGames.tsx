'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import type { GitHubRoundData } from '@/lib/parser';
import { generateRoundQuestion } from '@/lib/parser';
import Games from './Games';
import { GAME_TYPES } from './Games';

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
      {/* Game type chips */}
      <div className="db-tile tile-dark span-12" style={{ marginBottom: 24 }}>
        <span className="tile-tag tile-tag--muted">Available Games</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {GAME_TYPES.map(game => (
            <span
              key={game.id}
              className={`game-chip${soloGame === game.id ? ' active' : ''}`}
              onClick={() => setSoloGame(prev => prev === game.id ? null : game.id)}
              title={game.desc}
            >
              {game.label}
              {game.github && (
                <span style={{
                  marginLeft: 4,
                  fontSize: 10,
                  padding: '1px 5px',
                  background: 'rgba(86,156,214,0.15)',
                  border: '1px solid rgba(86,156,214,0.3)',
                  borderRadius: 4,
                  color: 'var(--vim-keyword)',
                }}>
                  GH
                </span>
              )}
            </span>
          ))}
        </div>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--vim-line-number)',
          marginTop: 12,
        }}>
          Click a game to focus · or browse all from the games panel below
          {gitHubData ? (
            <span style={{ color: '#34d399' }}> · GitHub data connected</span>
          ) : (
            <span> · games marked <span style={{ color: 'var(--vim-keyword)' }}>GH</span> require a GitHub repository</span>
          )}
        </p>
      </div>

      {/* Games panel */}
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
