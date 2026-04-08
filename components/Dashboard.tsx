'use client';

import { useMemo, useRef, useState } from 'react';
import { DashboardOverview } from './DashboardOverview';
import { DashboardFiles } from './DashboardFiles';
import { DashboardGames } from './DashboardGames';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import type { GitHubRoundData } from '@/lib/parser';

interface GitHubSource {
  owner: string;
  repo: string;
  token?: string;
}

interface DashboardProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  questions: GameQuestion[];
  gitHubData?: GitHubSource;
  onReset: () => void;
}

type MainView = 'overview' | 'files' | 'games';

export default function Dashboard({ files, metrics, questions, gitHubData, onReset }: DashboardProps) {
  const [mainView, setMainView] = useState<MainView>('overview');
  const [showDebug, setShowDebug] = useState(false);
  const [debugQuery, setDebugQuery] = useState('');
  const [debugPage, setDebugPage] = useState(1);

  // GitHub round data for games (fetched async)
  const [gitHubRoundData, setGitHubRoundData] = useState<GitHubRoundData | null>(null);

  // For debug: all included events
  const includedEvents = useMemo(() => {
    const q = debugQuery.trim().toLowerCase();
    if (q.length === 0) return files;
    return files.filter(f =>
      `${f.path} ${f.name} ${f.extension}`.toLowerCase().includes(q)
    );
  }, [files, debugQuery]);

  const debugPageSize = 50;
  const debugTotalPages = Math.max(1, Math.ceil(includedEvents.length / debugPageSize));
  const safeDebugPage = Math.min(debugPage, debugTotalPages);
  const debugPageItems = useMemo(() => {
    const start = (safeDebugPage - 1) * debugPageSize;
    return includedEvents.slice(start, start + debugPageSize);
  }, [includedEvents, safeDebugPage]);

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'files' as const, label: 'Files' },
    { id: 'games' as const, label: 'Games' },
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <p className="db-eyebrow">Analysis Complete</p>
          <h2 className="db-title">Your Codebase</h2>
        </div>
        <div className="db-header-actions">
          <div className="source-toggle" role="tablist" aria-label="Dashboard section">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={mainView === tab.id ? 'active' : ''}
                onClick={() => setMainView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button className="db-reset-btn" onClick={onReset}>
            ← Start over
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {mainView === 'overview' && (
        <DashboardOverview
          files={files}
          metrics={metrics}
          showDebug={showDebug}
          debugQuery={debugQuery}
          debugPage={debugPage}
          debugTotalPages={debugTotalPages}
          safeDebugPage={safeDebugPage}
          debugPageItems={debugPageItems}
          onToggleDebug={() => { setShowDebug(prev => !prev); setDebugPage(1); }}
          onDebugQueryChange={(q) => { setDebugQuery(q); setDebugPage(1); }}
          onDebugPageChange={setDebugPage}
        />
      )}

      {mainView === 'files' && (
        <DashboardFiles
          files={files}
          metrics={metrics}
          gitHubData={gitHubData}
          onGitHubRoundData={setGitHubRoundData}
        />
      )}

      {mainView === 'games' && (
        <DashboardGames
          files={files}
          metrics={metrics}
          questions={questions}
          gitHubData={gitHubRoundData ?? undefined}
        />
      )}

      {/* Debug footer */}
      <div className="dashboard-footer-debug">
        <button
          type="button"
          className="dashboard-debug-text-btn"
          onClick={() => { setShowDebug(prev => !prev); setDebugPage(1); }}
        >
          {showDebug ? 'Close debug' : 'Debug included files'}
        </button>
        <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--vim-line-number)' }}>
          {files.length.toLocaleString()} files in this codebase
        </span>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <section className="debug-panel">
          <div className="debug-head">
            <div>
              <p className="db-eyebrow">Debug</p>
              <h3 className="timeline-title">Files included in current view</h3>
            </div>
            <span className="debug-count">{includedEvents.length.toLocaleString()} included</span>
          </div>
          <div className="debug-controls">
            <input
              value={debugQuery}
              onChange={(e) => { setDebugQuery(e.target.value); setDebugPage(1); }}
              placeholder="Search path/name/extension..."
              aria-label="Search included files"
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--vim-comment)', whiteSpace: 'nowrap' }}>
              Page {safeDebugPage} / {debugTotalPages}
            </span>
          </div>
          <div className="debug-table-wrap">
            <table className="debug-table">
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Name</th>
                  <th>Extension</th>
                  <th>Lines</th>
                </tr>
              </thead>
              <tbody>
                {debugPageItems.map((file, idx) => (
                  <tr key={`${file.path}-${idx}`}>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</td>
                    <td>{file.name}</td>
                    <td>{file.extension}</td>
                    <td>{file.lines.toLocaleString()}</td>
                  </tr>
                ))}
                {debugPageItems.length === 0 && (
                  <tr>
                    <td colSpan={4}>No files match current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="debug-pager">
            <button
              type="button"
              className="db-reset-btn"
              disabled={safeDebugPage <= 1}
              onClick={() => setDebugPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="db-reset-btn"
              disabled={safeDebugPage >= debugTotalPages}
              onClick={() => setDebugPage(p => Math.min(debugTotalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
