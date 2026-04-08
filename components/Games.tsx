'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import type { GitHubRoundData } from '@/lib/parser';
import { generateRoundQuestion } from '@/lib/parser';
import { FunctionAgeTimeline } from './FunctionAgeTimeline';
import WhatDoesThisDo from './games/WhatDoesThisDo';
import FindTheBug from './games/FindTheBug';
import SpotTheVuln from './games/SpotTheVuln';
import TraceTheCall from './games/TraceTheCall';
import TypeInference from './games/TypeInference';
import RefactorThis from './games/RefactorThis';
import ReadTheArchitecture from './games/ReadTheArchitecture';
import CommitTimeline from './games/CommitTimeline';
import CodeTimeline from './games/CodeTimeline';
import CommitAuthor from './games/CommitAuthor';
import LineAuthor from './games/LineAuthor';
import { getSessionTokens, resetSessionTokens } from '@/lib/ai/client';
import type { AIGameConfig } from '@/lib/types';

// Shared game type definitions — imported by Dashboard for the selector
export const GAME_TYPES = [
  { id: 'guess-file', label: '🔍 Guess the File', desc: 'Identify files by description', github: false },
  { id: 'what-does-this-do', label: '📖 What Does This Do', desc: 'Understand code from its snippet', github: false },
  { id: 'find-the-bug', label: '🔎 Find the Bug', desc: 'Spot the bug in real code', github: false },
  { id: 'spot-the-vuln', label: '🛡️ Spot the Vulnerability', desc: 'Find the security flaw', github: false },
  { id: 'dependency-path', label: '🔗 Trace the Call', desc: 'Follow the call chain', github: false },
  { id: 'type-inference', label: '💎 Type Inference', desc: 'Infer types from code', github: false },
  { id: 'refactor-this', label: '♻️ Refactor This', desc: 'Find the best refactor', github: false },
  { id: 'read-the-arch', label: '🏗️ Read the Architecture', desc: 'Understand project structure', github: false },
  { id: 'function-age', label: '📅 Commit Timeline', desc: 'When was this commit?', github: true },
  { id: 'code-author', label: '⏳ Code Timeline', desc: 'When was this code written?', github: false },
  { id: 'commit-message', label: '👤 Commit Author', desc: 'Who made this commit?', github: true },
  { id: 'line-author', label: '✍️ Line Author', desc: 'Who wrote this line?', github: true },
  { id: 'component-duel', label: '⚔️ Component Duel', desc: 'Match features to files', github: false },
  { id: 'complexity-race', label: '⚡ Complexity Race', desc: 'Rank files by size, fastest wins', github: false },
] as const;

export type GameTypeId = typeof GAME_TYPES[number]['id'];

interface GamesProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  gitHubData?: GitHubRoundData;
  soloGame: string | null;
  setSoloGame: (id: string | null) => void;
  aiConfig?: { apiKey: string };
}

// ── Score persistence ───────────────────────────────────────────

const STORAGE_KEY = 'unvibe-vim-game-score';

export type InfiniteScore = { totalPoints: number; roundsPlayed: number };

function defaultScore(): InfiniteScore {
  return { totalPoints: 0, roundsPlayed: 0 };
}

function loadScore(): InfiniteScore {
  if (typeof window === 'undefined') return defaultScore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScore();
    const parsed = JSON.parse(raw);
    return {
      totalPoints: Math.max(0, Math.floor(parsed.totalPoints ?? 0)),
      roundsPlayed: Math.max(0, Math.floor(parsed.roundsPlayed ?? 0)),
    };
  } catch {
    return defaultScore();
  }
}

function saveScore(score: InfiniteScore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
  } catch { /* ignore */ }
}

