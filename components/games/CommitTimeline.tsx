'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import TokenMeter from '../TokenMeter';
import type { GitHubRoundData } from '@/lib/parser';

interface CommitTimelineProps {
  gitHubData: GitHubRoundData;
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

interface CommitInfo {
  date: string;
  quarter: string;
  files: string[];
}

function getQuarter(dateStr: string): string {
  const date = new Date(dateStr);
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  const year = date.getFullYear();
  return `Q${quarter} ${year}`;
}

function getQuarterOptions(correctDate: string, allDates: string[]): string[] {
  const correctQ = getQuarter(correctDate);
  const quarters = new Set<string>();

  // Add the correct quarter
  quarters.add(correctQ);

  // Get unique quarters from all dates
  for (const d of allDates) {
    quarters.add(getQuarter(d));
  }

  // Get quarters around the correct one
  const correctDateObj = new Date(correctDate);
  const correctYear = correctDateObj.getFullYear();
  const correctMonth = correctDateObj.getMonth();
  const correctQuarterNum = Math.ceil((correctMonth + 1) / 3);

  // Add adjacent quarters
  const addQuarter = (year: number, q: number) => {
    if (q < 1) { year--; q = 4; }
    if (q > 4) { year++; q = 1; }
    quarters.add(`Q${q} ${year}`);
  };

  addQuarter(correctYear, correctQuarterNum - 1);
  addQuarter(correctYear, correctQuarterNum + 1);

  // If still less than 4, add some random ones from the available quarters
  const allQuarters = Array.from(quarters);
  while (allQuarters.length < 4) {
    const randomDate = allDates[Math.floor(Math.random() * allDates.length)];
    const q = getQuarter(randomDate);
    if (!allQuarters.includes(q)) {
      allQuarters.push(q);
    }
  }

  return shuffleArray(allQuarters.slice(0, 4));
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]!];
  }
  return shuffled;
}

function getFilesForDate(date: string, fileCommits: Record<string, string[]>): string[] {
  const files: Array<{ path: string; diff: number }> = [];

  for (const [path, commits] of Object.entries(fileCommits)) {
    const idx = commits.indexOf(date);
    if (idx !== -1) {
      // Calculate "distance" from this commit to measure relevance
      files.push({ path, diff: 0 });
    } else {
      // Find the closest commit date
      let minDiff = Infinity;
      for (const commitDate of commits) {
        const diff = Math.abs(new Date(date).getTime() - new Date(commitDate).getTime());
        if (diff < minDiff) minDiff = diff;
      }
      // Only include if within 7 days
      if (minDiff < 7 * 24 * 60 * 60 * 1000) {
        files.push({ path, diff: minDiff });
      }
    }
  }

  // Sort by relevance (exact match first) and take up to 5
  files.sort((a, b) => a.diff - b.diff);
  return files.slice(0, 5).map(f => f.path.split('/').pop() || f.path);
}

function formatMonthRange(quarter: string): string {
  const match = quarter.match(/Q(\d) (\d{4})/);
  if (!match) return quarter;

  const q = parseInt(match[1]!);
  const year = match[2];
  const months: Record<number, string> = {
    1: 'Jan - Mar',
    2: 'Apr - Jun',
    3: 'Jul - Sep',
    4: 'Oct - Dec',
  };

  return `${months[q]} ${year}`;
}

export default function CommitTimeline({
  gitHubData,
  sessionTokens,
  onSessionTokensChange,
}: CommitTimelineProps) {
  const [roundTokens, setRoundTokens] = useState(0);
  const [commit, setCommit] = useState<CommitInfo | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuestion = useCallback(() => {
    setIsGenerating(true);
    setSelected(null);
    setRevealed(false);
    setRoundTokens(0);

    if (!gitHubData || gitHubData.allCommitDates.length === 0) {
      setIsGenerating(false);
      return;
    }

    // Pick a random commit date
    const randomIdx = Math.floor(Math.random() * gitHubData.allCommitDates.length);
    const commitDate = gitHubData.allCommitDates[randomIdx]!;
    const quarter = getQuarter(commitDate);

    // Get files that were touched around this date
    const changedFiles = getFilesForDate(commitDate, gitHubData.fileCommits);

    // Generate quarter options
    const quarterOptions = getQuarterOptions(commitDate, gitHubData.allCommitDates);

    setCommit({
      date: commitDate,
      quarter,
      files: changedFiles.length > 0 ? changedFiles : ['src/index.ts', 'lib/utils.ts', 'components/App.tsx'].slice(0, 3),
    });

    setOptions(quarterOptions);
    setIsGenerating(false);
  }, [gitHubData]);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleAnswer = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
  };

  const nextRound = () => {
    generateQuestion();
  };

  if (isGenerating && !commit) {
    return (
      <div className="vim-card">
        <div className="vim-card-header">
          <span>📅 Commit Timeline</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            Analyzing commit history...
          </p>
        </div>
      </div>
    );
  }

  if (!gitHubData) {
    return (
      <div className="vim-card">
        <div className="vim-card-header">
          <span>GitHub Data Required</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="vim-code" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
            <div className="vim-code-header">
              <span>// error</span>
              <span style={{ color: '#f85149' }}>E169: GitHub data not available</span>
            </div>
            <div className="vim-code-content" style={{ padding: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6a9955' }}>
              <p>:GitHub authentication required for this game.</p>
              <p>Connect a GitHub repository to enable:</p>
              <p style={{ marginTop: '8px', color: '#569cd6' }}>  • Commit Timeline</p>
              <p style={{ color: '#569cd6' }}>  • Commit Author</p>
              <p style={{ color: '#569cd6' }}>  • Line Author</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>📅 Commit Timeline</span>
        <span className="vim-difficulty vim-difficulty-medium">medium</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Commit display */}
        {commit && (
          <div className="vim-terminal" style={{ marginBottom: '20px' }}>
            <div className="vim-terminal-header">
              <span className="vim-terminal-dot" style={{ background: '#f85149' }} />
              <span className="vim-terminal-dot" style={{ background: '#f1e05a' }} />
              <span className="vim-terminal-dot" style={{ background: '#3fb950' }} />
              <span style={{ marginLeft: '8px', color: '#858585' }}>commit timeline</span>
            </div>
            <div className="vim-terminal-content" style={{ padding: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#569cd6', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                  $ git log --oneline -1
                </span>
              </div>
              <div
                className="vim-code"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                }}
              >
                <span style={{ color: '#6a9955', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                  A commit was made affecting:
                </span>
                <div style={{ marginTop: '8px' }}>
                  {commit.files.map((file, i) => (
                    <div key={i} style={{ color: '#ce9178', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                      <span style={{ color: '#569cd6' }}>M</span> {file}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        <h3
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
            color: '#d4d4d4',
            marginBottom: '16px',
          }}
        >
          When was this commit made?
        </h3>

        {/* Quarter options */}
        {commit && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {options.map((option, i) => {
              const isCorrect = option === commit.quarter;
              const isSelected = selected === option;
              let cls = '';
              if (revealed) {
                if (isCorrect) cls = 'vim-option-correct';
                else if (isSelected) cls = 'vim-option-wrong';
              } else if (isSelected) {
                cls = 'vim-option-selected';
              }

              return (
                <button
                  key={i}
                  className={`vim-option ${cls}`}
                  onClick={() => !revealed && handleAnswer(option)}
                  disabled={revealed}
                  style={{ textAlign: 'center', padding: '16px' }}
                >
                  <span
                    className="vim-option-letter"
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#858585',
                      marginBottom: '4px',
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span
                    className="vim-option-text"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    {formatMonthRange(option)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Result */}
        {revealed && commit && (
          <div className={`vim-result ${selected === commit.quarter ? 'vim-result-correct' : 'vim-result-wrong'}`}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
              {selected === commit.quarter ? (
                <p style={{ color: '#3fb950', marginBottom: '8px' }}>
                  ✓ Correct! The commit was made in {formatMonthRange(commit.quarter)}.
                </p>
              ) : (
                <>
                  <p style={{ color: '#f85149', marginBottom: '8px' }}>
                    ✗ Wrong. The commit was made in {formatMonthRange(commit.quarter)}.
                  </p>
                  <p style={{ color: '#6a9955' }}>
                    The actual date was {new Date(commit.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}.
                  </p>
                </>
              )}
            </div>
            <button className="vim-btn vim-btn-primary" onClick={nextRound} style={{ marginTop: '12px' }}>
              next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