function clearScore(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// ── Seeded PRNG (same as parser) ───────────────────────────────

function randomUint32(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

function mulberry32(seed: number) {
  return function next(): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixSeed(...parts: number[]): number {
  let h = 0xdeadbeef;
  for (const p of parts) {
    h = Math.imul(h ^ p, 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h + Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

// ── Score calculation ───────────────────────────────────────────

function calcPoints(q: GameQuestion, answer: string, difficulty: 'easy' | 'medium' | 'hard'): number {
  if (q.type === 'function-age' || q.type === 'code-author') {
    // These are timeline games — handled separately with proximity scoring
    return 0;
  }
  if (q.type === 'complexity-race') {
    // complexity-race answer is order-dependent
    if (answer === q.answer) return 100;
    return 0;
  }
  if (answer === q.answer) return 100;
  return 0;
}

// ── Exposure tracking ───────────────────────────────────────────

const EXPOSURE_POWER = 2.45;

function itemWeight(id: string, exposure: Record<string, number>): number {
  const c = exposure[id] ?? 0;
  return 1 / Math.pow(1 + c, EXPOSURE_POWER);
}

function weightedPick<T extends { id: string }>(
  items: T[],
  weightOf: (item: T) => number,
  rand: () => number
): T | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0]!;
  let total = 0;
  const w: number[] = [];
  for (const t of items) {
    const wi = Math.max(weightOf(t), 1e-12);
    w.push(wi);
    total += wi;
  }
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= w[i]!;
    if (r < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

// ── Main Games Component ───────────────────────────────────────

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Difficulty = typeof DIFFICULTIES[number];

export default function Games({ files, metrics, gitHubData, soloGame, setSoloGame, aiConfig }: GamesProps) {
  const [gameType, setGameType] = useState<string>(soloGame ?? 'guess-file');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roundKey, setRoundKey] = useState(0);
  const [score, setScore] = useState<InfiniteScore>(defaultScore);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionSalt] = useState(() => randomUint32());
  const [roundSalt, setRoundSalt] = useState(() => randomUint32());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [complexityOrder, setComplexityOrder] = useState<string[]>([]);
  const [complexityStep, setComplexityStep] = useState(0);
  const [timelineGuess, setTimelineGuess] = useState<{ ms: number; pts: number } | null>(null);
  const [sessionTokens, setSessionTokens] = useState(0);

  const exposureRef = useRef<Record<string, number>>({});
  const exposureRefInitialized = useRef(false);

  // Load score and exposure from storage
  useEffect(() => {
    const saved = loadScore();
    setScore(saved);
    try {
      const expRaw = localStorage.getItem(STORAGE_KEY + '_exposure');
      if (expRaw) exposureRef.current = JSON.parse(expRaw);
    } catch { /* ignore */ }
    exposureRefInitialized.current = true;
    setHydrated(true);
  }, []);

  // Persist score
  useEffect(() => {
    if (hydrated) saveScore(score);
  }, [score, hydrated]);

  // Persist exposure
  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY + '_exposure', JSON.stringify(exposureRef.current));
      } catch { /* ignore */ }
    }
  }, [hydrated, recentIds]);

  // Reset on game type change
  useEffect(() => {
    setRoundKey(0);
    setRoundSalt(randomUint32());
    setRevealed(false);
    setSelected(null);
    setComplexityOrder([]);
    setComplexityStep(0);
    setTimelineGuess(null);
  }, [gameType]);

  // Async question generation — runs AFTER render, so browser can always paint
  const [currentQ, setCurrentQ] = useState<GameQuestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const genRef = useRef<{ roundKey: number; gameType: string } | null>(null);

  useEffect(() => {
    if (!hydrated || !files || files.length === 0) {
      setCurrentQ(null);
      return;
    }

    // Mark as generating immediately (will show skeleton)
    setIsGenerating(true);

    // Capture the generation params so we can compare after async work
    const params = { roundKey, gameType };
    genRef.current = params;

    // Defer to end of event loop — lets browser paint the loading state first
    Promise.resolve().then(() => {
      // If a newer generation is already queued, skip this one
      if (genRef.current !== params) return;

      // Do the expensive work
      const q = generateRoundQuestion(
        roundKey,
        gameType as 'guess-file' | 'function-age' | 'dependency-path' | 'component-duel' | 'complexity-race' | 'commit-message' | 'code-author',
        files,
        metrics,
        gitHubData,
        42,
        difficulty
      );

      // Only apply if params are still current
      if (genRef.current === params) {
        setCurrentQ(q);
        setIsGenerating(false);
      }
    });
  }, [roundKey, gameType, files, metrics, gitHubData, difficulty, hydrated]);

  const avgPts = score.roundsPlayed > 0 ? Math.round(score.totalPoints / score.roundsPlayed) : 0;

  const handleAnswer = useCallback((answer: string) => {
    if (!currentQ || revealed) return;
    setSelected(answer);

    if (currentQ.type === 'function-age' || currentQ.type === 'code-author') {
      // Timeline games — don't double-score; timelineGuess carries the points
      setRevealed(true);
      return;
    }

    const pts = calcPoints(currentQ, answer, difficulty);
    setScore(prev => ({
      totalPoints: prev.totalPoints + pts,
      roundsPlayed: prev.roundsPlayed + 1,
    }));
    exposureRef.current[currentQ.id] = (exposureRef.current[currentQ.id] ?? 0) + 1;
    setRecentIds(prev => [...prev, currentQ.id].slice(-20));
    setRevealed(true);
  }, [currentQ, revealed, difficulty]);

  const handleTimelineGuess = useCallback((guessMs: number, pts: number) => {
    if (!currentQ || revealed) return;
    setTimelineGuess({ ms: guessMs, pts });
    setScore(prev => ({
      totalPoints: prev.totalPoints + pts,
      roundsPlayed: prev.roundsPlayed + 1,
    }));
    exposureRef.current[currentQ.id] = (exposureRef.current[currentQ.id] ?? 0) + 1;
    setRecentIds(prev => [...prev, currentQ.id].slice(-20));
    setRevealed(true);
  }, [currentQ, revealed]);

  const nextRound = useCallback(() => {
    setRoundSalt(randomUint32());
    setRevealed(false);
    setSelected(null);
    setComplexityOrder([]);
    setComplexityStep(0);
    setTimelineGuess(null);
    setRoundKey(k => k + 1);
  }, []);

  const complexitySelect = useCallback((option: string) => {
    if (!currentQ || revealed || currentQ.type !== 'complexity-race') return;
    const newOrder = [...complexityOrder, option];
    setComplexityOrder(newOrder);
    setComplexityStep(newOrder.length);

    if (newOrder.length === 4) {
      // Completed — check answer
      const answerStr = newOrder.join('|');
      const pts = calcPoints(currentQ, answerStr, difficulty);
      setScore(prev => ({
        totalPoints: prev.totalPoints + pts,
        roundsPlayed: prev.roundsPlayed + 1,
      }));
      exposureRef.current[currentQ.id] = (exposureRef.current[currentQ.id] ?? 0) + 1;
      setRecentIds(prev => [...prev, currentQ.id].slice(-20));
      setRevealed(true);
    }
  }, [currentQ, revealed, complexityOrder, difficulty]);

  const resetProgress = useCallback(() => {
    if (!window.confirm('Reset all game progress? This will clear your score and exposure history.')) return;
    setScore(defaultScore());
    exposureRef.current = {};
    setRecentIds([]);
    clearScore();
  }, []);

  if (!hydrated || isGenerating || currentQ === null) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 0',
        fontFamily: "'JetBrains Mono', monospace",
        color: '#858585',
      }}>
        <div style={{
          width: '36px', height: '36px',
          border: '2px solid rgba(86,156,214,0.2)',
          borderTopColor: '#569cd6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ fontSize: '13px' }}>Loading games...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="vim-theme" style={{ padding: '0' }}>
      {/* Terminal wrapper */}
      <div className="vim-terminal" style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Title bar */}
        <div className="vim-titlebar">
          <span className="vim-titlebar-dot" style={{ background: '#f14c4c' }} />
          <span className="vim-titlebar-dot" style={{ background: '#fbbf24' }} />
          <span className="vim-titlebar-dot" style={{ background: '#22c55e' }} />
          <span className="vim-titlebar-title">unvibe.games — vim</span>
        </div>

        <div className="vim-content">
          {/* Score echo */}
          <div className="vim-echo">
            <div className="vim-echo-line">:echo $score</div>
            <div>
              <span style={{ color: '#dcdcaa' }}>Total:</span>{' '}
              <span style={{ color: '#569cd6' }}>{score.totalPoints.toLocaleString()}</span>
              {' pts · '}
              <span style={{ color: '#b5cea8' }}>{score.roundsPlayed}</span>
              {' rounds · avg '}
              <span style={{ color: '#ce9178' }}>{avgPts}</span>
              {' pts/round'}
            </div>
          </div>

          {/* Game type selector :set game=TYPE */}
          <div className="vim-set-selector">
            <span className="vim-set-label">:set game=</span>
            {GAME_TYPES.map(gt => (
              <span
                key={gt.id}
                className="vim-set-value"
                onClick={() => { setGameType(gt.id); setSoloGame(gt.id === soloGame ? null : gt.id); }}
                style={{
                  background: gameType === gt.id ? 'rgba(86,156,214,0.15)' : undefined,
                  borderColor: gameType === gt.id ? '#569cd6' : undefined,
                  color: gameType === gt.id ? '#569cd6' : undefined,
                }}
              >
                {gt.id}
              </span>
            ))}
          </div>

          {/* Difficulty selector */}
          <div className="vim-set-selector">
            <span className="vim-set-label">:set difficulty=</span>
            {DIFFICULTIES.map(d => (
              <span
                key={d}
                className="vim-set-value"
                onClick={() => setDifficulty(d)}
                style={{
                  background: difficulty === d ? 'rgba(86,156,214,0.15)' : undefined,
                  borderColor: difficulty === d ? '#569cd6' : undefined,
                  color: difficulty === d ? '#569cd6' : undefined,
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Round key display */}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6a9955', marginBottom: '16px' }}>
            Round {roundKey + 1} · seed:{roundKey * 31_127 + gameType.length * 7_193}
          </div>

          {/* New AI Solo Games (G1, G2, G4) — rendered independently */}
          {gameType === 'what-does-this-do' && (
            <WhatDoesThisDo
              files={files}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}
          {gameType === 'find-the-bug' && (
            <FindTheBug
              files={files}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}
          {gameType === 'spot-the-vuln' && (
            <SpotTheVuln
              files={files}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}

          {/* G8: Commit Timeline — GitHub required */}
          {gameType === 'function-age' && gitHubData && (
            <CommitTimeline
              gitHubData={gitHubData}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}

          {/* G10: Commit Author — GitHub required */}
          {gameType === 'commit-message' && gitHubData && (
            <CommitAuthor
              gitHubData={gitHubData}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}

          {/* G9: Code Timeline — no GitHub needed */}
          {gameType === 'code-author' && (
            <CodeTimeline
              files={files}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}

          {/* G11: Line Author — GitHub preferred, fallback without it */}
          {gameType === 'line-author' && (
            <LineAuthor
              files={files}
              gitHubData={gitHubData}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}

          {/* New AI Solo Games (G3, G5, G6, G7) — rendered independently */}
          {gameType === 'dependency-path' && (
            <TraceTheCall
              files={files}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}
          {gameType === 'type-inference' && (
            <TypeInference
              files={files}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}
          {gameType === 'refactor-this' && (
            <RefactorThis
              files={files}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}
          {gameType === 'read-the-arch' && (
            <ReadTheArchitecture
              files={files}
              metrics={metrics}
              apiKey={aiConfig?.apiKey}
              sessionTokens={sessionTokens}
              onSessionTokensChange={setSessionTokens}
            />
          )}

          {/* GitHub games show "GitHub data required" when no gitHubData */}
          {(gameType === 'function-age' || gameType === 'commit-message' || gameType === 'line-author') && !gitHubData && (
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
          )}

          {/* Legacy games — only show when NOT an AI game type */}
          {/* Legacy games — only show when NOT an AI game type */}
          {!['what-does-this-do', 'find-the-bug', 'spot-the-vuln', 'dependency-path', 'type-inference', 'refactor-this', 'read-the-arch', 'function-age', 'code-author', 'commit-message', 'line-author'].includes(gameType) && !currentQ && (
            <div className="vim-empty">
              <div className="vim-empty-title">No question available</div>
              <p>Not enough data in this codebase for the selected game type.</p>
            </div>
          )}

          {!['what-does-this-do', 'find-the-bug', 'spot-the-vuln', 'dependency-path', 'type-inference', 'refactor-this', 'read-the-arch', 'function-age', 'code-author', 'commit-message', 'line-author'].includes(gameType) && currentQ && (
            <div className="vim-card" style={{ marginBottom: '20px' }}>
              <div className="vim-card-header">
                <span>{currentQ.type}</span>
                <span className={`vim-difficulty vim-difficulty-${currentQ.difficulty}`}>
                  {currentQ.difficulty}
                </span>
              </div>

              <div style={{ padding: '20px' }}>
                <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#d4d4d4', marginBottom: '20px', lineHeight: 1.6, fontWeight: 400 }}>
                  {currentQ.question}
                </h3>

                {currentQ.codeSnippet && (
                  <div className="vim-code" style={{ marginBottom: '20px' }}>
                    <div className="vim-code-header">
                      <span>// code snippet</span>
                      <span style={{ color: '#569cd6' }}>{currentQ.type}</span>
                    </div>
                    <div className="vim-code-content">
                      <code>{currentQ.codeSnippet}</code>
                    </div>
                  </div>
                )}

                {(currentQ.type === 'function-age' || currentQ.type === 'code-author') && currentQ.sparklineData && currentQ.dateRange && currentQ.proximateAnswer && (
                  <FunctionAgeTimeline question={currentQ} revealed={revealed} onGuess={handleTimelineGuess} />
                )}

                {currentQ.type !== 'complexity-race' && currentQ.type !== 'function-age' && currentQ.type !== 'code-author' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {currentQ.options.map((option, i) => {
                      const isSelected = selected === option;
                      const isCorrect = option === currentQ.answer;
                      let cls = '';
                      if (revealed) {
                        if (isCorrect) cls = 'vim-option-correct';
                        else if (isSelected) cls = 'vim-option-wrong';
                      } else if (isSelected) cls = 'vim-option-selected';
                      return (
                        <button key={i} className={`vim-option ${cls}`} onClick={() => !revealed && handleAnswer(option)} disabled={revealed}>
                          <span className="vim-option-letter">
                            {revealed ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                          </span>
                          <span className="vim-option-text">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQ.type === 'complexity-race' && (
                  <div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6a9955', marginBottom: '12px' }}>
                      {complexityStep === 0 ? '// Click files in order from LARGEST to SMALLEST' : `// Selected: ${complexityStep}/4`}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {currentQ.options.map((option, i) => {
                        const isChosen = complexityOrder.includes(option);
                        const isNext = !isChosen && complexityStep < 4;
                        return (
                          <button key={i} className={`vim-option ${isChosen ? 'vim-option-selected' : ''}`} onClick={() => isNext && !revealed && complexitySelect(option)} disabled={isChosen || revealed} style={{ opacity: isChosen ? 0.5 : 1 }}>
                            <span className="vim-option-letter">
                              {isChosen ? `${complexityOrder.indexOf(option) + 1}` : String.fromCharCode(65 + i)}
                            </span>
                            <span className="vim-option-text">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(currentQ.type === 'function-age' || currentQ.type === 'code-author') && !currentQ.sparklineData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {currentQ.options.map((option, i) => {
                      const isSelected = selected === option;
                      const isCorrect = option === currentQ.answer;
                      let cls = '';
                      if (revealed) {
                        if (isCorrect) cls = 'vim-option-correct';
                        else if (isSelected) cls = 'vim-option-wrong';
                      } else if (isSelected) cls = 'vim-option-selected';
                      return (
                        <button key={i} className={`vim-option ${cls}`} onClick={() => !revealed && handleAnswer(option)} disabled={revealed}>
                          <span className="vim-option-letter">
                            {revealed ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                          </span>
                          <span className="vim-option-text">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {revealed && (
                  <div className={`vim-result ${selected === currentQ.answer || (timelineGuess && timelineGuess.pts > 0) ? 'vim-result-correct' : selected ? 'vim-result-wrong' : ''}`}>
                    {(currentQ.type === 'function-age' || currentQ.type === 'code-author') ? (
                      timelineGuess ? (
                        <div>
                          <div className="vim-result-points">+{timelineGuess.pts.toLocaleString()} pts</div>
                          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6a9955', marginTop: '8px' }}>{currentQ.explanation}</p>
                        </div>
                      ) : <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#d4d4d4' }}>{currentQ.explanation}</p>
                    ) : (
                      <div>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: selected === currentQ.answer ? '#22c55e' : '#f14c4c', fontWeight: 700, marginBottom: '8px' }}>
                          {selected === currentQ.answer ? '✓ Correct!' : '✗ Wrong'}
                        </p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6a9955' }}>{currentQ.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {revealed && (
                  <div className="vim-next">
                    <button className="vim-btn vim-btn-primary" onClick={nextRound}>next</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reset button */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="vim-btn" onClick={resetProgress}>
              :reset
            </button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6a9955' }}>
              // score and exposure auto-saved in this browser
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
